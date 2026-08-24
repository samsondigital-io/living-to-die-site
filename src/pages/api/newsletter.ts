import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { buildAndSendNewsletter, derivePreheader } from '../../lib/mailerlite';
import { publishPostFromNewsletter } from '../../lib/blog';
import { sanitizeBodyHtml } from '../../lib/sanitize';

/**
 * POST /api/newsletter
 *
 * Send a newsletter to all subscribers. The author provides a subject line and
 * a single free-form HTML body; the branded wrapper (header, greeting,
 * signature, unsubscribe footer) is added server-side. On success the issue is
 * also autopublished to the blog.
 *
 * Body: { subject, bodyHtml, title?, preheader?, tags?, heroImage? }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const body = await request.json();
    if (!body.subject || typeof body.subject !== 'string') {
      return json({ success: false, error: 'A subject line is required.' }, 400);
    }
    if (!body.bodyHtml || typeof body.bodyHtml !== 'string') {
      return json({ success: false, error: 'The newsletter is empty.' }, 400);
    }

    const bodyHtml = sanitizeBodyHtml(body.bodyHtml);
    const preheader = typeof body.preheader === 'string' && body.preheader.trim()
      ? body.preheader.trim()
      : derivePreheader(bodyHtml, body.subject);

    const result = await buildAndSendNewsletter({ subject: body.subject, preheader, bodyHtml });

    if (!result.success) {
      return json({ success: false, error: result.error }, 500);
    }

    // Autopublish to the blog (best-effort; a failure here must NOT fail the
    // send, which already succeeded).
    try {
      await publishPostFromNewsletter({
        subject: body.subject,
        title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : undefined,
        preheader,
        bodyHtml,
        tags: Array.isArray(body.tags) ? body.tags : [],
        heroImage: body.heroImage,
        sentAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Autopublish to blog failed (send succeeded):', e);
    }

    return json({ success: true, campaignId: result.campaignId }, 200);
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
