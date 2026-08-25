import MailerLite from '@mailerlite/mailerlite-nodejs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { stripHtml } from './sanitize';

interface NewsletterResult {
  success: boolean;
  campaignId?: string;
  error?: string;
  /** The final HTML that was sent — used to autopublish the issue to the blog. */
  htmlContent?: string;
}

interface NewsletterParams {
  subject: string;
  preheader: string;
  htmlContent: string; // Full HTML content (already processed with template)
}

/**
 * Get configured MailerLite client
 * Requires MAILERLITE_API_KEY environment variable
 */
function getMailerLiteClient(): MailerLite | null {
  const apiKey = import.meta.env.MAILERLITE_API_KEY;

  if (!apiKey) {
    console.error('MailerLite API key not configured');
    return null;
  }

  return new MailerLite({
    api_key: apiKey
  });
}

/**
 * Read the newsletter email template
 */
async function getNewsletterTemplate(): Promise<string> {
  try {
    // In production/build, templates are in the project root
    const templatePath = join(process.cwd(), 'email-templates', 'newsletter.html');
    return await readFile(templatePath, 'utf-8');
  } catch (error) {
    console.error('Failed to read newsletter template:', error);
    throw new Error('Newsletter template not found');
  }
}

/**
 * Wrap a newsletter body in the branded email template. The template supplies
 * the header, "Dear {$name}," greeting, signature, and unsubscribe footer; the
 * body is injected verbatim.
 */
export function buildNewsletterHtml(
  template: string,
  params: { preheader: string; bodyHtml: string }
): string {
  return template
    .replace('{{PREHEADER}}', params.preheader)
    .replace('{{CONTENT}}', params.bodyHtml);
}

/** Derive inbox preview text from the first sentence(s) of the body. */
export function derivePreheader(bodyHtml: string, fallback = ''): string {
  const text = stripHtml(bodyHtml);
  if (!text) return fallback;
  const first = text.slice(0, 140);
  return first.length < text.length ? `${first}…` : first;
}

/** Read the template and wrap the body — used by send, test, and preview. */
export async function renderNewsletterHtml(params: {
  preheader: string;
  bodyHtml: string;
}): Promise<string> {
  const template = await getNewsletterTemplate();
  return buildNewsletterHtml(template, params);
}

/**
 * Create and immediately send a newsletter campaign via MailerLite.
 *
 * This function:
 * 1. Creates a campaign with the provided HTML content
 * 2. Schedules it for immediate delivery to all active subscribers
 *
 * The HTML content must include the {$unsubscribe} placeholder for MailerLite.
 */
