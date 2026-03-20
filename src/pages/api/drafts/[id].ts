import type { APIRoute } from 'astro';
import { getDraft, updateDraft, deleteDraft } from '../../../lib/drafts';
import type { UpdateDraftInput } from '../../../lib/drafts';

/**
 * GET /api/drafts/[id]
 * Get a single draft by ID
 *
 * Response:
 * { success: true, data: NewsletterDraft }
 * or
 * { success: false, error: 'Not found' } (404)
 */
export const GET: APIRoute = async ({ params, cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Missing draft ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const draft = await getDraft(id);
    if (!draft) {
      return new Response(JSON.stringify({ success: false, error: 'Draft not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data: draft }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * PUT /api/drafts/[id]
 * Update an existing draft
 *
 * Request body: Partial draft fields to update
 *
 * Response:
 * { success: true, data: NewsletterDraft }
 * or
 * { success: false, error: 'Not found' } (404)
 */
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Missing draft ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    // Build update object from allowed fields
    const updates: UpdateDraftInput = {};
    const allowedFields = [
      'subject', 'preheader', 'issueInfo', 'openingParagraph',
      'section1Title', 'section1Content', 'section2Title', 'section2Content',
      'ctaUrl', 'ctaText', 'closingMessage', 'scheduledFor', 'status'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = body[field];
      }
    }

    const draft = await updateDraft(id, updates);
    if (!draft) {
      return new Response(JSON.stringify({ success: false, error: 'Draft not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data: draft }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * DELETE /api/drafts/[id]
 * Delete a draft
 *
 * Response:
 * { success: true }
 * or
 * { success: false, error: 'Not found' } (404)
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Missing draft ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const deleted = await deleteDraft(id);
    if (!deleted) {
      return new Response(JSON.stringify({ success: false, error: 'Draft not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
