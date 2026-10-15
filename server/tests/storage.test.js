import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { detectImage, parseLocalImage, storeImage } from '../services/storageService.js';
import { templateBio } from '../../shared/bio.js';

test('screenshot references reject traversal and unsupported bytes', () => {
  for (const reference of ['local://../../.env', 'local://123/456.webp', 'file:///etc/passwd'])
    assert.throws(() => parseLocalImage(reference), { status: 400 });
  assert.throws(() => detectImage(Buffer.from('<svg></svg>')), { status: 400 });
});
test('image decoding rejects corrupt, mislabeled and oversized screenshots', async () => {
  const buffer = await sharp({
    create: { width: 2, height: 2, channels: 3, background: '#00f0ff' },
  })
    .png()
    .toBuffer();
  const file = { buffer, size: buffer.length, mimetype: 'image/png' };
  assert.equal(detectImage(buffer), 'png');
  await assert.rejects(storeImage({}, { ...file, mimetype: 'image/jpeg' }), { status: 400 });
  await assert.rejects(storeImage({}, { ...file, size: 6 * 1024 * 1024 }), { status: 413 });
  await assert.rejects(storeImage({}, { ...file, buffer: buffer.subarray(0, 8) }), { status: 400 });
});
test('template bio fits the limit and includes tactical profile facts', () => {
  const bio = templateBio({ role: 'sniper', rank: 'Heroic', kdRatio: 3.24 });
  assert.ok(bio.length < 200);
  assert.match(bio, /SNIPER.*Heroic.*3.24 K\/D/);
});
