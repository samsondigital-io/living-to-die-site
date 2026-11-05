import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../../../lib/auth';
import { setMessageRead, deleteMessage } from '../../../../lib/messages';

/**
 * Admin contact-message actions.
 * PATCH  /api/admin/messages/[id]  body: { read: boolean }
 * DELETE /api/admin/messages/[id]
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  const { id } = params;
  if (!id) return json({ success: false, error: 'Missing message id' }, 400);
  let body: { read?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid request' }, 400);
  }
  if (typeof body.read !== 'boolean') return json({ success: false, error: 'Invalid request' }, 400);
  const msg = await setMessageRead(id, body.read);
  if (!msg) return json({ success: false, error: 'Message not found' }, 404);
  return json({ success: true, data: msg }, 200);
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  const { id } = params;
  if (!id) return json({ success: false, error: 'Missing message id' }, 400);
  if (!(await deleteMessage(id))) return json({ success: false, error: 'Message not found' }, 404);
  return json({ success: true }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
