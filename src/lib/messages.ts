import { getRedis } from './redis';
import { verifyCommentToken } from './comments';
import { notifyNewMessage } from './notify';

/**
 * Messages sent through the contact form.
 *
 * Every message is saved to Redis first (so nothing is lost even if email
 * isn't configured) and shown in the admin inbox; an email notice is sent on
 * top of that when Resend is set up.
 */

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const SUBJECTS: Record<string, string> = {
  speaking: 'Speaking engagement',
  media: 'Media inquiry',
  bookclub: 'Book club visit',
  general: 'General message',
};

const MESSAGE_PREFIX = 'contact:';
const RATE_PREFIX = 'contact-rate:';
const MAX_MESSAGE_LENGTH = 5000;


/** Strip tags and control characters, keeping newlines. Non-strings become ''. */
function plain(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

/**
 * Check and clean what the visitor typed. Pure, so it can be unit-tested.
 * Returns the cleaned fields or a message to show the visitor.
 */
export function validateMessage(raw: unknown):
  | { ok: true; value: Pick<ContactMessage, 'name' | 'email' | 'subject' | 'message'> }
  | { ok: false; error: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const name = plain(r.name, 100).replace(/\s+/g, ' ');
  const email = plain(r.email, 254);
  const subject = SUBJECTS[plain(r.subject, 20)] ?? SUBJECTS.general;
  const message = typeof r.message === 'string' ? plain(r.message, MAX_MESSAGE_LENGTH + 1) : '';

  if (!name) return { ok: false, error: 'Please enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (message.length < 2) return { ok: false, error: 'Please write a message.' };
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Your message is too long (max ${MAX_MESSAGE_LENGTH} characters).` };
  }
  return { ok: true, value: { name, email, subject, message } };
}

export async function submitMessage(input: {
  fields: unknown;
  website?: unknown;
  token?: unknown;
  ip?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Honeypot: the "website" field is hidden from people; bots fill it in.
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return { ok: false, error: 'Your message could not be sent.' };
  }
  if (!verifyCommentToken(typeof input.token === 'string' ? input.token : undefined)) {
    return { ok: false, error: 'Please wait a moment and try again, or reload the page.' };
  }
  const checked = validateMessage(input.fields);
  if (!checked.ok) return checked;

  const redis = getRedis();
  const rateKey = `${RATE_PREFIX}${input.ip || 'unknown'}`;
  try {
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 600);
    if (count > 5) return { ok: false, error: 'Too many messages in a short time. Please wait a few minutes.' };
  } catch (e) {
    console.error('Contact rate limit error:', e);
  }

  const msg: ContactMessage = {
    id: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
    ...checked.value,
    read: false,
    createdAt: new Date().toISOString(),
  };
  try {
    await redis.set(`${MESSAGE_PREFIX}${msg.id}`, msg);
  } catch (e) {
    console.error('Error saving contact message:', e);
    return { ok: false, error: 'Your message could not be sent. Please try again.' };
  }

  // Best-effort: the message is already safe in the inbox.
  try {
    await notifyNewMessage(msg);
  } catch (e) {
    console.error('Failed to send contact notification:', e);
  }
  return { ok: true };
}

/** All messages, newest first. */
export async function listMessages(): Promise<ContactMessage[]> {
  const redis = getRedis();
  const keys: string[] = [];
  let cursor: string | number = 0;
  do {
    const [next, batch]: [string | number, string[]] = await redis.scan(cursor, { match: `${MESSAGE_PREFIX}*`, count: 100 });
    keys.push(...batch);
    cursor = next;
  } while (String(cursor) !== '0');
  if (keys.length === 0) return [];
  const items = await redis.mget<(ContactMessage | null)[]>(...keys);
  return items
    .filter((m): m is ContactMessage => Boolean(m))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setMessageRead(id: string, read: boolean): Promise<ContactMessage | null> {
  const redis = getRedis();
  const key = `${MESSAGE_PREFIX}${id}`;
  const existing = await redis.get<ContactMessage>(key);
  if (!existing) return null;
  const updated = { ...existing, read };
  await redis.set(key, updated);
  return updated;
}

export async function deleteMessage(id: string): Promise<boolean> {
  return (await getRedis().del(`${MESSAGE_PREFIX}${id}`)) > 0;
}
