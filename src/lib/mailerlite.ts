import MailerLite from '@mailerlite/mailerlite-nodejs';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface NewsletterResult {
  success: boolean;
  campaignId?: string;
  error?: string;
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

  // Replace issue info
  if (params.issueInfo) {
    html = html.replace(
      '[ISSUE_NUMBER - e.g., "Issue #1 | March 2026"]',
      params.issueInfo
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

  // Replace section 2 if provided
  if (params.section2Title && params.section2Content) {
    html = html.replace('[SECTION_2_TITLE]', params.section2Title);
    html = html.replace(
      '[SECTION_2_CONTENT - Additional content, news, or reflections. Delete this section if not needed.]',
      params.section2Content
    );
  }

  // Replace CTA if provided
  if (params.ctaUrl && params.ctaText) {
    html = html.replace('[CTA_URL]', params.ctaUrl);
    html = html.replace('[CTA_BUTTON_TEXT]', params.ctaText);
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
    const campaignResponse = await mailerlite.campaigns.create({
      name: `Newsletter: ${params.subject}`,
      type: 'regular',
      emails: [{
        subject: params.subject,
        from_name: 'Diane Melton',
        from: import.meta.env.MAILERLITE_FROM_EMAIL || 'hello@livingtodie.com',
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
      campaignId: String(campaignId)
    };

  } catch (error) {
    console.error('MailerLite API error:', error);

    // Extract error message if available
    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown MailerLite API error';

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
