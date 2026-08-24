import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { getSubscriberCount } from '../../lib/mailerlite';

/** GET /api/subscriber-count — used to label the "send" button in the composer. */
export const GET: APIRoute = async ({ cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const count = await getSubscriberCount();
  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
