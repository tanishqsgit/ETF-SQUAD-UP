import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { sequelize, User, Squad, SquadMember } from '../models/index.js';
import { players } from '../../src/data.js';
import { validateConfig } from '../config.js';
validateConfig();
if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production.');
if (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 12)
  throw new Error('Set SEED_PASSWORD to a local development password of at least 12 characters.');
try {
  await sequelize.transaction(async (transaction) => {
    const hash = await bcrypt.hash(process.env.SEED_PASSWORD, 10);
    const users = [];
    for (const [i, player] of players.entries()) {
      const { id, color, location, ...profile } = player;
      const [user] = await User.findOrCreate({
        where: { playerId: player.playerId },
        defaults: {
          ...profile,
          phone: `+9198765432${String(i).padStart(2, '0')}`,
          passwordHash: hash,
          status: 'offline',
          isVerified: false,
        },
        transaction,
      });
      users.push(user);
    }
    const [squad, created] = await Squad.findOrCreate({
      where: { name: 'Team Phoenix' },
      defaults: {
        squadId: 'PHOENIX#101',
        game: 'Free Fire',
        description: 'Local development squad',
        leaderId: users[0].id,
        lookingForRole: 'sniper',
      },
      transaction,
    });
    if (created)
      for (const user of [users[0], users[2], users[4]])
        await SquadMember.create(
          { squadId: squad.id, userId: user.id, role: user.role },
          { transaction },
        );
  });
  console.log(
    'Development players and squad seeded. Phone numbers: +919876543200 through +919876543205.',
  );
} finally {
  await sequelize.close();
}
