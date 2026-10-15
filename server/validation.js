import { z } from 'zod';
import { roles, slots } from './models/index.js';
export const uuid = z.string().uuid();
const nullableText = (max) => z.string().trim().max(max).optional();
export const phone = z
  .string()
  .regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number')
  .transform((v) => (v.startsWith('+91') ? v : `+91${v}`));
export const profile = z
  .object({
    displayName: z.string().trim().min(3).max(30),
    bio: nullableText(200),
    games: z
      .array(z.enum(['Free Fire', 'BGMI', 'CODM']))
      .min(1)
      .max(3),
    role: z.enum(roles),
    rank: z.enum([
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Diamond',
      'Heroic',
      'Master',
      'Grandmaster',
    ]),
    playingTime: z.array(z.enum(slots)).min(1).max(5),
    age: z.coerce.number().int().min(13).max(100),
    device: z.enum(['android', 'ios']),
    deviceModel: nullableText(80),
    youtubeUrl: z
      .union([
        z
          .string()
          .max(250)
          .url()
          .regex(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//),
        z.literal(''),
      ])
      .optional(),
    instagramHandle: nullableText(30),
    discordId: nullableText(80),
    kdRatio: z.coerce.number().min(0).max(100).optional(),
    winRate: z.coerce.number().min(0).max(100).optional(),
    totalMatches: z.coerce.number().int().min(0).max(1000000).optional(),
  })
  .strict();
export const register = profile.extend({
  phone,
  password: z
    .string()
    .min(8)
    .max(72)
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Password must not exceed 72 UTF-8 bytes',
    ),
  email: z.union([z.string().email(), z.literal('')]).optional(),
});
export const login = z
  .object({
    phone,
    password: z
      .string()
      .min(1)
      .max(72)
      .refine(
        (value) => Buffer.byteLength(value, 'utf8') <= 72,
        'Password must not exceed 72 UTF-8 bytes',
      ),
  })
  .strict();
export const squadInput = z
  .object({
    name: z.string().trim().min(3).max(40),
    description: z.string().trim().max(500).default(''),
    game: z.enum(['Free Fire', 'BGMI', 'CODM']).default('Free Fire'),
    isOpen: z.boolean().default(true),
    lookingForRole: z.enum(roles).nullable().default(null),
  })
  .strict();
export const messageInput = z
  .object({
    receiverId: uuid.optional(),
    squadId: uuid.optional(),
    content: z.string().trim().min(1).max(2000),
    messageType: z.enum(['text', 'image']).default('text'),
    imageUrl: z.string().url().optional(),
  })
  .strict()
  .refine((d) => Boolean(d.receiverId) !== Boolean(d.squadId), 'Specify exactly one destination')
  .refine((d) => d.messageType !== 'image' || Boolean(d.imageUrl), 'Image URL required');
