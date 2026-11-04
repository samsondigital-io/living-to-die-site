import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'crypto';
import { importCampaign } from '../../lib/newsletter-import';

/**
 * POST /api/mailerlite-webhook
 *
 * Called by MailerLite when a campaign is sent (`campaign.sent`); publishes
 * that newsletter to the blog. Requests are authenticated with the webhook's
 * signing secret (MAILERLITE_WEBHOOK_SECRET): MailerLite sends an HMAC-SHA256
 * of the raw JSON body in the `Signature` header.
 *
 * MailerLite retries non-2xx responses (after 10s, 100s, 1000s), so we return
 * 500 only for failures worth retrying; importing is idempotent.
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.MAILERLITE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('mailerlite-webhook: MAILERLITE_WEBHOOK_SECRET is not set');
    return json({ ok: false, error: 'Webhook not configured' }, 500);
  }

  const raw = await request.text();
  if (!validSignature(raw, request.headers.get('signature'), secret)) {
    return json({ ok: false, error: 'Invalid signature' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  // Payloads are a single event, or `{ events: [...] }` when batched.
  const events: any[] = Array.isArray(payload?.events) ? payload.events : [payload];
  const results = [];
  try {
    for (const event of events) {
      if (event?.event !== 'campaign.sent' || !event?.id) continue;
      results.push(await importCampaign(String(event.id)));
    }
  } catch (error) {
    console.error('mailerlite-webhook: import failed', error);
    return json({ ok: false, error: 'Import failed' }, 500);
  }
  return json({ ok: true, results }, 200);
};

function validSignature(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'));
  const given = Buffer.from(header.trim().toLowerCase());
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
