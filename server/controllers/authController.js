import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { User, publicUser } from '../models/index.js';
import { fail, session } from '../middleware/index.js';
import { redis } from '../redis.js';
export async function register(req, res) {
  const { password, email, ...profile } = req.validated;
  const user = await User.create({
    ...profile,
    email: email || null,
    passwordHash: await bcrypt.hash(password, 10),
    playerId: `${profile.role.toUpperCase()}#${crypto.randomInt(1000, 10000)}`,
  });
  res.status(201).json({ success: true, user: publicUser(user), token: session(res, user) });
}
export async function login(req, res) {
  const user = await User.scope('credentials').findOne({ where: { phone: req.validated.phone } });
  if (!user || !(await bcrypt.compare(req.validated.password, user.passwordHash)))
    fail(401, 'Incorrect phone or password.');
  res.json({ success: true, user: publicUser(user), token: session(res, user) });
}
export async function requestOtp(req, res) {
  if (process.env.FREE_MODE === 'true')
    fail(503, 'SMS OTP is disabled in the free local setup. Use password login.');
  if (!redis || !process.env.OTP_PROVIDER_URL || !process.env.OTP_PROVIDER_TOKEN)
    fail(503, 'Phone OTP is not configured. Use password login.');
  const code = String(crypto.randomInt(100000, 1000000)),
    phone = req.validated.phone;
  const key = `otp:${crypto.createHash('sha256').update(phone).digest('hex')}`;
  await redis.set(
    key,
    JSON.stringify({
      digest: crypto.createHmac('sha256', process.env.JWT_SECRET).update(code).digest('hex'),
      attempts: 0,
    }),
    { EX: 300 },
  );
  const response = await fetch(process.env.OTP_PROVIDER_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OTP_PROVIDER_TOKEN}`,
    },
    body: JSON.stringify({ phone, code }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    await redis.del(key);
    fail(503, 'Could not send OTP. Try password login.');
  }
  res.json({ success: true, message: 'If this phone is registered, an OTP will arrive shortly.' });
}
export async function verifyOtp(req, res) {
  if (!redis) fail(503, 'Phone OTP is not configured.');
  const { phone, code } = req.validated,
    key = `otp:${crypto.createHash('sha256').update(phone).digest('hex')}`,
    digest = crypto.createHmac('sha256', process.env.JWT_SECRET).update(code).digest('hex');
  const accepted = await redis.eval(
    `local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local v=cjson.decode(raw); if v.attempts>=5 then redis.call('DEL',KEYS[1]); return 0 end; if v.digest==ARGV[1] then redis.call('DEL',KEYS[1]); return 1 end; v.attempts=v.attempts+1; redis.call('SET',KEYS[1],cjson.encode(v),'KEEPTTL'); return 0`,
    { keys: [key], arguments: [digest] },
  );
  if (!accepted) fail(401, 'Invalid or expired OTP.');
  const user = await User.findOne({ where: { phone } });
  if (!user) fail(401, 'Create an account first.');
  res.json({ success: true, user: publicUser(user), token: session(res, user) });
}
