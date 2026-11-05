import type { APIRoute } from 'astro';
import { submitMessage } from '../../lib/messages';

/**
 * POST /api/contact — the public contact form.
 * Accepts JSON (the page's script) or a plain form post (no JavaScript), in
 * which case the visitor is redirected back to /contact with the outcome.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  const isJson = (request.headers.get('content-type') || '').includes('application/json');
  let body: Record<string, unknown>;
  try {
    body = isJson ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return isJson ? json({ success: false, error: 'Invalid request' }, 400) : redirect('/contact?sent=error', 303);
  }

  const result = await submitMessage({
    fields: body,
    website: body.website,
    token: body.token,
    ip: clientIp(request),
  });

  if (!isJson) return redirect(result.ok ? '/contact?sent=1' : '/contact?sent=error', 303);
  return result.ok ? json({ success: true }, 201) : json({ success: false, error: result.error }, 400);
};

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
