import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { getCampaignActivity } from '../../lib/mailerlite';

/**
 * GET /api/campaign-activity?id=<campaignId>&type=<opened|clicked|unopened|unsubscribed|...>&page=<n>
 * Returns per-subscriber activity for a single sent campaign.
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  const id = url.searchParams.get('id');
  if (!id) return json({ success: false, error: 'Missing campaign id' }, 400);
  const type = url.searchParams.get('type') || undefined;
  const search = url.searchParams.get('search') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);

  const result = await getCampaignActivity(id, type, search, page);
  if (!result) return json({ success: false, error: 'Could not load activity' }, 502);
  return json({ success: true, ...result }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
