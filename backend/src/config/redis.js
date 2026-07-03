import Redis from 'ioredis';
import 'dotenv/config';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (err) => console.error('[Redis] connection error:', err.message));
redis.on('connect', () => console.log('[Redis] connected'));

/**
 * Get-or-set cache wrapper.
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<any>} fetcher
 */
export async function cached(key, ttlSeconds, fetcher) {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch (e) {
    // fall through to fetcher on cache errors
  }
  const fresh = await fetcher();
  try {
    await redis.set(key, JSON.stringify(fresh), 'EX', ttlSeconds);
  } catch (e) {
    /* non-fatal */
  }
  return fresh;
}

export default redis;
