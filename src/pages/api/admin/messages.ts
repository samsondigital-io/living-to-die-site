import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../../lib/auth';
import { listMessages } from '../../../lib/messages';

/** GET /api/admin/messages — contact form inbox, newest first (admin). */
export const GET: APIRoute = async ({ cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  try {
    return json({ success: true, data: await listMessages() }, 200);
  } catch (e) {
    console.error('listMessages error:', e);
    return json({ success: false, error: 'Could not load messages.' }, 500);
  }
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