export async function createAndSendNewsletter(
  params: NewsletterParams
): Promise<NewsletterResult> {
  const mailerlite = getMailerLiteClient();

  if (!mailerlite) {
    return {
      success: false,
      error: 'MailerLite not configured - missing API key'
    };
  }

  try {
    // Step 1: Create the campaign
    // Note: from email must be verified in MailerLite. No fallback: if the
    // sender isn't configured, refuse to send rather than send from a wrong address.
    const fromEmail = import.meta.env.MAILERLITE_FROM_EMAIL;
    const fromName = import.meta.env.MAILERLITE_FROM_NAME || 'Diane Melton';

    if (!fromEmail) {
      return {
        success: false,
        error: 'MailerLite sender email (MAILERLITE_FROM_EMAIL) not configured'
      };
    }

    const campaignResponse = await mailerlite.campaigns.create({
      name: `Newsletter: ${params.subject}`,
      type: 'regular',
      emails: [{
        subject: params.subject,
        from_name: fromName,
        from: fromEmail,
        content: params.htmlContent,
      }],
    });

    const campaignId = campaignResponse.data?.data?.id;

    if (!campaignId) {
      return {
        success: false,
        error: 'Failed to create campaign - no ID returned'
      };
    }

    // Step 2: Schedule for immediate delivery
    await mailerlite.campaigns.schedule(String(campaignId), {
      delivery: 'instant'
    });

    return {
      success: true,
      campaignId: String(campaignId),
      htmlContent: params.htmlContent
    };

  } catch (error: any) {
    console.error('MailerLite API error:', error);

    // Extract detailed error info from MailerLite response
    let errorMessage = 'Unknown MailerLite API error';

    if (error?.response?.data) {
      console.error('MailerLite response data:', JSON.stringify(error.response.data, null, 2));
      errorMessage = error.response.data.message || JSON.stringify(error.response.data);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/** Build the full email from the template and send it immediately. */
export async function buildAndSendNewsletter(input: {
  subject: string;
  preheader: string;
  bodyHtml: string;
}): Promise<NewsletterResult> {
  try {
    const htmlContent = await renderNewsletterHtml({
      preheader: input.preheader,
      bodyHtml: input.bodyHtml,
    });
    return await createAndSendNewsletter({
      subject: input.subject,
      preheader: input.preheader,
      htmlContent,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process template',
    };
  }
}

/**
 * Extract a readable message from a MailerLite (axios) error. The SDK wraps the
 * API's 4xx responses in an AxiosError whose message is just "Request failed
 * with status code NNN", so we pull the real reason out of `response.data`.
 */
function mailerliteErrorMessage(error: any, fallback = 'MailerLite API error'): string {
  if (error?.response?.data) {
    const data = error.response.data;
    if (typeof data?.message === 'string' && data.message) return data.message;
    return JSON.stringify(data);
  }
  return error instanceof Error ? error.message : fallback;
}

/**
 * Subscribe an email to the account's subscriber list. No group, single opt-in:
 * the subscriber is created as `active`, so no confirmation email is sent.
 */
export async function subscribeEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const ml = getMailerLiteClient();
  if (!ml) return { success: false, error: 'MailerLite not configured' };
  try {
    await ml.subscribers.createOrUpdate({ email, status: 'active' });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: mailerliteErrorMessage(error, 'Subscribe failed') };
  }
}

/**
 * Send a test copy of the newsletter to specific addresses (e.g. the author's
 * own inbox). The MailerLite API has no dedicated "send test" endpoint, so this
 * creates a throwaway group containing only the test recipients, creates and
 * immediately sends a campaign to that group, then deletes both in `finally`.
 */
export async function sendTestEmail(input: {
  subject: string;
  preheader: string;
  bodyHtml: string;
  emails: string[];
}): Promise<NewsletterResult> {
  const fromEmail = import.meta.env.MAILERLITE_FROM_EMAIL;
  const fromName = import.meta.env.MAILERLITE_FROM_NAME || 'Diane Melton';
  const ml = getMailerLiteClient();

  if (!ml) return { success: false, error: 'MailerLite not configured' };
  if (!fromEmail) return { success: false, error: 'MailerLite sender email (MAILERLITE_FROM_EMAIL) not configured' };

  let testGroupId: string | undefined;
  let campaignId: string | undefined;

  try {
    const htmlContent = await renderNewsletterHtml({
      preheader: input.preheader,
      bodyHtml: input.bodyHtml,
    });

    // 1. Throwaway group that only contains the test recipients.
    const groupRes = await ml.groups.create({ name: `Test send ${Date.now()}` });
    testGroupId = groupRes.data?.data?.id;
    if (!testGroupId) return { success: false, error: 'Failed to create test group' };

    // 2. Add each test recipient as an active subscriber of that group (active
    //    so no double opt-in delays the test).
    for (const email of input.emails) {
      await ml.subscribers.createOrUpdate({ email, groups: [testGroupId], status: 'active' });
    }

    // 3. Create the campaign against the throwaway group and send it now.
    const created = await ml.campaigns.create({
      name: `Test: ${input.subject}`,
      type: 'regular',
      emails: [{ subject: input.subject, from_name: fromName, from: fromEmail, content: htmlContent }],
      groups: [testGroupId],
    });
    campaignId = created.data?.data?.id;
    if (!campaignId) return { success: false, error: 'Failed to create test campaign' };

    await ml.campaigns.schedule(String(campaignId), { delivery: 'instant' });

    return { success: true };
  } catch (error: any) {
    console.error('sendTestEmail failed:', error?.response?.data ?? error);
    return { success: false, error: mailerliteErrorMessage(error, 'Test send failed') };
  } finally {
    // Clean up the throwaway campaign and group regardless of outcome.
    if (campaignId) await ml.campaigns.delete(String(campaignId)).catch(() => {});
    if (testGroupId) await ml.groups.delete(String(testGroupId)).catch(() => {});
  }
}

/* ---------------------------------------------------------------------------
 * Dashboard stats (read-only). All helpers fail soft: on any error or missing
 * config they return null/empty so the admin dashboard never crashes.
 * ------------------------------------------------------------------------- */

export interface CampaignStat {
  id: string;
  name: string;
  subject: string;
  sentAt: string | null;
  recipients: number | null;
  openRate: string | null; // e.g. "42.50%"
  clickRate: string | null;
}

export interface DashboardStats {
  subscriberCount: number | null;
  lastCampaign: CampaignStat | null;
  recentCampaigns: CampaignStat[];
  configured: boolean;
}

function pct(v: any): string | null {
  // open_rate/click_rate come as { float, string } on most endpoints; be defensive.
  if (v == null) return null;
  if (typeof v === 'object') {
    if (typeof v.string === 'string') return v.string;
    if (typeof v.float === 'number') return `${(v.float * (v.float <= 1 ? 100 : 1)).toFixed(1)}%`;
  }
  if (typeof v === 'number') return `${(v <= 1 ? v * 100 : v).toFixed(1)}%`;
  return null;
}

function toCampaignStat(c: any): CampaignStat {
  const s = c?.stats ?? {};
  return {
    id: String(c?.id ?? ''),
    name: c?.name ?? c?.emails?.[0]?.subject ?? 'Untitled',
    subject: c?.emails?.[0]?.subject ?? c?.name ?? 'Untitled',
    sentAt: c?.finished_at ?? c?.sent_at ?? c?.scheduled_for ?? null,
    recipients: typeof s.sent === 'number' ? s.sent : (typeof c?.sent === 'number' ? c.sent : null),
    openRate: pct(s.open_rate),
    clickRate: pct(s.click_rate),
  };
}

/** Total subscriber count, or null on error/unconfigured. */
export async function getSubscriberCount(): Promise<number | null> {
  const ml = getMailerLiteClient();
  if (!ml) return null;
  try {
    const res: any = await ml.subscribers.getCount();
    const total = res?.data?.total ?? res?.total ?? res?.data?.data?.total;
    return typeof total === 'number' ? total : null;
  } catch (error) {
    console.error('getSubscriberCount failed:', error);
    return null;
  }
}

/** Recent sent campaigns with their stats (most recent first). */
export async function getRecentCampaigns(limit = 5): Promise<CampaignStat[]> {
  const ml = getMailerLiteClient();
  if (!ml) return [];
  try {
    // The campaigns endpoint with a `sent` status filter reliably returns
    // campaigns WITH their full stats object (the stats.getSentCampaigns
    // wrapper 422s without a specific filter).
    const res: any = await ml.campaigns.get({ filter: { status: 'sent' }, limit: Math.min(Math.max(limit, 1), 100) });
    const list: any[] = res?.data?.data ?? res?.data ?? [];
    return list
      .map(toCampaignStat)
      .sort((a, b) => {
        const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('getRecentCampaigns failed:', error);
    return [];
  }
}

export interface SubscriberRow {
  id: string;
  email: string;
  name: string | null;
  status: string; // active | unsubscribed | unconfirmed | bounced | junk
  source: string | null;
  subscribedAt: string | null;
  opensCount: number | null;
  clicksCount: number | null;
  openRate: string | null;
  clickRate: string | null;
}

function toSubscriberRow(s: any): SubscriberRow {
  const fullName = [s?.fields?.name, s?.fields?.last_name].filter(Boolean).join(' ');
  return {
    id: String(s?.id ?? ''),
    email: s?.email ?? '',
    name: fullName || null,
    status: s?.status ?? 'unknown',
    source: s?.source ?? null,
    subscribedAt: s?.subscribed_at ?? s?.created_at ?? null,
    opensCount: typeof s?.opens_count === 'number' ? s.opens_count : null,
    clicksCount: typeof s?.clicks_count === 'number' ? s.clicks_count : null,
    openRate: pct(s?.open_rate),
    clickRate: pct(s?.click_rate),
  };
}

/**
 * All subscribers, newest first. Pages through MailerLite's cursor API,
 * fail-soft to an empty list. Capped at `max` rows as a runaway guard.
 */
export async function getSubscribers(max = 2000): Promise<SubscriberRow[]> {
  const ml = getMailerLiteClient();
  if (!ml) return [];
  const rows: SubscriberRow[] = [];
  try {
    let cursor: string | undefined;
    for (let page = 0; page < Math.ceil(max / 100); page++) {
      const params: any = { limit: 100 };
      if (cursor) params.cursor = cursor;
      const res: any = await ml.subscribers.get(params);
      const list: any[] = res?.data?.data ?? res?.data ?? [];
      rows.push(...list.map(toSubscriberRow));
      cursor = res?.data?.meta?.next_cursor ?? undefined;
      if (!cursor || list.length === 0 || rows.length >= max) break;
    }
  } catch (error) {
    console.error('getSubscribers failed:', error);
  }
  return rows
    .slice(0, max)
    .sort((a, b) => {
      const ta = a.subscribedAt ? new Date(a.subscribedAt).getTime() : 0;
      const tb = b.subscribedAt ? new Date(b.subscribedAt).getTime() : 0;
      return tb - ta;
    });
}

export interface CampaignActivityRow {
  email: string;
  name: string | null;
  opensCount: number;
  clicksCount: number;
}

export interface CampaignActivityPage {
  rows: CampaignActivityRow[];
  counts: Record<string, number> | null;
  total: number;
  page: number;
  hasMore: boolean;
}

/**
 * Per-subscriber activity for a single sent campaign. `type` is a MailerLite
 * activity filter ("opened", "clicked", "unopened", "unsubscribed", etc.);
 * omit it for all activity. The response also carries summary counts per type
 * so the UI can show "Opened (42)" style labels.
 */
export async function getCampaignActivity(
  campaignId: string,
  type?: string,
  search = '',
  page = 1,
  limit = 100
): Promise<CampaignActivityPage | null> {
  const ml = getMailerLiteClient();
  if (!ml) return null;
  try {
    const params: any = { include: 'subscriber', limit, page };
    if (type && type !== 'all') {
      params.filter = { type, ...(search ? { search } : {}) };
    } else if (search) {
      params.filter = { search };
    }
    const res: any = await ml.stats.getSentCampaignSubscribers(campaignId, params);
    const list: any[] = res?.data?.data ?? [];
    const counts: Record<string, number> | null = res?.data?.meta?.counts ?? null;
    const total: number = res?.data?.meta?.total ?? list.length;
    const rows: CampaignActivityRow[] = list.map((a: any) => {
      const sub = a?.subscriber ?? {};
      const name = [sub?.fields?.name, sub?.fields?.last_name].filter(Boolean).join(' ') || null;
      return {
        email: sub?.email ?? '',
        name,
        opensCount: typeof a?.opens_count === 'number' ? a.opens_count : 0,
        clicksCount: typeof a?.clicks_count === 'number' ? a.clicks_count : 0,
      };
    });
    return { rows, counts, total, page, hasMore: page * limit < total };
  } catch (error) {
    console.error('getCampaignActivity failed:', error);
    return null;
  }
}

/** Everything the admin dashboard needs, gathered in parallel and fail-soft. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const apiKey = import.meta.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return { subscriberCount: null, lastCampaign: null, recentCampaigns: [], configured: false };
  }
  const [subscriberCount, recentCampaigns] = await Promise.all([
    getSubscriberCount(),
    getRecentCampaigns(5),
  ]);
  return {
    subscriberCount,
    lastCampaign: recentCampaigns[0] ?? null,
    recentCampaigns,
    configured: true,
  };
}
