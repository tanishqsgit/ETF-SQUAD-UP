import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
if (!process.env.TEST_DATABASE_URL)
  throw new Error('Set TEST_DATABASE_URL to a dedicated, migrated test database.');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { sequelize, User, Squad, SquadMember, Message } = await import('../models/index.js');
const { addMember } = await import('../services/squadService.js');
const { authorizeDestination } = await import('../services/messageService.js');
test('PostgreSQL enforces capacity, uniqueness, destination constraints, and chat access', async () => {
  const transaction = await sequelize.transaction();
  try {
    const users = [];
    for (let i = 0; i < 6; i++)
      users.push(
        await User.create(
          {
            displayName: `Test player ${i}`,
            playerId: `TEST#${crypto.randomUUID()}`,
            phone: `+91${crypto.randomUUID()}`,
            passwordHash: 'test-only',
            games: ['Free Fire'],
            role: 'rusher',
            rank: 'Heroic',
            playingTime: ['night'],
            age: 20,
            device: 'android',
          },
          { transaction },
        ),
      );
    const squad = await Squad.create(
      { name: crypto.randomUUID(), squadId: crypto.randomUUID(), leaderId: users[0].id },
      { transaction },
    );
    for (const user of users.slice(0, 5)) await addMember(squad.id, user, transaction);
    await assert.rejects(() => addMember(squad.id, users[5], transaction), /full/);
    await assert.rejects(() => addMember(squad.id, users[0], transaction), /already/);
    // Savepoints let the suite continue after intentional PostgreSQL constraint errors.
    await assert.rejects(
      () =>
        sequelize.transaction({ transaction }, (nested) =>
          SquadMember.create(
            { squadId: squad.id, userId: users[5].id, role: 'sniper' },
            { transaction: nested },
          ),
        ),
      /maximum five/,
    );
    await assert.rejects(
      () =>
        sequelize.transaction({ transaction }, (nested) =>
          Message.create(
            { senderId: users[0].id, content: 'No destination' },
            { transaction: nested },
          ),
        ),
      /message_exactly_one_destination/,
    );
    // An unknown squad cannot be accessed by an outsider (no committed membership is visible).
    await assert.rejects(
      () => authorizeDestination(users[5], { squadId: crypto.randomUUID() }),
      /not a member/,
    );
  } finally {
    await transaction.rollback();
    await sequelize.close();
  }
});
