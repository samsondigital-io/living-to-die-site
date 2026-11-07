import { Redis } from '@upstash/redis';

/**
 * The site's Upstash Redis database (blog posts, comments, resources,
 * homepage content, contact messages, newsletter import markers).
 *
 * Connected to the Vercel project through the Upstash integration with the
 * "DIANEMELTON_" prefix, so the variables are DIANEMELTON_KV_REST_API_URL and
 * DIANEMELTON_KV_REST_API_TOKEN. There is deliberately no fallback to other
 * names: a missing variable should fail loudly, not quietly use another database.
 */

const url = () => import.meta.env.DIANEMELTON_KV_REST_API_URL;
const token = () => import.meta.env.DIANEMELTON_KV_REST_API_TOKEN;

export function isRedisConfigured(): boolean {
  return Boolean(url() && token());
}

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!isRedisConfigured()) {
    throw new Error('Redis not configured: set DIANEMELTON_KV_REST_API_URL and DIANEMELTON_KV_REST_API_TOKEN.');
  }
  client ??= new Redis({ url: url(), token: token() });
  return client;
}
