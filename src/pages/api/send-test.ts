import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { sendTestEmail, derivePreheader } from '../../lib/mailerlite';
import { sanitizeBodyHtml } from '../../lib/sanitize';

/**
 * POST /api/send-test
 * Send a test copy of the newsletter to a specific address (defaults to the
 * author's own inbox) before sending to the full list.
 *
 * Body: { subject, bodyHtml, preheader?, email }
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
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return json({ success: false, error: 'Enter an email address to send the test to.' }, 400);
    }

    const bodyHtml = sanitizeBodyHtml(body.bodyHtml);
    const preheader = typeof body.preheader === 'string' && body.preheader.trim()
      ? body.preheader.trim()
      : derivePreheader(bodyHtml, body.subject);

    const result = await sendTestEmail({ subject: body.subject, preheader, bodyHtml, emails: [email] });
    if (!result.success) return json({ success: false, error: result.error }, 500);
    return json({ success: true }, 200);
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
