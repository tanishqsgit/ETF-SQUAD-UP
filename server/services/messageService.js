import { Op } from 'sequelize';
import { Message, SquadMember, User } from '../models/index.js';
import { fail } from '../middleware/index.js';
import { moderateMessage } from './aiService.js';
import { verifyOwnedImage } from './storageService.js';
export const dmRoom = (a, b) => `dm:${[a, b].sort().join('_')}`;
export const roomFor = (user, data) =>
  data.squadId ? `squad:${data.squadId}` : dmRoom(user.id, data.receiverId);
export async function authorizeDestination(user, data) {
  if (data.squadId) {
    if (!(await SquadMember.findOne({ where: { squadId: data.squadId, userId: user.id } })))
      fail(403, 'You are not a member of this squad.');
  } else {
    if (data.receiverId === user.id) fail(400, 'Choose another player.');
    if (!(await User.findByPk(data.receiverId))) fail(404, 'Player not found.');
  }
}
export async function saveMessage(user, data) {
  await authorizeDestination(user, data);
  if (data.messageType === 'image') {
    if (data.imageUrl?.startsWith('local://')) await verifyOwnedImage(user, data.imageUrl);
    else {
      const bucket = process.env.S3_BUCKET,
        region = process.env.AWS_REGION || 'ap-south-1';
      if (
        !bucket ||
        !data.imageUrl.startsWith(`https://${bucket}.s3.${region}.amazonaws.com/chat/${user.id}/`)
      )
        fail(400, 'Upload the image using the supported image uploader.');
    }
  }
  if (!(await moderateMessage(data.content)))
    fail(422, 'This message was blocked. Keep comms respectful.');
  const message = await Message.create({ ...data, senderId: user.id });
  return Message.findByPk(message.id, { include: [{ model: User, as: 'sender' }] });
}
export async function messageHistory(user, data, before) {
  await authorizeDestination(user, data);
  const where = data.squadId
    ? { squadId: data.squadId }
    : {
        [Op.or]: [
          { senderId: user.id, receiverId: data.receiverId },
          { senderId: data.receiverId, receiverId: user.id },
        ],
      };
  if (before) where.createdAt = { [Op.lt]: before };
  const messages = await Message.findAll({
    where,
    include: [{ model: User, as: 'sender' }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: 50,
  });
  await Message.update(
    { isRead: true },
    {
      where: {
        ...where,
        ...(data.squadId ? { senderId: { [Op.ne]: user.id } } : { receiverId: user.id }),
      },
    },
  );
  return messages.reverse();
}
export async function markRead(user, data) {
  await authorizeDestination(user, data);
  const where = data.squadId
    ? { squadId: data.squadId, senderId: { [Op.ne]: user.id }, isRead: false }
    : { senderId: data.receiverId, receiverId: user.id, isRead: false };
  const [count] = await Message.update({ isRead: true }, { where });
  return count;
}
