import MailerLite from '@mailerlite/mailerlite-nodejs';
import { readFile } from 'fs/promises';
import { join } from 'path';

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
 * Build newsletter HTML from template with content replacements
 */
export function buildNewsletterHtml(
  template: string,
  params: {
    preheader: string;
    issueInfo?: string;
    openingParagraph: string;
    section1Title: string;
    section1Content: string;
    section2Title?: string;
    section2Content?: string;
    ctaUrl?: string;
    ctaText?: string;
    closingMessage: string;
  }
): string {
  let html = template;

  // Replace preheader
  html = html.replace(
    '[PREHEADER_TEXT - Replace with preview text for this issue]',
    params.preheader
  );

  // Replace issue info or remove placeholder
  if (params.issueInfo) {
    html = html.replace(
      '[ISSUE_NUMBER - e.g., "Issue #1 | March 2026"]',
      params.issueInfo
    );
  } else {
    // Remove the issue info line entirely
    html = html.replace(
      /<p style="margin: 10px[^>]*>\s*\[ISSUE_NUMBER[^\]]*\]\s*<\/p>/,
      ''
    );
  }

  // Replace opening paragraph
  html = html.replace(
    '[OPENING_PARAGRAPH - A personal greeting or introduction to this issue\'s theme]',
    params.openingParagraph
  );

  // Replace section 1
  html = html.replace('[SECTION_1_TITLE]', params.section1Title);
  html = html.replace(
    '[SECTION_1_CONTENT - Main content for this section. Can include reflections, updates, excerpts, or stories.]',
    params.section1Content
  );

  // Replace section 2 if provided, otherwise remove the entire section
  if (params.section2Title && params.section2Content) {
    html = html.replace('[SECTION_2_TITLE]', params.section2Title);
    html = html.replace(
      '[SECTION_2_CONTENT - Additional content, news, or reflections. Delete this section if not needed.]',
      params.section2Content
    );
  } else {
    // Remove the entire section 2 block (including divider before it)
    html = html.replace(
      /<!-- Divider -->[\s\S]*?<!-- Content Section 2 \(Optional\) -->[\s\S]*?<\/tr>\s*(?=<!-- Optional CTA Button -->)/,
      ''
    );
  }

  // Replace CTA if provided, otherwise remove the entire CTA block
  if (params.ctaUrl && params.ctaText) {
    html = html.replace('[CTA_URL]', params.ctaUrl);
    html = html.replace('[CTA_BUTTON_TEXT]', params.ctaText);
  } else {
    // Remove the entire CTA button block
    html = html.replace(
      /<!-- Optional CTA Button -->[\s\S]*?<\/tr>\s*(?=<!-- Closing -->)/,
      ''
    );
  }

  // Replace closing message
  html = html.replace(
    '[CLOSING_MESSAGE - A warm sign-off appropriate to this issue\'s content]',
    params.closingMessage
  );

  return html;
}

/**
 * Create and immediately send a newsletter campaign via MailerLite
 *
 * This function:
 * 1. Creates a campaign with the provided HTML content
 * 2. Schedules it for immediate delivery to the Book Updates group
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

  const groupId = import.meta.env.MAILERLITE_GROUP_ID;

  if (!groupId) {
    return {
      success: false,
      error: 'MailerLite group ID not configured'
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
      groups: [groupId],
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

/**
 * Convenience function: Load template, build HTML, and send
 */
export async function sendNewsletterFromTemplate(
  subject: string,
  preheader: string,
  content: {
    issueInfo?: string;
    openingParagraph: string;
    section1Title: string;
    section1Content: string;
    section2Title?: string;
    section2Content?: string;
    ctaUrl?: string;
    ctaText?: string;
    closingMessage: string;
  }
): Promise<NewsletterResult> {
  try {
    const template = await getNewsletterTemplate();
    const htmlContent = buildNewsletterHtml(template, {
      preheader,
      ...content
    });

    return await createAndSendNewsletter({
      subject,
      preheader,
      htmlContent
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process template'
    };
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
    const res: any = await ml.campaigns.get({ filter: { status: 'sent' } });
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
