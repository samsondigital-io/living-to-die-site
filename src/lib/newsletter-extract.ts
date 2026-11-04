import { parse, HTMLElement, NodeType, type Node } from 'node-html-parser';
import sanitizeHtml from 'sanitize-html';

/**
 * Turn a sent MailerLite campaign email into a blog article.
 *
 * MailerLite's builder wraps each section of the email in
 * `<!-- {% if true %} --> … <!-- {% endif %} -->`. Diane's template has three:
 * the "Living To Die / A newsletter from Diane Melton" masthead, the article
 * itself, and the footer (address, social icons, unsubscribe). We keep the
 * article sections, flatten the email's layout tables into plain blocks, and
 * pull out the title, standfirst and lead image for the blog post page.
 *
 * Pure (no I/O) so it can be unit-tested.
 */

export interface ExtractedArticle {
  title: string;
  description: string;
  heroImage?: string;
  bodyHtml: string;
}

interface Block {
  kind: 'p' | 'heading' | 'img' | 'list' | 'quote' | 'hr';
  html: string;
  text: string;
  src?: string;
}

const SECTION_RE = /<!--\s*\{%\s*if true\s*%\}\s*-->([\s\S]*?)<!--\s*\{%\s*endif\s*%\}\s*-->/g;
const SKIP = new Set(['style', 'script', 'head', 'title', 'meta', 'link']);

/**
 * MailerLite builder buttons (e.g. "Pre-order Living To Die" at the bottom of
 * an issue) are email calls-to-action, not part of the article, so they're
 * dropped. Links written into the text itself are kept.
 */
const isButton = (el: HTMLElement) => /\bml-btn(-container)?\b/.test(el.getAttribute('class') ?? '');

export function extractNewsletterArticle(
  emailHtml: string,
  meta: { subject: string; preheader?: string }
): ExtractedArticle {
  const blocks = collectBlocks(articleSections(emailHtml));

  const hero = blocks.find((b) => b.kind === 'img');
  if (hero) blocks.splice(blocks.indexOf(hero), 1);

  // Title: the first heading in the article, else the email subject.
  let title = meta.subject.trim();
  let description = '';
  const titleIdx = blocks.findIndex((b) => b.kind === 'heading');
  if (titleIdx !== -1 && blocks[titleIdx].text) {
    title = blocks[titleIdx].text;
    blocks.splice(titleIdx, 1);
    // A heading directly under the title is a subtitle — use it as the standfirst.
    if (blocks[titleIdx]?.kind === 'heading' && blocks[titleIdx].text) {
      description = blocks[titleIdx].text;
      blocks.splice(titleIdx, 1);
    }
  }

  if (!description) {
    const preheader = (meta.preheader ?? '').trim();
    if (preheader && !norm(title).includes(norm(preheader))) description = preheader;
  }
  // Don't repeat the standfirst as the first paragraph of the body.
  const firstP = blocks.find((b) => b.kind === 'p');
  if (description && firstP && norm(firstP.text) === norm(description)) {
    blocks.splice(blocks.indexOf(firstP), 1);
  }
  if (!description) {
    // No subtitle or usable preheader: summarise the opening paragraphs.
    const opening = blocks.filter((b) => b.kind === 'p').slice(0, 3).map((b) => b.text).join(' ');
    description = excerpt(opening, 200);
  }

  return {
    title,
    description,
    heroImage: hero?.src,
    // Email HTML is heavily indented; whitespace runs are insignificant in these blocks.
    bodyHtml: cleanHtml(blocks.map((b) => b.html.replace(/\s+/g, ' ')).join('\n')),
  };
}

/** The HTML of the email's article sections (masthead and footer dropped). */
function articleSections(emailHtml: string): string {
  const sections = [...emailHtml.matchAll(SECTION_RE)].map((m) => m[1]);
  if (sections.length === 0) {
    const body = emailHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return body ? body[1] : emailHtml;
  }
  const kept = sections.filter((html, i) => {
    if (/\{\$unsubscribe\}|You received this email/i.test(html)) return false; // footer
    if (i === 0 && !/<(p|img)\b/i.test(html)) return false; // masthead: headings only
    return true;
  });
  return kept.join('\n');
}

function collectBlocks(html: string): Block[] {
  const root = parse(html, { comment: false });
  const blocks: Block[] = [];
  walk(root, blocks);
  return blocks.filter((b) => b.kind === 'img' || b.kind === 'hr' || b.text);
}

function walk(node: Node, out: Block[]): void {
  for (const child of node.childNodes) {
    if (child.nodeType === NodeType.TEXT_NODE) {
      const text = squash(child.text);
      if (text) out.push({ kind: 'p', html: `<p>${child.toString()}</p>`, text });
      continue;
    }
    if (!(child instanceof HTMLElement)) continue;
    const tag = child.tagName?.toLowerCase() ?? '';
    if (SKIP.has(tag) || isButton(child)) continue;

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]) <= 2 ? 'h2' : 'h3';
      out.push({ kind: 'heading', html: `<${level}>${child.innerHTML}</${level}>`, text: squash(child.text) });
    } else if (tag === 'p') {
      out.push({ kind: 'p', html: `<p>${child.innerHTML}</p>`, text: squash(child.text) });
    } else if (tag === 'img') {
      const src = child.getAttribute('src') ?? '';
      const width = Number(child.getAttribute('width') ?? '0');
      // Skip MailerLite's own assets (social icons, "Sent by MailerLite") and tiny images.
      if (!src || /assets\.mlcdn\.com/.test(src) || (width > 0 && width < 100)) continue;
      const alt = child.getAttribute('alt') ?? '';
      out.push({ kind: 'img', html: `<p><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"></p>`, text: '', src });
    } else if (tag === 'a') {
      // A link sitting on its own between blocks becomes its own paragraph.
      out.push({ kind: 'p', html: `<p>${child.toString()}</p>`, text: squash(child.text) });
    } else if (tag === 'ul' || tag === 'ol') {
      out.push({ kind: 'list', html: child.toString(), text: squash(child.text) });
    } else if (tag === 'blockquote') {
      out.push({ kind: 'quote', html: child.toString(), text: squash(child.text) });
    } else if (tag === 'hr') {
      out.push({ kind: 'hr', html: '<hr>', text: '' });
    } else {
      // Layout wrappers (tables, cells, divs, spans…): keep only what's inside.
      walk(child, out);
    }
  }
}

/** Final allowlist: semantic tags only, no styles, no MailerLite merge tags. */
function cleanHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'a', 'br', 'sup', 'sub', 'ul', 'ol', 'li', 'blockquote', 'img', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      b: 'strong',
      i: 'em',
      a: (tagName, attribs): sanitizeHtml.Tag => {
        const href = attribs.href ?? '';
        // Unsubscribe / web-version placeholders mean nothing on the blog;
        // a disallowed tag is dropped but its text is kept.
        if (!href || href.includes('{$')) return { tagName: 'span', attribs: {} };
        return { tagName, attribs: { href, target: '_blank', rel: 'noopener' } };
      },
    },
  });
  return clean
    .replace(/\{\$[^}]*\}/g, '')
    .replace(/<(p|strong|em)>\s*<\/\1>/g, '')
    .replace(/<p>(\s|<br \/>|<br>)*<\/p>/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function squash(s: string): string {
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function norm(s: string): string {
  return squash(s).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '');
}

function excerpt(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
