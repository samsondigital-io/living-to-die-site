import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../../../lib/auth';
import { setCommentStatus, deleteComment } from '../../../../lib/comments';

/**
 * Admin comment moderation.
 * PATCH  /api/admin/comments/[id]  body: { status: 'approved' | 'spam' | 'pending' }
 * DELETE /api/admin/comments/[id]
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  const { id } = params;
  if (!id) return json({ success: false, error: 'Missing comment id' }, 400);
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid request' }, 400);
  }
  if (!['approved', 'hidden', 'pending'].includes(body.status)) {
    return json({ success: false, error: 'Invalid status' }, 400);
  }
  const comment = await setCommentStatus(id, body.status);
  if (!comment) return json({ success: false, error: 'Comment not found' }, 404);
  return json({ success: true, data: comment }, 200);
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  const { id } = params;
  if (!id) return json({ success: false, error: 'Missing comment id' }, 400);
  const deleted = await deleteComment(id);
  if (!deleted) return json({ success: false, error: 'Comment not found' }, 404);
  return json({ success: true }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
