import type { APIRoute } from 'astro';
import { subscribeEmail } from '../../lib/mailerlite';

/**
 * POST /api/subscribe
 *
 * Subscribe an email address to the newsletter. Accepts JSON ({ email }) or
 * form-encoded (email=) bodies. Creates the subscriber directly in MailerLite
 * with no group and no double opt-in (single opt-in).
 */
export const POST: APIRoute = async ({ request }) => {
  let email = '';

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = typeof body?.email === 'string' ? body.email.trim() : '';
    } else {
      const form = await request.formData();
      email = String(form.get('email') ?? '').trim();
    }
  } catch {
    return json({ success: false, error: 'Invalid request.' }, 400);
  }

  if (!email) {
    return json({ success: false, error: 'Please enter your email address.' }, 400);
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: false, error: 'That email address looks invalid.' }, 400);
  }

  const result = await subscribeEmail(email);
  if (!result.success) {
    return json({ success: false, error: result.error ?? 'Something went wrong.' }, 500);
  }

  return json({ success: true }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
