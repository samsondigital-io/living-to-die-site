import { Redis } from '@upstash/redis';
import { createHmac, timingSafeEqual } from 'crypto';
import { notifyNewComment } from './notify';

export interface Comment {
  id: string;
  postSlug: string;
  name: string;
  body: string;
  status: 'pending' | 'approved' | 'hidden';
  createdAt: string;
}

const COMMENT_PREFIX = 'comment:';
const RATE_PREFIX = 'comment-rate:';
const MAX_COMMENT_LENGTH = 3000;

function getRedis(): Redis {
  const url = import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis/KV not configured.');
  return new Redis({ url, token });
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

function getSecret(): string {
  return import.meta.env.ADMIN_PASSWORD || '';
}

/** Signed timestamp token embedded in the comment form to deter instant bots. */
export function createCommentToken(): string {
  const secret = getSecret();
  if (!secret) return '';
  const ts = String(Date.now());
  const sig = createHmac('sha256', secret).update(`comment:${ts}`).digest('hex');
  return `${ts}.${sig}`;
}

/** Verify the token signature and that a human-plausible amount of time elapsed. */
export function verifyCommentToken(token: string | undefined, minMs = 3000, maxMs = 60 * 60 * 1000): boolean {
  const secret = getSecret();
  if (!secret || !token) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!ts || !sig) return false;
  const expected = createHmac('sha256', secret).update(`comment:${ts}`).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const then = Number(ts);
  if (!Number.isFinite(then)) return false;
  const elapsed = Date.now() - then;
  return elapsed >= minMs && elapsed <= maxMs;
}

/** Strip tags and control chars; keep newlines so we can render with pre-line. */
function toPlainText(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();
}

function sanitizeName(s: string): string {
  return toPlainText(s).slice(0, 80);
}
export async function submitComment(input: {
  postSlug: string;
  name: string;
  body: string;
  website?: string;
  token?: string;
  ip?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // Honeypot: the "website" field is hidden from humans; bots fill it in.
  if (input.website && input.website.trim() !== '') {
    return { ok: false, error: 'Your comment was flagged as spam.' };
  }
  if (!verifyCommentToken(input.token)) {
    return { ok: false, error: 'Please wait a moment and try again.' };
  }
  const name = sanitizeName(input.name);
  const body = toPlainText(input.body);
  const slug = input.postSlug.trim();
  if (!slug) return { ok: false, error: 'Missing post.' };
  if (!name) return { ok: false, error: 'Please enter your name.' };
  if (body.length < 2) return { ok: false, error: 'Please write a comment.' };
  if (body.length > MAX_COMMENT_LENGTH) return { ok: false, error: `Comment is too long (max ${MAX_COMMENT_LENGTH} characters).` };
  if (/https?:\/\/|www\./i.test(body)) {
    return { ok: false, error: 'Links are not allowed in comments.' };
  }

  const redis = getRedis();
  const ip = input.ip || 'unknown';
  const rateKey = `${RATE_PREFIX}${ip}`;
  try {
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 600);
    if (count > 5) {
      return { ok: false, error: 'You are commenting too quickly. Please wait a few minutes.' };
    }
  } catch (e) {
    console.error('Rate limit error:', e);
    // Fail open on rate-limit errors; moderation still gates publishing.
  }

  const comment: Comment = {
    id: generateId(),
    postSlug: slug,
    name,
    body,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    await redis.set(`${COMMENT_PREFIX}${comment.id}`, comment);
  } catch (error) {
    console.error('Error saving comment:', error);
    return { ok: false, error: 'Could not save your comment. Please try again.' };
  }

  // Notify admins (best-effort; a failure here must not fail the comment).
  notifyNewComment(comment).catch((e) => console.error('Failed to send comment notification:', e));

  return { ok: true, id: comment.id };
}

export async function listComments(status?: Comment['status']): Promise<Comment[]> {
  try {
    const redis = getRedis();
    const keys: string[] = [];
    let cursor = 0;
    do {
      const [next, batch] = await redis.scan(cursor, { match: `${COMMENT_PREFIX}*`, count: 100 });
      cursor = Number(next);
      keys.push(...batch);
    } while (cursor !== 0);
    if (keys.length === 0) return [];
    const out: Comment[] = [];
    for (const key of keys) {
      const c = await redis.get<Comment>(key);
      if (c && (!status || c.status === status)) out.push(c);
    }
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return out;
  } catch (error) {
    console.error('Error listing comments:', error);
    return [];
  }
}

export async function getApprovedComments(slug: string): Promise<Comment[]> {
  const all = await listComments('approved');
  return all
    .filter((c) => c.postSlug === slug)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getComment(id: string): Promise<Comment | null> {
  const redis = getRedis();
  try {
    return await redis.get<Comment>(`${COMMENT_PREFIX}${id}`);
  } catch (error) {
    console.error('Error getting comment:', error);
    return null;
  }
}

export async function setCommentStatus(id: string, status: Comment['status']): Promise<Comment | null> {
  const redis = getRedis();
  const existing = await redis.get<Comment>(`${COMMENT_PREFIX}${id}`);
  if (!existing) return null;
  const updated: Comment = { ...existing, status };
  await redis.set(`${COMMENT_PREFIX}${id}`, updated);
  return updated;
}

export async function deleteComment(id: string): Promise<boolean> {
  const redis = getRedis();
  try {
    const result = await redis.del(`${COMMENT_PREFIX}${id}`);
    return result === 1;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}