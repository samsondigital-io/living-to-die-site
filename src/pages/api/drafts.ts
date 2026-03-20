import type { APIRoute } from 'astro';
import { listDrafts, saveDraft } from '../../lib/drafts';
import type { CreateDraftInput } from '../../lib/drafts';

/**
 * GET /api/drafts
 * List all newsletter drafts
 *
 * Response:
 * { success: true, data: NewsletterDraft[] }
 */
export const GET: APIRoute = async ({ cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const drafts = await listDrafts();
    return new Response(JSON.stringify({ success: true, data: drafts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error listing drafts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * POST /api/drafts
 * Create a new newsletter draft
 *
 * Request body:
 * {
 *   subject: string,
 *   preheader: string,
 *   issueInfo?: string,
 *   openingParagraph: string,
 *   section1Title: string,
 *   section1Content: string,
 *   section2Title?: string,
 *   section2Content?: string,
 *   ctaUrl?: string,
 *   ctaText?: string,
 *   closingMessage: string,
 *   scheduledFor?: string (ISO date)
 * }
 *
 * Response:
 * { success: true, data: NewsletterDraft }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['subject', 'preheader', 'openingParagraph', 'section1Title', 'section1Content', 'closingMessage'];
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== 'string') {
        return new Response(JSON.stringify({ success: false, error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const draftInput: CreateDraftInput = {
      subject: body.subject,
      preheader: body.preheader,
      issueInfo: body.issueInfo,
      openingParagraph: body.openingParagraph,
      section1Title: body.section1Title,
      section1Content: body.section1Content,
      section2Title: body.section2Title,
      section2Content: body.section2Content,
      ctaUrl: body.ctaUrl,
      ctaText: body.ctaText,
      closingMessage: body.closingMessage,
      scheduledFor: body.scheduledFor,
    };

    const draft = await saveDraft(draftInput);
    return new Response(JSON.stringify({ success: true, data: draft }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
