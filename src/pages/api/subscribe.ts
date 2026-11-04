import type { APIRoute } from 'astro';
import { subscribeEmail } from '../../lib/mailerlite';
import { buildSignupFields, type SignupFields } from '../../lib/signup-source';

/**
 * POST /api/subscribe
 *
 * Subscribe an email address to the newsletter. Accepts JSON ({ email }) or
 * form-encoded (email=) bodies. Creates the subscriber directly in MailerLite
 * with no group and no double opt-in (single opt-in).
 *
 * JSON bodies may also carry where the visitor came from (form, referrer,
 * utm_*, landing — see attribution-client.ts); it's cleaned and stored on the
 * subscriber as signup_* custom fields.
 */
export const POST: APIRoute = async ({ request }) => {
  let email = '';
  let fields: SignupFields;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = typeof body?.email === 'string' ? body.email.trim() : '';
      fields = buildSignupFields(body);
    } else {
      // No-JavaScript form post: no origin info, but still record the visit as unknown.
      const form = await request.formData();
      email = String(form.get('email') ?? '').trim();
      fields = buildSignupFields({});
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

  const result = await subscribeEmail(email, fields);
  if (!result.success) {
    return json({ success: false, error: result.error ?? 'Something went wrong.' }, 500);
  }

  return json({ success: true }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
