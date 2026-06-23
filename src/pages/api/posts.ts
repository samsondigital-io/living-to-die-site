import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { listBlogPosts, createBlogPost } from '../../lib/blog';

/**
 * GET  /api/posts  -> list all blog posts (admin)
 * POST /api/posts  -> create a free-form blog post (no email sent)
 *
 * Body for POST:
 * { title, description, bodyHtml, tags?: string[], heroImage?, author? }
 */
export const GET: APIRoute = async ({ cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  try {
    const posts = await listBlogPosts();
    return json({ success: true, data: posts }, 200);
  } catch (error) {
    return json({ success: false, error: msg(error) }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== 'string') {
      return json({ success: false, error: 'Title is required' }, 400);
    }
    if (!body.bodyHtml || typeof body.bodyHtml !== 'string') {
      return json({ success: false, error: 'Post content is required' }, 400);
    }
    const post = await createBlogPost({
      title: body.title,
      description: body.description || '',
      bodyHtml: body.bodyHtml,
      tags: Array.isArray(body.tags) ? body.tags : [],
      heroImage: body.heroImage,
      author: body.author,
    });
    return json({ success: true, data: post }, 201);
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
