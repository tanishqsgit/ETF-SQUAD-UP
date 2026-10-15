import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth, useChat, useSquad } from './stores';
import { api, demo, connectSocket } from './lib/api';
export function Notifications() {
  const token = useAuth((s) => s.token),
    user = useAuth((s) => s.user),
    location = useLocation();
  useEffect(() => {
    const active = location.pathname.startsWith('/chat/') ? location.pathname.split('/')[2] : null;
    useChat.setState({ activeRoom: active });
    if (active) useChat.getState().markRead(active);
  }, [location.pathname]);
  useEffect(() => {
    if (demo || !token || !user) return;
    api
      .get('/conversations')
      .then(({ data }) =>
        useChat.setState({
          unread: Object.fromEntries(data.conversations.map((c) => [c.user.id, c.unread])),
        }),
      )
      .catch(() => {});
    const socket = connectSocket(token);
    const receive = (message) => {
      if (message.senderId === user.id) return;
      const room = message.squadId ? `squad-${message.squadId}` : message.senderId;
      const state = useChat.getState();
      state.addMessage(room, message);
      state.addConnection(room);
      if (state.activeRoom !== room) {
        state.incrementUnread(room);
        toast(
          `${message.sender?.displayName || 'Teammate'}: ${message.messageType === 'image' ? 'Shared a screenshot' : message.content.slice(0, 60)}`,
          { icon: '💬' },
        );
      }
    };
    socket.on('message_notification', receive);
    socket.on('message', receive);
    socket.on('inbox_updated', () => {
      window.dispatchEvent(new Event('squadup-inbox'));
      api
        .get('/squads')
        .then(({ data }) => useSquad.getState().setSquads(data.squads))
        .catch(() => {});
    });
    return () => socket.disconnect();
  }, [token, user?.id]);
  return null;
}
