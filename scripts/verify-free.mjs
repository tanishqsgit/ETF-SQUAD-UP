import 'dotenv/config';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { io } from 'socket.io-client';

const base = 'http://localhost:4000';
const credentials = JSON.parse(await fs.readFile('.local/test-accounts.json', 'utf8'));
async function request(path, token, options = {}, expected = 200) {
  const response = await fetch(`${base}/api${path}`, {
    ...options,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  assert.equal(response.status, expected, `${path}: ${response.status}`);
  return response;
}
async function json(path, token, body, expected = 200) {
  return (
    await request(
      path,
      token,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
      expected,
    )
  ).json();
}
const caps = await (await request('/capabilities')).json();
assert.equal(caps.storage, 'local');
assert.equal(caps.bioSource, 'template');
assert.equal(caps.otp, false);
const users = [];
for (const account of credentials.accounts)
  users.push(
    await json('/auth/login', null, { phone: account.phone, password: credentials.password }),
  );
const [sender, receiver, outsider] = users;
const bio = await json('/ai/bio', sender.token, { role: 'sniper', rank: 'Heroic', kdRatio: 3.24 });
assert.equal(bio.source, 'template');
assert.match(bio.bio, /SNIPER.*3.24/);
assert.ok(bio.bio.length < 200);
await json('/auth/otp/request', null, { phone: credentials.accounts[0].phone }, 503);
await json('/uploads/presign', sender.token, { contentType: 'image/png', size: 100 }, 400);
const bytes = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#00f0ff' } })
  .png()
  .toBuffer();
async function upload(content, type, expected) {
  const form = new FormData();
  form.append('image', new Blob([content], { type }), 'gameplay.png');
  return (
    await request('/uploads/local', sender.token, { method: 'POST', body: form }, expected)
  ).json();
}
await upload(Buffer.from('<svg></svg>'), 'image/png', 400);
await upload(bytes, 'image/jpeg', 400);
await upload(bytes.subarray(0, 8), 'image/png', 400);
await upload(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png', 413);
const image = await upload(bytes, 'image/png', 201);
assert.match(image.imageUrl, /^local:\/\//);
const sockets = [];
async function connect(user) {
  const socket = io(base, { auth: { token: user.token }, transports: ['websocket'] });
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
    setTimeout(() => reject(new Error('Socket timeout')), 5000).unref();
  });
  return socket;
}
const emit = (socket, event, input) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(5000)
      .emit(event, input, (error, result) => (error ? reject(error) : resolve(result))),
  );
try {
  const client = await connect(sender),
    other = await connect(outsider);
  const destination = { receiverId: receiver.user.id };
  const sent = await emit(client, 'send_message', {
    ...destination,
    content: 'Local screenshot QA',
    messageType: 'image',
    imageUrl: image.imageUrl,
  });
  assert.equal(sent.success, true, sent.error);
  const id = sent.message.id;
  for (const user of [sender, receiver]) {
    const view = await (await request(`/uploads/view?messageId=${id}`, user.token)).json();
    assert.equal(view.source, 'local');
    const content = await request(view.url, user.token);
    assert.equal(content.headers.get('content-type'), 'image/webp');
    const decoded = await sharp(Buffer.from(await content.arrayBuffer())).metadata();
    assert.equal(decoded.width, 64);
    assert.equal(decoded.format, 'webp');
  }
  await request(`/uploads/content/${id}`, outsider.token, {}, 403);
  await request(`/uploads/view?messageId=${id}`, outsider.token, {}, 403);
  await request(`/uploads/content/${id}`, null, {}, 401);
  const reused = await emit(other, 'send_message', {
    ...destination,
    content: 'Invalid reuse',
    messageType: 'image',
    imageUrl: image.imageUrl,
  });
  assert.equal(reused.success, false);
  assert.match(reused.error, /another player/);
  console.log(
    'Free-mode verification passed: template bios, paid-service guards, strict uploads, private delivery and unauthorized access rejection.',
  );
} finally {
  for (const socket of sockets) socket.disconnect();
}
