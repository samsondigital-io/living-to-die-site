import sanitizeHtml from 'sanitize-html';

// Allowed tags for pasted/typed rich text. Kept deliberately small so content
// from Google Docs / Word is cleaned down to predictable, email-safe markup.
const ALLOWED_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4',
  'strong', 'b', 'em', 'i', 'u', 's',
  'a', 'ul', 'ol', 'li', 'blockquote',
  'img', 'span', 'hr', 'div',
];

/**
 * Clean arbitrary rich-text HTML before it is stored, previewed, or emailed.
 * Inline `style` is preserved (pasted content relies on it heavily) but the
 * tag/attribute/scheme allow-list blocks scripts, iframes, event handlers, etc.
 */
export function sanitizeBodyHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: true,
  });
}

/** Convert HTML to plain text, used for auto-deriving inbox preview text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr|\/blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
