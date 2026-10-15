import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { User, SquadMember } from '../models/index.js';
import { uuid, messageInput } from '../validation.js';
import {
  authorizeDestination,
  roomFor,
  saveMessage,
  markRead,
} from '../services/messageService.js';
import { serializeRoom } from '../services/serialization.js';
export function chatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth.token, config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'squadup',
        audience: 'squadup-client',
      });
      socket.user = await User.findByPk(payload.sub);
      socket.expiresAt = payload.exp * 1000;
      if (!socket.user) throw new Error();
      socket.memberships = await SquadMember.findAll({ where: { userId: socket.user.id } });
      next();
    } catch {
      next(new Error('Authentication required.'));
    }
  });
  io.on('connection', async (socket) => {
    const user = socket.user;
    socket.join(`user:${user.id}`);
    const memberships = socket.memberships;
    for (const member of memberships) socket.join(`squad:${member.squadId}`);
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.expiresAt - Date.now()),
    );
    let requests = 0;
    const interval = setInterval(() => {
      requests = 0;
    }, 10000);
    const presence = async (status) => {
      await user.update({ status, lastSeen: new Date() });
      const mates = await SquadMember.findAll({ where: { userId: user.id } });
      for (const mate of mates)
        io.to(`squad:${mate.squadId}`).emit('presence', { userId: user.id, status });
      io.to(`presence:${user.id}`).emit('presence', { userId: user.id, status });
    };
    const handler = (fn) => async (data, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        if (++requests > 40) throw new Error('Slow down. Too many events.');
        if (Date.now() >= socket.expiresAt) throw new Error('Session expired.');
        await fn(data, reply);
      } catch (error) {
        reply({
          success: false,
          error:
            error.status || error.name === 'ZodError'
              ? error.message
              : 'Unable to complete this action.',
        });
      }
    };
    socket.on(
      'join_room',
      handler(async (data, ack) => {
        const destination = z
          .object({ receiverId: uuid.optional(), squadId: uuid.optional() })
          .strict()
          .refine((d) => Boolean(d.receiverId) !== Boolean(d.squadId))
          .parse(data);
        await authorizeDestination(user, destination);
        const room = roomFor(user, destination);
        await socket.join(room);
        if (destination.receiverId) await socket.join(`presence:${destination.receiverId}`);
        ack({ success: true, room });
      }),
    );
    socket.on(
      'leave_room',
      handler(async (data, ack) => {
        const destination = z
          .object({ receiverId: uuid.optional(), squadId: uuid.optional() })
          .parse(data);
        if (destination.receiverId || destination.squadId)
          await socket.leave(roomFor(user, destination));
        ack({ success: true });
      }),
    );
    socket.on(
      'send_message',
      handler(async (data, ack) => {
        const input = messageInput.parse(data);
        await authorizeDestination(user, input);
        const room = roomFor(user, input);
        const message = await serializeRoom(room, () => saveMessage(user, input));
        io.to(room).emit('message', message);
        if (input.receiverId)
          io.to(`user:${input.receiverId}`).except(room).emit('message_notification', message);
        ack({ success: true, message });
      }),
    );
    socket.on(
      'typing',
      handler(async (data, ack) => {
        const input = z
          .object({ receiverId: uuid.optional(), squadId: uuid.optional(), isTyping: z.boolean() })
          .strict()
          .refine((d) => Boolean(d.receiverId) !== Boolean(d.squadId))
          .parse(data);
        await authorizeDestination(user, input);
        socket.to(roomFor(user, input)).emit('typing', {
          userId: user.id,
          squadId: input.squadId,
          isTyping: input.isTyping,
          displayName: user.displayName,
        });
        ack({ success: true });
      }),
    );
    socket.on(
      'read_messages',
      handler(async (data, ack) => {
        const input = z
          .object({ receiverId: uuid.optional(), squadId: uuid.optional() })
          .strict()
          .refine((d) => Boolean(d.receiverId) !== Boolean(d.squadId))
          .parse(data);
        const at = new Date().toISOString();
        const count = await markRead(user, input);
        io.to(roomFor(user, input)).emit('read_receipt', {
          readerId: user.id,
          squadId: input.squadId,
          at,
        });
        ack({ success: true, count });
      }),
    );
    socket.on(
      'update_status',
      handler(async (data, ack) => {
        const status = z.enum(['online', 'offline', 'in_game']).parse(data.status);
        await presence(status);
        ack({ success: true });
      }),
    );
    socket.on('disconnect', async () => {
      clearInterval(interval);
      clearTimeout(expiry);
      try {
        const remaining = await io.in(`user:${user.id}`).fetchSockets();
        if (!remaining.length) await presence('offline');
      } catch {
        console.error('Presence update failed');
      }
    });
    presence('online').catch(() => socket.disconnect(true));
  });
}
