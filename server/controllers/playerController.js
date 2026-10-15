import { Op } from 'sequelize';
import { z } from 'zod';
import { User, publicUser, roles, slots } from '../models/index.js';
import { compatibility } from '../services/matchingService.js';
import { fail } from '../middleware/index.js';
export const searchInput = z
  .object({
    q: z.string().max(80).optional(),
    role: z.enum(roles).optional(),
    rank: z.string().max(30).optional(),
    time: z.enum(slots).optional(),
    device: z.enum(['android', 'ios']).optional(),
    game: z.enum(['Free Fire', 'BGMI', 'CODM']).optional(),
    online: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .strict();
export async function search(req, res) {
  const { q, role, rank, time, device, game, online, page } = req.validated;
  const where = { id: { [Op.ne]: req.user.id } };
  if (q) {
    const escaped = q.replace(/[\\%_]/g, '\\$&');
    where[Op.or] = [
      { displayName: { [Op.iLike]: `%${escaped}%` } },
      { playerId: { [Op.iLike]: `%${escaped}%` } },
    ];
  }
  if (role) where.role = role;
  if (rank) where.rank = rank;
  if (time) where.playingTime = { [Op.contains]: [time] };
  if (device) where.device = device;
  if (game) where.games = { [Op.contains]: [game] };
  if (online === 'true') where.status = 'online';
  const { rows, count } = await User.findAndCountAll({
    where,
    limit: 30,
    offset: (page - 1) * 30,
    order: [['lastSeen', 'DESC']],
  });
  res.json({
    success: true,
    total: count,
    page,
    players: rows
      .map((user) => ({ ...publicUser(user), compatibility: compatibility(req.user, user) }))
      .sort((a, b) => b.compatibility.score - a.compatibility.score),
  });
}
export async function get(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) fail(404, 'Player not found.');
  res.json({ success: true, user: publicUser(user) });
}
export async function update(req, res) {
  await req.user.update(req.validated);
  res.json({ success: true, user: publicUser(req.user) });
}
