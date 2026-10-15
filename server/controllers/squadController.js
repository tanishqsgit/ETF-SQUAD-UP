import crypto from 'node:crypto';
import {
  sequelize,
  Squad,
  SquadMember,
  SquadInvite,
  SquadJoinRequest,
  User,
  serializeSquad,
} from '../models/index.js';
import { fail } from '../middleware/index.js';
import { addMember, joinSquad } from '../services/squadService.js';
const roster = [{ model: SquadMember, as: 'roster', include: [{ model: User, as: 'user' }] }];
const notify = (req, ids) => {
  for (const id of new Set(ids.filter(Boolean)))
    req.app.get('io')?.to(`user:${id}`).emit('inbox_updated');
};
export async function list(req, res) {
  const squads = await Squad.findAll({
    include: roster,
    limit: 50,
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, squads: squads.map(serializeSquad) });
}
export async function get(req, res) {
  const squad = await Squad.findByPk(req.params.id, { include: roster });
  if (!squad) fail(404, 'Squad not found.');
  res.json({ success: true, squad: serializeSquad(squad) });
}
export async function create(req, res) {
  const squad = await sequelize.transaction(async (transaction) => {
    const name = req.validated.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 5)
      .toUpperCase();
    const squad = await Squad.create(
      {
        ...req.validated,
        squadId: `${name}#${crypto.randomInt(100, 1000)}`,
        leaderId: req.user.id,
      },
      { transaction },
    );
    await SquadMember.create(
      { squadId: squad.id, userId: req.user.id, role: req.user.role },
      { transaction },
    );
    return squad;
  });
  res.status(201).json({
    success: true,
    squad: serializeSquad(await Squad.findByPk(squad.id, { include: roster })),
  });
}
export async function join(req, res) {
  const request = await sequelize.transaction(async (transaction) => {
    const squad = await Squad.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!squad) fail(404, 'Squad not found.');
    if (!squad.isOpen) fail(403, 'This squad is invite only.');
    if (
      await SquadMember.findOne({ where: { squadId: squad.id, userId: req.user.id }, transaction })
    )
      fail(409, 'You are already in this squad.');
    if ((await SquadMember.count({ where: { squadId: squad.id }, transaction })) >= 5)
      fail(409, 'This squad is full.');
    const [request, created] = await SquadJoinRequest.findOrCreate({
      where: { squadId: squad.id, userId: req.user.id },
      transaction,
    });
    if (!created && request.status === 'pending') fail(409, 'Your request is already pending.');
    if (!created) await request.update({ status: 'pending' }, { transaction });
    return request;
  });
  res
    .status(201)
    .json({ success: true, request, message: 'Join request sent to the squad leader.' });
  notify(req, [(await Squad.findByPk(request.squadId))?.leaderId]);
}
export async function decideRequest(req, res) {
  const reviewed = await sequelize.transaction(async (transaction) => {
    const request = await SquadJoinRequest.findByPk(req.params.id, {
      transaction,
    });
    if (!request) fail(404, 'Request not found.');
    const squad = await Squad.findByPk(request.squadId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!squad) fail(404, 'Squad not found.');
    await request.reload({ transaction, lock: transaction.LOCK.UPDATE });
    if (squad.leaderId !== req.user.id) fail(403, 'Only the squad leader can review requests.');
    if (request.status !== 'pending') fail(409, 'This request has already been reviewed.');
    if (req.validated.status === 'accepted') {
      const applicant = await User.findByPk(request.userId, { transaction });
      await addMember(squad.id, applicant, transaction, true);
    }
    await request.update({ status: req.validated.status }, { transaction });
    return request;
  });
  if (reviewed.status === 'accepted')
    await req.app.get('io')?.in(`user:${reviewed.userId}`).socketsJoin(`squad:${reviewed.squadId}`);
  notify(req, [reviewed.userId, req.user.id]);
  res.json({ success: true });
}
export async function inbox(req, res) {
  const squads = await Squad.findAll({ where: { leaderId: req.user.id }, attributes: ['id'] });
  const { Op } = await import('sequelize');
  const invitations = await SquadInvite.findAll({
    where: { inviteeId: req.user.id, status: 'pending', expiresAt: { [Op.gt]: new Date() } },
    include: [{ model: Squad, as: 'squad' }],
    order: [['createdAt', 'DESC']],
    limit: 30,
  });
  const requests = await SquadJoinRequest.findAll({
    where: { squadId: squads.map((s) => s.id), status: 'pending' },
    include: [
      { model: Squad, as: 'squad' },
      { model: User, as: 'user' },
    ],
    order: [['createdAt', 'DESC']],
    limit: 30,
  });
  const applications = await SquadJoinRequest.findAll({
    where: { userId: req.user.id },
    include: [{ model: Squad, as: 'squad' }],
    order: [['updatedAt', 'DESC']],
    limit: 20,
  });
  res.json({ success: true, invitations, requests, applications });
}
export async function rejectInvite(req, res) {
  const invite = await SquadInvite.findByPk(req.params.id);
  if (!invite) fail(404, 'Invitation not found.');
  if (invite.inviteeId !== req.user.id) fail(403, 'This invitation belongs to another player.');
  const [changed] = await SquadInvite.update(
    { status: 'rejected' },
    { where: { id: invite.id, status: 'pending' } },
  );
  if (!changed) fail(409, 'This invitation has already been reviewed.');
  notify(req, [req.user.id, invite.inviterId]);
  res.json({ success: true });
}
export async function invite(req, res) {
  const squad = await Squad.findByPk(req.params.id);
  if (!squad) fail(404, 'Squad not found.');
  if (squad.leaderId !== req.user.id) fail(403, 'Only the squad leader can invite players.');
  let inviteeId = null;
  if (req.validated.playerId) {
    const player = await User.findOne({
      where: { playerId: req.validated.playerId.toUpperCase() },
    });
    if (!player) fail(404, 'Player ID not found.');
    inviteeId = player.id;
  }
  const invite = await SquadInvite.create({
    squadId: squad.id,
    inviterId: req.user.id,
    inviteeId,
    inviteCode: crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase(),
  });
  notify(req, [inviteeId]);
  res.status(201).json({
    success: true,
    invite,
    url: `${process.env.CLIENT_ORIGIN}/invite/${invite.inviteCode}`,
  });
}
export async function accept(req, res) {
  const accepted = await sequelize.transaction(async (transaction) => {
    const invite = await SquadInvite.findOne({
      where: { inviteCode: req.params.code },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!invite || invite.status !== 'pending') fail(404, 'Invite is unavailable.');
    if (invite.expiresAt < new Date()) fail(410, 'This invitation has expired.');
    if (invite.inviteeId && invite.inviteeId !== req.user.id)
      fail(403, 'This invitation belongs to another player.');
    await addMember(invite.squadId, req.user, transaction, true);
    await invite.update({ status: 'accepted' }, { transaction });
    return invite;
  });
  await req.app.get('io')?.in(`user:${req.user.id}`).socketsJoin(`squad:${accepted.squadId}`);
  notify(req, [req.user.id, accepted.inviterId]);
  res.json({ success: true });
}
