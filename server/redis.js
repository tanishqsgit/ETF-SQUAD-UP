import { createClient } from 'redis';
export let redis = null;
export async function initRedis() {
  if (process.env.FREE_MODE === 'true' || !process.env.REDIS_URL) return;
  redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', () => console.error('Redis connection error'));
  await redis.connect();
}
