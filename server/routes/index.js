import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as authController from '../controllers/authController.js';
import * as players from '../controllers/playerController.js';
import * as squads from '../controllers/squadController.js';
import { auth, validate, wrap, fail, session } from '../middleware/index.js';
import { register, login, profile, squadInput, uuid, phone } from '../validation.js';
import { generateBio, analyzeSquad } from '../services/aiService.js';
import { SquadMember, User, Message } from '../models/index.js';
import { Op } from 'sequelize';
import { messageHistory } from '../services/messageService.js';
import crypto from 'node:crypto';
import multer from 'multer';
import { localStorage, storeImage, readImage } from '../services/storageService.js';
import { hasAI } from '../services/aiService.js';
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
});
const uploadLimit = rateLimit({
  windowMs: 60000,
  limit: 8,
  keyGenerator: (req) => req.user.id,
  message: { success: false, error: 'Upload limit reached. Try again shortly.' },
});
router.get('/capabilities', (req, res) =>
  res.json({
    success: true,
    bioSource: hasAI ? 'openai' : 'template',
    storage: localStorage() ? 'local' : 's3',
    otp:
      process.env.FREE_MODE !== 'true' &&
      Boolean(
        process.env.REDIS_URL && process.env.OTP_PROVIDER_URL && process.env.OTP_PROVIDER_TOKEN,
      ),
  }),
);
const authLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Try again in 15 minutes.' },
});
const aiLimit = rateLimit({
  windowMs: 60000,
  limit: 8,
  keyGenerator: (req) => req.user.id,
  message: { success: false, error: 'AI limit reached. Try again shortly.' },
});
router.post('/auth/register', authLimit, validate(register), wrap(authController.register));
router.post('/auth/login', authLimit, validate(login), wrap(authController.login));
router.post(
  '/auth/otp/request',
  authLimit,
  validate(z.object({ phone }).strict()),
  wrap(authController.requestOtp),
);
router.post(
  '/auth/otp/verify',
  authLimit,
  validate(z.object({ phone, code: z.string().regex(/^\d{6}$/) }).strict()),
  wrap(authController.verifyOtp),
);
router.get('/auth/me', auth, (req, res) =>
  res.json({ success: true, user: req.user, token: session(res, req.user) }),
);
router.post('/auth/logout', (req, res) => {
  res.clearCookie('squadup_session', { path: '/api' });
  res.json({ success: true });
});
router.use(auth);
router.param('id', (req, res, next, id) => {
  if (!uuid.safeParse(id).success)
    return res.status(400).json({ success: false, error: 'Invalid ID.' });
  next();
});
router.get('/players', validate(players.searchInput, 'query'), wrap(players.search));
router.patch('/players/me', validate(profile.partial()), wrap(players.update));
router.get('/players/:id', wrap(players.get));
router.get('/squads', wrap(squads.list));
router.get('/notifications', wrap(squads.inbox));
router.patch(
  '/join-requests/:id',
  validate(z.object({ status: z.enum(['accepted', 'rejected']) }).strict()),
  wrap(squads.decideRequest),
);
router.post('/invites/:id/reject', wrap(squads.rejectInvite));
router.post('/squads', validate(squadInput), wrap(squads.create));
router.get('/squads/:id', wrap(squads.get));
router.post('/squads/:id/join', wrap(squads.join));
router.post(
  '/squads/:id/invites',
  validate(
    z
      .object({
        playerId: z
          .string()
          .regex(/^[A-Z0-9]+#\d{4}$/i)
          .optional(),
      })
      .strict(),
  ),
  wrap(squads.invite),
);
router.post(
  '/invites/:code/accept',
  (req, res, next) =>
    /^[A-Z0-9]{6}$/.test(req.params.code)
      ? next()
      : res.status(400).json({ success: false, error: 'Invalid invite code.' }),
  wrap(squads.accept),
);
router.post(
  '/ai/bio',
  aiLimit,
  validate(profile.partial()),
  wrap(async (req, res) =>
    res.json({
      success: true,
      bio: await generateBio(req.validated),
      source: hasAI ? 'openai' : 'template',
    }),
  ),
);
router.post(
  '/squads/:id/analyze',
  aiLimit,
  wrap(async (req, res) => {
    if (!(await SquadMember.findOne({ where: { squadId: req.params.id, userId: req.user.id } })))
      fail(403, 'Join this squad to analyze its roster.');
    const members = await SquadMember.findAll({
      where: { squadId: req.params.id },
      include: [{ model: User, as: 'user' }],
    });
    res.json({
      success: true,
      ...(await analyzeSquad(members.map((m) => ({ ...m.user.toJSON(), role: m.role })))),
    });
  }),
);
router.get(
  '/conversations',
  wrap(async (req, res) => {
    const messages = await Message.findAll({
      where: { squadId: null, [Op.or]: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    const ids = [
      ...new Set(messages.map((m) => (m.senderId === req.user.id ? m.receiverId : m.senderId))),
    ];
    const users = await User.findAll({ where: { id: ids } });
    res.json({
      success: true,
      conversations: users.map((user) => ({
        user,
        lastMessage: messages.find((m) => m.senderId === user.id || m.receiverId === user.id),
        unread: messages.filter((m) => m.senderId === user.id && !m.isRead).length,
      })),
    });
  }),
);
router.get(
  '/messages',
  validate(
    z
      .object({
        receiverId: uuid.optional(),
        squadId: uuid.optional(),
        before: z.iso.datetime().optional(),
      })
      .strict()
      .refine((d) => Boolean(d.receiverId) !== Boolean(d.squadId), 'Choose a conversation'),
    'query',
  ),
  wrap(async (req, res) =>
    res.json({
      success: true,
      messages: await messageHistory(req.user, req.validated, req.validated.before),
    }),
  ),
);
router.post(
  '/uploads/presign',
  validate(
    z
      .object({
        contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
        size: z
          .number()
          .int()
          .min(1)
          .max(5 * 1024 * 1024),
      })
      .strict(),
  ),
  wrap(async (req, res) => {
    if (localStorage()) fail(400, 'Use the local screenshot uploader.');
    if (!process.env.S3_BUCKET) fail(503, 'Image storage is not configured.');
    const region = process.env.AWS_REGION || 'ap-south-1',
      client = new S3Client({ region }),
      key = `chat/${req.user.id}/${crypto.randomUUID()}.${req.validated.contentType.split('/')[1]}`,
      bucket = process.env.S3_BUCKET;
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: req.validated.contentType,
        ContentLength: req.validated.size,
      }),
      { expiresIn: 120 },
    );
    res.json({
      success: true,
      uploadUrl,
      imageUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    });
  }),
);
router.post(
  '/uploads/local',
  uploadLimit,
  (req, res, next) => {
    if (!localStorage())
      return res.status(400).json({ success: false, error: 'Local image storage is disabled.' });
    upload.single('image')(req, res, (error) => {
      if (error) {
        error.status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        error.message =
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Screenshot exceeds 5 MB.'
            : 'Choose one image file without extra form fields.';
        return next(error);
      }
      next();
    });
  },
  wrap(async (req, res) =>
    res.status(201).json({ success: true, imageUrl: await storeImage(req.user, req.file) }),
  ),
);
async function authorizedImage(req) {
  const message = await Message.findByPk(req.params.id || req.validated.messageId);
  if (!message || message.messageType !== 'image') fail(404, 'Image not found.');
  if (message.squadId) {
    if (!(await SquadMember.findOne({ where: { squadId: message.squadId, userId: req.user.id } })))
      fail(403, 'Access denied.');
  } else if (![message.senderId, message.receiverId].includes(req.user.id))
    fail(403, 'Access denied.');
  return message;
}
router.get(
  '/uploads/content/:id',
  wrap(async (req, res) => {
    const message = await authorizedImage(req);
    if (!message.imageUrl.startsWith('local://')) fail(404, 'Local image not found.');
    const bytes = await readImage(message.imageUrl);
    res
      .set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(bytes);
  }),
);
router.get(
  '/uploads/view',
  validate(z.object({ messageId: uuid }).strict(), 'query'),
  wrap(async (req, res) => {
    if ((await authorizedImage(req)).imageUrl.startsWith('local://'))
      return res.json({
        success: true,
        source: 'local',
        url: `/uploads/content/${req.validated.messageId}`,
      });
    const message = await Message.findByPk(req.validated.messageId);
    if (!message || message.messageType !== 'image') fail(404, 'Image not found.');
    if (message.squadId) {
      if (
        !(await SquadMember.findOne({ where: { squadId: message.squadId, userId: req.user.id } }))
      )
        fail(403, 'Access denied.');
    } else if (![message.senderId, message.receiverId].includes(req.user.id))
      fail(403, 'Access denied.');
    const key = new URL(message.imageUrl).pathname.slice(1);
    res.json({
      success: true,
      url: await getSignedUrl(
        new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' }),
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
        { expiresIn: 300 },
      ),
    });
  }),
);
export default router;
