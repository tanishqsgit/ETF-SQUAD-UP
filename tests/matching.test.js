import test from 'node:test';
import assert from 'node:assert/strict';
import { compatibility } from '../src/matching.js';
const user = { role: 'igl', playingTime: ['night'], rank: 'Heroic', age: 20 };
test('complementary role and identical preferences score 100', () => {
  assert.equal(compatibility(user, { ...user, role: 'sniper' }).score, 100);
});
test('schedule mismatch subtracts its 30 percent weighting', () => {
  assert.equal(
    compatibility(user, { ...user, role: 'sniper', playingTime: ['morning'] }).score,
    70,
  );
});
test('extreme age gaps and unknown ranks keep score bounded', () => {
  const score = compatibility(user, { ...user, role: 'sniper', rank: 'Unknown', age: 90 }).score;
  assert.ok(score >= 0 && score <= 100);
  assert.equal(score, 74);
});
