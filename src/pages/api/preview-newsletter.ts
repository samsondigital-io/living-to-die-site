import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { derivePreheader, renderNewsletterHtml } from '../../lib/mailerlite';
import { sanitizeBodyHtml } from '../../lib/sanitize';

/**
 * POST /api/preview-newsletter
 * Returns the fully-assembled email HTML (branded wrapper + body) so the
 * composer can show an exact in-iframe preview. Personalization variables are
 * swapped for realistic sample values.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const { subject, bodyHtml, preheader } = await request.json();
    if (!bodyHtml || typeof bodyHtml !== 'string') {
      return json({ success: false, error: 'Nothing to preview.' }, 400);
    }

    const clean = sanitizeBodyHtml(bodyHtml);
    const ph = typeof preheader === 'string' && preheader.trim()
      ? preheader.trim()
      : derivePreheader(clean, subject || 'Newsletter');

    let html = await renderNewsletterHtml({ preheader: ph, bodyHtml: clean });
    html = html.replace(/\{\$name\}/g, 'Diane').replace(/\{\$unsubscribe\}/g, '#');

    return json({ success: true, html }, 200);
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'Preview failed' }, 500);
  }
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
