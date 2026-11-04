import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { importAllSentCampaigns } from '../../lib/newsletter-import';

/**
 * POST /api/import-newsletters (admin)
 *
 * Publishes every sent MailerLite campaign that isn't on the blog yet. Used to
 * bring in newsletters sent before the webhook existed, or any the webhook missed.
 */
export const POST: APIRoute = async ({ cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  try {
    const results = await importAllSentCampaigns();
    const imported = results.filter((r) => r.status === 'imported');
    return json({ success: true, imported }, 200);
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'Import failed' }, 500);
  }
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
