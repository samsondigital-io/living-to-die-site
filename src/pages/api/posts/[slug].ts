import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../../lib/auth';
import { getBlogPost, updateBlogPost, deleteBlogPost } from '../../../lib/blog';

/**
 * GET    /api/posts/[slug] -> single post
 * PUT    /api/posts/[slug] -> update post
 * DELETE /api/posts/[slug] -> delete post
 */
export const GET: APIRoute = async ({ params, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) return json({ success: false, error: 'Unauthorized' }, 401);
  const { slug } = params;
  if (!slug) return json({ success: false, error: 'Missing slug' }, 400);
  try {
    const post = await getBlogPost(slug);
    if (!post) return json({ success: false, error: 'Post not found' }, 404);
    return json({ success: true, data: post }, 200);
  } catch (error) {
    return json({ success: false, error: msg(error) }, 500);
  }
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) return json({ success: false, error: 'Unauthorized' }, 401);
  const { slug } = params;
  if (!slug) return json({ success: false, error: 'Missing slug' }, 400);
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const field of ['title', 'description', 'bodyHtml', 'tags', 'heroImage', 'author']) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    const post = await updateBlogPost(slug, updates);
    if (!post) return json({ success: false, error: 'Post not found' }, 404);
    return json({ success: true, data: post }, 200);
  } catch (error) {
    return json({ success: false, error: msg(error) }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) return json({ success: false, error: 'Unauthorized' }, 401);
  const { slug } = params;
  if (!slug) return json({ success: false, error: 'Missing slug' }, 400);
  try {
    const deleted = await deleteBlogPost(slug);
    if (!deleted) return json({ success: false, error: 'Post not found' }, 404);
    return json({ success: true }, 200);
  } catch (error) {
    return json({ success: false, error: msg(error) }, 500);
  }
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
function msg(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}
