import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
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
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
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
 *   title?: string,
 *   preheader?: string,
 *   bodyHtml: string,
 *   tags?: string[],
 *   heroImage?: string
 * }
 *
 * Response:
 * { success: true, data: NewsletterDraft }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  // Check authentication
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['subject', 'bodyHtml'];
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
      title: body.title,
      preheader: body.preheader,
      bodyHtml: body.bodyHtml,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      heroImage: body.heroImage,
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
