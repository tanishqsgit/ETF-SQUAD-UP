import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/index.js';
export function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      return res.status(400).json({
        success: false,
        error: result.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
      });
    req.validated = result.data;
    next();
  };
export function readToken(req) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const cookie = req.headers.cookie
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith('squadup_session='))
    ?.slice(16);
  return bearer || cookie;
}
export const auth = wrap(async (req, res, next) => {
  let payload;
  try {
    payload = jwt.verify(readToken(req), config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'squadup',
      audience: 'squadup-client',
    });
  } catch {
    fail(401, 'Please sign in again.');
  }
  const user = await User.findByPk(payload.sub);
  if (!user) fail(401, 'Account not found.');
  req.user = user;
  next();
});
export function session(res, user) {
  const token = jwt.sign({}, config.jwtSecret, {
    subject: user.id,
    expiresIn: '12h',
    issuer: 'squadup',
    audience: 'squadup-client',
  });
  res.cookie('squadup_session', token, {
    httpOnly: true,
    secure: config.production,
    sameSite: 'strict',
    maxAge: 12 * 3600000,
    path: '/api',
  });
  return token;
}
export function errors(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status =
    error.status ||
    (error.name === 'SequelizeUniqueConstraintError'
      ? 409
      : error.name === 'SequelizeValidationError' || error.name === 'ZodError'
        ? 400
        : 500);
  if (status >= 500) console.error('Request failed:', error.name);
  res.status(status).json({
    success: false,
    error:
      status === 500
        ? 'Something went wrong. Please try again.'
        : status === 409
          ? 'That player ID, phone, email or squad name is already in use.'
          : error.message,
  });
}
