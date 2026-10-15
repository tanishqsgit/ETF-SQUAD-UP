import { sequelize, Squad, SquadMember } from '../models/index.js';
import { fail } from '../middleware/index.js';
export async function addMember(squadId, user, transaction, allowClosed = false) {
  const squad = await Squad.findByPk(squadId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!squad) fail(404, 'Squad not found.');
  if (!squad.isOpen && !allowClosed) fail(403, 'This squad is invite only.');
  if (await SquadMember.findOne({ where: { squadId, userId: user.id }, transaction }))
    fail(409, 'You are already in this squad.');
  if ((await SquadMember.count({ where: { squadId }, transaction })) >= 5)
    fail(409, 'This squad is full.');
  await SquadMember.create({ squadId, userId: user.id, role: user.role }, { transaction });
  return squad;
}
export const joinSquad = (id, user) =>
  sequelize.transaction((transaction) => addMember(id, user, transaction));
