import type { APIRoute } from 'astro';
import { getApprovedComments, submitComment } from '../../lib/comments';

/**
 * Public comment endpoints.
 * GET  /api/comments?slug=...  -> approved comments for a post
 * POST /api/comments           -> submit a comment (goes to pending for review)
 */
export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  if (!slug) return json({ success: false, error: 'Missing slug' }, 400);
  const comments = await getApprovedComments(slug);
  return json({ success: true, data: comments }, 200);
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid request' }, 400);
  }

  let result;
  try {
    result = await submitComment({
      postSlug: String(body.postSlug ?? ''),
      name: String(body.name ?? ''),
      body: String(body.body ?? ''),
      website: body.website,
      token: body.token,
      ip: clientIp(request),
    });
  } catch (e) {
    console.error('submitComment error:', e);
    return json({ success: false, error: 'Could not save your comment. Please try again.' }, 500);
  }

  if (!result.ok) return json({ success: false, error: result.error }, 400);
  return json({ success: true, pending: true }, 201);
};

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
