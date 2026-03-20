import type { APIRoute } from 'astro';
import { listDrafts, updateDraft } from '../../lib/drafts';
import { sendNewsletterFromTemplate } from '../../lib/mailerlite';

/**
 * Vercel Cron endpoint for sending scheduled newsletters
 * Runs every 15 minutes to check for newsletters ready to send
 *
 * Configure in vercel.json with schedule: every 15 minutes
 */
export const GET: APIRoute = async ({ request }) => {
  // Optional: Verify this is from Vercel Cron (recommended for production)
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const now = new Date();
  const results: Array<{ id: string; success: boolean; campaignId?: string; error?: string }> = [];

  try {
    // Get all drafts and filter for scheduled ones
    const allDrafts = await listDrafts();
    const scheduledDrafts = allDrafts.filter(draft => {
      if (draft.status !== 'scheduled' || !draft.scheduledFor) {
        return false;
      }
      const scheduledDate = new Date(draft.scheduledFor);
      return scheduledDate <= now;
    });

    console.log(`[send-scheduled] Found ${scheduledDrafts.length} newsletters ready to send`);

    for (const draft of scheduledDrafts) {
      console.log(`[send-scheduled] Sending: ${draft.subject}`);

      try {
        const result = await sendNewsletterFromTemplate(
          draft.subject,
          draft.preheader,
          {
            issueInfo: draft.issueInfo,
            openingParagraph: draft.openingParagraph,
            section1Title: draft.section1Title,
            section1Content: draft.section1Content,
            section2Title: draft.section2Title,
            section2Content: draft.section2Content,
            ctaUrl: draft.ctaUrl,
            ctaText: draft.ctaText,
            closingMessage: draft.closingMessage,
          }
        );

        if (result.success) {
          // Mark as sent
          await updateDraft(draft.id, { status: 'sent' });
          results.push({ id: draft.id, success: true, campaignId: result.campaignId });
          console.log(`[send-scheduled] Sent successfully: ${draft.id}`);
        } else {
          results.push({ id: draft.id, success: false, error: result.error });
          console.error(`[send-scheduled] Failed to send ${draft.id}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ id: draft.id, success: false, error: errorMessage });
        console.error(`[send-scheduled] Error sending ${draft.id}:`, error);
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      results,
      timestamp: now.toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[send-scheduled] Fatal error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process scheduled sends',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
