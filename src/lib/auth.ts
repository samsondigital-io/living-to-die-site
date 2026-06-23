import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Single-admin session auth.
 *
 * The site has exactly one admin (one email + one password). Instead of a
 * forgeable `admin_auth=true` cookie, the session cookie holds an HMAC
 * signature derived from the configured ADMIN_PASSWORD. Anyone who doesn't
 * know the password cannot produce a valid cookie, and the value reveals
 * nothing about the password.
 */

const COOKIE_NAME = 'admin_session';

function getSecret(): string | null {
  const password = import.meta.env.ADMIN_PASSWORD;
  // No password configured => no valid session can exist (fail closed).
  if (!password) return null;
  return password;
}

/** The value to store in the session cookie once logged in. */
export function createSessionToken(): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update('admin-session-v1').digest('hex');
}

/** Constant-time check that a cookie value is a valid session token. */
export function verifySessionToken(value: string | undefined): boolean {
  if (!value) return false;
  const expected = createSessionToken();
  if (!expected) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Constant-time password comparison. */
export function verifyPassword(input: string): boolean {
  const password = import.meta.env.ADMIN_PASSWORD;
  if (!password || !input) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export { COOKIE_NAME };
