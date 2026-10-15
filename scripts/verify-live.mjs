import 'dotenv/config';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const base = 'http://localhost:4000';
const file = '.local/test-accounts.json';
await fs.mkdir('.local', { recursive: true });
let credentials;
try {
  credentials = JSON.parse(await fs.readFile(file, 'utf8'));
} catch {
  credentials = {
    password: crypto.randomBytes(16).toString('hex'),
    accounts: [
      { phone: '9010000001', displayName: 'LOCAL_LEADER', role: 'igl' },
      { phone: '9010000002', displayName: 'LOCAL_SNIPER', role: 'sniper' },
      { phone: '9010000003', displayName: 'LOCAL_RUSHER', role: 'rusher' },
    ],
  };
  await fs.writeFile(file, JSON.stringify(credentials, null, 2));
}
async function request(path, method = 'GET', body, token, expected = 200) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${data.error || response.status}`);
  return { data, cookie: response.headers.get('set-cookie') };
}
for (let i = 0; i < 20; i++) {
  try {
    await request('/health');
    break;
  } catch (error) {
    if (i === 19) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
const accounts = [];
for (const account of credentials.accounts) {
  const profile = {
    ...account,
    password: credentials.password,
    age: 20,
    games: ['Free Fire'],
    rank: 'Heroic',
    playingTime: ['night'],
    device: 'android',
    deviceModel: 'Local test device',
    bio: 'Local QA account',
    kdRatio: 2,
    winRate: 50,
    totalMatches: 100,
  };
  const response = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(profile),
  });
  assert.ok([201, 409].includes(response.status), 'Register returns created or existing');
  const login = await request('/auth/login', 'POST', {
    phone: account.phone,
    password: credentials.password,
  });
  assert.ok(!('passwordHash' in login.data.user) && !('phone' in login.data.user));
  const restored = await fetch(`${base}/api/auth/me`, {
    headers: { cookie: login.cookie.split(';')[0] },
  });
  assert.equal(restored.status, 200, 'HttpOnly session restores user');
  accounts.push(login.data);
}
const [leader, sniper, outsider] = accounts;
await request('/players', 'GET', null, null, 401);
await request('/players/me', 'PATCH', { isVerified: true }, leader.token, 400);
await request('/players/me', 'PATCH', { age: 12 }, leader.token, 400);
const edited = await request(
  '/players/me',
  'PATCH',
  {
    displayName: 'LOCAL_SNIPER',
    bio: 'Long-range cover, calm comms.',
    age: 21,
    games: ['Free Fire', 'BGMI'],
    role: 'sniper',
    rank: 'Master',
    playingTime: ['evening', 'night'],
    device: 'ios',
    deviceModel: 'iPhone local test',
    youtubeUrl: 'https://youtube.com/@localtest',
    instagramHandle: 'local.test',
    discordId: 'local-test',
    kdRatio: 3.25,
    winRate: 62,
    totalMatches: 500,
  },
  sniper.token,
);
assert.equal(edited.data.user.device, 'ios');
assert.equal(edited.data.user.kdRatio, 3.25);
const filtered = await request('/players?role=sniper&device=ios', 'GET', null, leader.token);
assert.ok(filtered.data.players.some((p) => p.id === sniper.user.id));
const squad = (
  await request(
    '/squads',
    'POST',
    { name: `Local QA ${Date.now()}`, game: 'Free Fire', lookingForRole: 'sniper' },
    leader.token,
    201,
  )
).data.squad;
const application = (await request(`/squads/${squad.id}/join`, 'POST', null, sniper.token, 201))
  .data.request;
await request(`/squads/${squad.id}/join`, 'POST', null, sniper.token, 409);
const inbox = (await request('/notifications', 'GET', null, leader.token)).data;
assert.ok(inbox.requests.some((r) => r.id === application.id));
await request(
  `/join-requests/${application.id}`,
  'PATCH',
  { status: 'accepted' },
  outsider.token,
  403,
);
await request(`/join-requests/${application.id}`, 'PATCH', { status: 'accepted' }, leader.token);
const joined = (await request(`/squads/${squad.id}`, 'GET', null, leader.token)).data.squad;
assert.equal(joined.members.length, 2);
const declined = (await request(`/squads/${squad.id}/join`, 'POST', null, outsider.token, 201)).data
  .request;
await request(`/join-requests/${declined.id}`, 'PATCH', { status: 'rejected' }, leader.token);
assert.ok(
  (await request('/notifications', 'GET', null, outsider.token)).data.applications.some(
    (application) => application.id === declined.id && application.status === 'rejected',
  ),
);
const invite = (
  await request(
    `/squads/${squad.id}/invites`,
    'POST',
    { playerId: outsider.user.playerId },
    leader.token,
    201,
  )
).data.invite;
const recipientInbox = (await request('/notifications', 'GET', null, outsider.token)).data;
assert.ok(recipientInbox.invitations.some((i) => i.id === invite.id));
await request(`/invites/${invite.id}/reject`, 'POST', null, sniper.token, 403);
await request(`/invites/${invite.id}/reject`, 'POST', null, outsider.token);
await request(`/invites/${invite.inviteCode}/accept`, 'POST', null, outsider.token, 404);
const replacement = (
  await request(
    `/squads/${squad.id}/invites`,
    'POST',
    { playerId: outsider.user.playerId },
    leader.token,
    201,
  )
).data.invite;
await request(`/invites/${replacement.inviteCode}/accept`, 'POST', null, outsider.token);
await request(`/invites/${replacement.inviteCode}/accept`, 'POST', null, outsider.token, 404);
const sockets = [];
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(base, { auth: { token }, reconnection: false, timeout: 5000 });
    sockets.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}
const emit = (socket, event, data) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(5000)
      .emit(event, data, (error, result) => (error ? reject(error) : resolve(result))),
  );
const event = (socket, name) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${name} event timed out`)), 5000);
    socket.once(name, (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
try {
  const a = await connect(leader.token),
    b = await connect(sniper.token);
  assert.equal((await emit(a, 'join_room', { receiverId: sniper.user.id })).success, true);
  assert.equal((await emit(b, 'join_room', { receiverId: leader.user.id })).success, true);
  const typing = event(b, 'typing');
  await emit(a, 'typing', { receiverId: sniper.user.id, isTyping: true });
  assert.equal((await typing).isTyping, true);
  const received = event(b, 'message');
  const started = performance.now();
  const sent = await emit(a, 'send_message', {
    receiverId: sniper.user.id,
    content: 'Live local test: ready for scrims.',
  });
  assert.equal(sent.success, true);
  assert.equal((await received).id, sent.message.id);
  const latency = Math.round(performance.now() - started);
  const unread = (
    await request('/conversations', 'GET', null, sniper.token)
  ).data.conversations.find((c) => c.user.id === leader.user.id);
  assert.ok(unread.unread >= 1);
  const receipt = event(a, 'read_receipt');
  assert.equal((await emit(b, 'read_messages', { receiverId: leader.user.id })).success, true);
  assert.equal((await receipt).readerId, sniper.user.id);
  const cleared = (
    await request('/conversations', 'GET', null, sniper.token)
  ).data.conversations.find((c) => c.user.id === leader.user.id);
  assert.equal(cleared.unread, 0);
  const history = (
    await request(`/messages?receiverId=${leader.user.id}`, 'GET', null, sniper.token)
  ).data.messages;
  assert.ok(history.some((m) => m.id === sent.message.id && m.isRead));
  assert.equal(
    (await emit(a, 'send_message', { receiverId: sniper.user.id, content: 'kill yourself' }))
      .success,
    false,
  );
  const status = event(b, 'presence');
  await emit(a, 'update_status', { status: 'in_game' });
  assert.equal((await status).status, 'in_game');
  const observer = await connect(outsider.token);
  const unjoined = (
    await request(
      '/squads',
      'POST',
      { name: `Private QA ${Date.now()}`, game: 'Free Fire', isOpen: false },
      leader.token,
      201,
    )
  ).data.squad;
  assert.equal((await emit(observer, 'join_room', { squadId: unjoined.id })).success, false);
  await emit(a, 'join_room', { squadId: squad.id });
  await emit(b, 'join_room', { squadId: squad.id });
  const group = event(b, 'message');
  assert.equal(
    (await emit(a, 'send_message', { squadId: squad.id, content: 'Squad channel live.' })).success,
    true,
  );
  assert.equal((await group).squadId, squad.id);
  b.disconnect();
  const reconnected = await connect(sniper.token);
  assert.equal(
    (await emit(reconnected, 'join_room', { receiverId: leader.user.id })).success,
    true,
  );
  const expired = jwt.sign({ sub: leader.user.id }, process.env.JWT_SECRET, {
    expiresIn: -1,
    issuer: 'squadup',
    audience: 'squadup-client',
  });
  await assert.rejects(() => connect(expired), /Authentication/);
  console.log(
    `PASS: real registration/login/cookie restoration, full profile edit, filtering, leader approvals, invitation rejection/acceptance, DM/group persistence, typing, presence, reconnect, moderation, expired token, unauthorized room. Local DM latency: ${latency} ms (local blocklist only).`,
  );
} finally {
  for (const socket of sockets) socket.disconnect();
}
await request('/auth/logout', 'POST', null, leader.token);
console.log(
  'Local test accounts are saved in ignored .local/test-accounts.json. Test data remains in the isolated development database.',
);
