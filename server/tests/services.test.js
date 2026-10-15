import test from 'node:test';
import assert from 'node:assert/strict';
import { compatibility } from '../services/matchingService.js';
import { rosterInsights } from '../../shared/roster.js';
import { register, messageInput, phone } from '../validation.js';
import { dmRoom } from '../services/messageService.js';
import { readToken } from '../middleware/index.js';
import { serializeRoom } from '../services/serialization.js';
const player = { role: 'igl', playingTime: ['night', 'late_night'], rank: 'Heroic', age: 20 };
test('perfect complement scores 100 with documented weights', () => {
  assert.equal(compatibility(player, { ...player, role: 'sniper' }).score, 100);
});
test('schedule uses Jaccard overlap and rank applies tier penalties', () => {
  const result = compatibility(player, {
    ...player,
    role: 'sniper',
    playingTime: ['night'],
    rank: 'Master',
    age: 26,
  });
  assert.deepEqual(result.breakdown, { role: 100, time: 50, rank: 70, age: 80 });
  assert.equal(result.score, 77);
});
test('missing-role requirement and unknown ranks do not produce false perfect matches', () => {
  assert.equal(compatibility(player, { ...player, role: 'sniper' }, 'sniper').breakdown.role, 100);
  assert.equal(compatibility(player, { ...player, role: 'rusher' }, 'sniper').breakdown.role, 20);
  assert.equal(compatibility(player, { ...player, rank: 'Unknown' }).breakdown.rank, 20);
  assert.equal(
    compatibility({ ...player, playingTime: [] }, { ...player, playingTime: [] }).breakdown.time,
    0,
  );
});
test('age score is bounded even for extreme age gaps', () => {
  const result = compatibility(player, { ...player, age: 99 });
  assert.equal(result.breakdown.age, 0);
  assert.ok(result.score >= 0 && result.score <= 100);
});
test('roster analysis catches missing leadership, cover, and duplicate rushers', () => {
  const issues = rosterInsights([{ role: 'rusher' }, { role: 'rusher' }, { role: 'nader' }]);
  assert.equal(issues.length, 4);
  assert.ok(issues.some((s) => s.includes('IGL')));
  assert.equal(
    rosterInsights(['igl', 'rusher', 'sniper', 'nader', 'assaulter'].map((role) => ({ role })))
      .length,
    1,
  );
});
test('Indian phones are canonicalized and invalid numbers rejected', () => {
  assert.equal(phone.parse('9876543210'), '+919876543210');
  assert.equal(phone.safeParse('1234567890').success, false);
});
test('register rejects underage users and privilege escalation fields', () => {
  const input = {
    displayName: 'Test',
    phone: '9876543210',
    password: 'password123',
    games: ['Free Fire'],
    role: 'rusher',
    rank: 'Heroic',
    playingTime: ['night'],
    age: 20,
    device: 'android',
  };
  assert.equal(register.safeParse(input).success, true);
  assert.equal(register.safeParse({ ...input, age: 12 }).success, false);
  assert.equal(register.safeParse({ ...input, password: '😀'.repeat(20) }).success, false);
  assert.equal(register.safeParse({ ...input, isVerified: true }).success, false);
  assert.equal(register.safeParse({ ...input, playingTime: [] }).success, false);
});
test('messages require exactly one destination and reject empty content', () => {
  const receiverId = '123e4567-e89b-42d3-a456-426614174000',
    squadId = '123e4567-e89b-42d3-a456-426614174001';
  assert.equal(messageInput.safeParse({ receiverId, content: 'Ready for scrims?' }).success, true);
  assert.equal(messageInput.safeParse({ receiverId, squadId, content: 'Hello' }).success, false);
  assert.equal(messageInput.safeParse({ receiverId, content: '   ' }).success, false);
  assert.equal(
    messageInput.safeParse({ squadId, content: 'Image', messageType: 'image' }).success,
    false,
  );
});
test('DM room is identical for both participants', () => {
  assert.equal(dmRoom('b', 'a'), 'dm:a_b');
  assert.equal(dmRoom('a', 'b'), dmRoom('b', 'a'));
});
test('HTTP session supports cookie and prioritizes bearer token', () => {
  assert.equal(
    readToken({ headers: { cookie: 'other=1; squadup_session=test-token' } }),
    'test-token',
  );
  assert.equal(
    readToken({ headers: { authorization: 'Bearer direct', cookie: 'squadup_session=cookie' } }),
    'direct',
  );
});
test('room serialization preserves order and recovers from failed messages', async () => {
  const order = [];
  const first = serializeRoom('test-room', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    order.push(1);
    throw new Error('Moderation rejected');
  });
  const second = serializeRoom('test-room', async () => {
    order.push(2);
    return 'saved';
  });
  const results = await Promise.allSettled([first, second]);
  assert.deepEqual(order, [1, 2]);
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].value, 'saved');
});
