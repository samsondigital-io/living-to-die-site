import type { APIRoute } from 'astro';
import { createAndSendNewsletter, sendNewsletterFromTemplate } from '../../lib/mailerlite';

/**
 * POST /api/newsletter
 *
 * Create and send a newsletter campaign via MailerLite.
 *
 * Request body options:
 *
 * Option 1: Pre-built HTML
 * {
 *   "subject": "Newsletter subject line",
 *   "preheader": "Preview text",
 *   "htmlContent": "<html>...full email HTML...</html>"
 * }
 *
 * Option 2: Use template with structured content
 * {
 *   "subject": "Newsletter subject line",
 *   "preheader": "Preview text",
 *   "useTemplate": true,
 *   "content": {
 *     "issueInfo": "Issue #1 | March 2026",
 *     "openingParagraph": "Opening text...",
 *     "section1Title": "Main Section",
 *     "section1Content": "Main content...",
 *     "section2Title": "Optional Section",
 *     "section2Content": "More content...",
 *     "ctaUrl": "https://example.com",
 *     "ctaText": "Learn More",
 *     "closingMessage": "Thank you for reading..."
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "campaignId": "123456"
 * }
 * or
 * {
 *   "success": false,
 *   "error": "Error message"
 * }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  // Check authentication - same pattern as content.ts
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.subject || typeof body.subject !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing required field: subject' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!body.preheader || typeof body.preheader !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing required field: preheader' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let result;

    if (body.useTemplate && body.content) {
      // Option 2: Use template
      const { content } = body;

      // Validate required template fields
      const requiredFields = ['openingParagraph', 'section1Title', 'section1Content', 'closingMessage'];
      for (const field of requiredFields) {
        if (!content[field]) {
          return new Response(JSON.stringify({ error: `Missing required content field: ${field}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      result = await sendNewsletterFromTemplate(body.subject, body.preheader, {
        issueInfo: content.issueInfo,
        openingParagraph: content.openingParagraph,
        section1Title: content.section1Title,
        section1Content: content.section1Content,
        section2Title: content.section2Title,
        section2Content: content.section2Content,
        ctaUrl: content.ctaUrl,
        ctaText: content.ctaText,
        closingMessage: content.closingMessage,
      });
    } else if (body.htmlContent) {
      // Option 1: Pre-built HTML
      result = await createAndSendNewsletter({
        subject: body.subject,
        preheader: body.preheader,
        htmlContent: body.htmlContent,
      });
    } else {
      return new Response(JSON.stringify({
        error: 'Must provide either htmlContent or (useTemplate: true with content object)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        campaignId: result.campaignId
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Newsletter API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
