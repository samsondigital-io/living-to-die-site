import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { getRecentCampaigns } from '../../lib/mailerlite';

/** GET /api/campaigns — list sent campaigns for the subscribers drill-down. */
export const GET: APIRoute = async ({ cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  const data = await getRecentCampaigns(100);
  return json({ success: true, data }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
