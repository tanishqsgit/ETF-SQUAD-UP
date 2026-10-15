import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { fail } from '../middleware/index.js';
import { serializeRoom } from './serialization.js';

const root = path.resolve('.local/uploads');
export const localStorage = () => process.env.FREE_MODE === 'true' || !process.env.S3_BUCKET;
const idPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const referencePattern = new RegExp(`^local://(${idPattern})/(${idPattern})\\.webp$`);
export function parseLocalImage(reference) {
  const match = referencePattern.exec(reference || '');
  if (!match) fail(400, 'Invalid image reference.');
  return { ownerId: match[1], file: path.join(root, match[1], `${match[2]}.webp`) };
}
export function detectImage(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (buffer.length > 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return 'jpeg';
  if (
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'webp';
  fail(400, 'Choose an actual JPG, PNG or WebP image.');
}
async function totalBytes(directory) {
  let bytes = 0;
  for (const item of await fs.readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const target = path.join(directory, item.name);
    bytes += item.isDirectory() ? await totalBytes(target) : (await fs.stat(target)).size;
  }
  return bytes;
}
export async function storeImage(user, file) {
  if (!file) fail(400, 'Choose a screenshot to upload.');
  if (file.size > 5 * 1024 * 1024) fail(413, 'Screenshot exceeds 5 MB.');
  const format = detectImage(file.buffer);
  if (file.mimetype !== `image/${format}`)
    fail(400, 'Image contents do not match the declared file type.');
  let clean;
  try {
    clean = await sharp(file.buffer, { limitInputPixels: 16 * 1024 * 1024, failOn: 'error' })
      .rotate()
      .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    fail(400, 'Image is corrupted or its dimensions exceed the supported limit.');
  }
  return serializeRoom('local-upload-storage', async () => {
    const directory = path.join(root, user.id);
    if ((await totalBytes(directory)) + clean.length > 100 * 1024 * 1024)
      fail(413, 'Your local screenshot storage limit is 100 MB.');
    if ((await totalBytes(root)) + clean.length > 500 * 1024 * 1024)
      fail(413, 'Local screenshot storage is full (500 MB limit).');
    await fs.mkdir(directory, { recursive: true });
    const name = `${crypto.randomUUID()}.webp`;
    await fs.writeFile(path.join(directory, name), clean, { flag: 'wx' });
    return `local://${user.id}/${name}`;
  });
}
export async function verifyOwnedImage(user, reference) {
  const parsed = parseLocalImage(reference);
  if (parsed.ownerId !== user.id) fail(403, 'This screenshot belongs to another player.');
  try {
    await fs.access(parsed.file);
  } catch {
    fail(404, 'Screenshot not found.');
  }
}
export async function readImage(reference) {
  const { file } = parseLocalImage(reference);
  try {
    return await fs.readFile(file);
  } catch {
    fail(404, 'Screenshot file is unavailable.');
  }
}
