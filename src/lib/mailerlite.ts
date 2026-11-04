import MailerLite from '@mailerlite/mailerlite-nodejs';

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
 *
 * `signupFields` records where they came from. Someone already on the list
 * keeps their original signup_* values rather than having them overwritten.
 */
export async function subscribeEmail(
  email: string,
  signupFields?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const ml = getMailerLiteClient();
  if (!ml) return { success: false, error: 'MailerLite not configured' };
  try {
    let fields = signupFields;
    if (fields) {
      const existing: any = await ml.subscribers.find(email).catch(() => null);
      if (existing?.data?.data?.fields?.signup_source) fields = undefined;
    }
    await ml.subscribers.createOrUpdate({ email, status: 'active', ...(fields ? { fields } : {}) });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: mailerliteErrorMessage(error, 'Subscribe failed') };
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
  /** Active subscribers who joined after the most recent newsletter was sent. */
  newSinceLastCampaign: number | null;
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
  /** Where they came from (signup_* custom fields); null for people who joined before tracking. */
  signupSource: string | null;
  signupForm: string | null;
  signupReferrer: string | null;
  signupLanding: string | null;
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
    signupSource: s?.fields?.signup_source || null,
    signupForm: s?.fields?.signup_form || null,
    signupReferrer: s?.fields?.signup_referrer || null,
    signupLanding: s?.fields?.signup_landing_page || null,
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
    return { subscriberCount: null, newSinceLastCampaign: null, lastCampaign: null, recentCampaigns: [], configured: false };
  }
  const [subscriberCount, recentCampaigns, subscribers] = await Promise.all([
    getSubscriberCount(),
    getRecentCampaigns(5),
    getSubscribers(),
  ]);
  return {
    subscriberCount,
    newSinceLastCampaign: countJoinedSince(subscribers, recentCampaigns[0]?.sentAt ?? null),
    lastCampaign: recentCampaigns[0] ?? null,
    recentCampaigns,
    configured: true,
  };
}

/* ---------------------------------------------------------------------------
 * Sent campaigns → blog. Unlike the dashboard helpers these throw on failure,
 * so the webhook can return an error and let MailerLite retry.
 * ------------------------------------------------------------------------- */

/** A sent campaign's email, as needed to republish it on the blog. */
export interface SentCampaignEmail {
  campaignId: string;
  subject: string;
  preheader: string;
  html: string;
  /** ISO timestamp the send finished, or null if MailerLite doesn't say. */
  sentAt: string | null;
}

/** MailerLite returns "2026-11-02 16:43:47" (UTC); make it ISO. */
function toIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  return Number.isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString();
}

/** Fetch a sent campaign with its email HTML. Returns null if it isn't a sent campaign. */
export async function getSentCampaignEmail(campaignId: string): Promise<SentCampaignEmail | null> {
  const ml = getMailerLiteClient();
  if (!ml) throw new Error('MailerLite not configured');
  try {
    const res: any = await ml.campaigns.find(campaignId);
    const c = res?.data?.data;
    if (!c || c.status !== 'sent') return null;
    const email = c.emails?.[0];
    if (!email?.content) return null;
    return {
      campaignId: String(c.id),
      subject: email.subject ?? c.name ?? '',
      preheader: email.preheader ?? '',
      html: email.content,
      sentAt: toIso(c.finished_at ?? c.started_at ?? c.scheduled_for),
    };
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw new Error(mailerliteErrorMessage(error, 'Failed to fetch campaign'));
  }
}

/** IDs of every sent campaign, oldest first. */
export async function listSentCampaignIds(): Promise<string[]> {
  const ml = getMailerLiteClient();
  if (!ml) throw new Error('MailerLite not configured');
  const rows: { id: string; at: string }[] = [];
  try {
    for (let page = 1; page <= 50; page++) {
      const res: any = await ml.campaigns.get({ filter: { status: 'sent' }, limit: 100, page });
      const list: any[] = res?.data?.data ?? [];
      for (const c of list) rows.push({ id: String(c.id), at: toIso(c.finished_at) ?? '' });
      const last = res?.data?.meta?.last_page ?? 1;
      if (page >= last || list.length === 0) break;
    }
  } catch (error: any) {
    throw new Error(mailerliteErrorMessage(error, 'Failed to list campaigns'));
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at)).map((r) => r.id);
}

/**
 * Active subscribers who joined after `since` (a MailerLite timestamp).
 * Null when there's no newsletter to measure from or no subscriber data.
 */
function countJoinedSince(subscribers: SubscriberRow[], since: string | null): number | null {
  const sinceIso = toIso(since);
  if (!sinceIso || subscribers.length === 0) return null;
  return subscribers.filter((s) => {
    const joined = toIso(s.subscribedAt);
    return s.status === 'active' && joined !== null && joined > sinceIso;
  }).length;
}
