import 'dotenv/config';
export const config = {
  port: Number(process.env.PORT || 4000),
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  production: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET,
  database: process.env.DATABASE_URL,
};
export function validateConfig() {
  if (!config.database) throw new Error('DATABASE_URL is required. Copy .env.example to .env.');
  if (!config.jwtSecret || config.jwtSecret.length < 32 || config.jwtSecret.startsWith('replace-'))
    throw new Error('JWT_SECRET must be a unique secret of at least 32 characters.');
}
