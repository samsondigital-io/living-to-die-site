import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../../lib/auth';
import { listComments } from '../../../lib/comments';

/** GET /api/admin/comments?status=pending|approved|spam — moderation list (admin). */
export const GET: APIRoute = async ({ url, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  const status = url.searchParams.get('status') || undefined;
  const comments = await listComments(status as any);
  return json({ success: true, data: comments }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
