export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  heroImage?: string;
  tags: string[];
  author: string;
  featured: boolean;
  source: 'repo' | 'redis';
  bodyHtml: string;
  /** The opening of the post as plain text, cut at a word with "…" (for cards). */
  excerpt: string;
  /** `description` when it's a real subtitle; empty when it merely repeats the opening. */
  subtitle: string;
}

export interface TagCount {
  key: string; // normalized
  label: string; // display
  count: number;
}

/** How an admin-created blog post is stored in Redis (pubDate as ISO string). */
export interface RedisBlogPost {
  slug: string;
  title: string;
  description: string;
  pubDate: string; // ISO
  heroImage?: string;
  tags: string[];
  author: string;
  bodyHtml: string;
}

import type { Redis } from '@upstash/redis';
import { getRedis } from './redis';

const BLOG_PREFIX = 'blogpost:';


/** Normalize a tag for matching/dedup: trim, collapse whitespace, lowercase. */
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Dedupe tags case/whitespace-insensitively. Keeps the first occurrence's
 * original (display) label, drops empties.
 */
export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = normalizeTag(tag);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag.trim().replace(/\s+/g, ' '));
  }
  return out;
}

export function sortPostsByDateDesc(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
}

export function aggregateTags(posts: BlogPost[]): TagCount[] {
  const map = new Map<string, TagCount>();
  for (const p of posts) {
    for (const tag of p.tags) {
      const key = normalizeTag(tag);
      if (!key) continue;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { key, label: tag.trim().replace(/\s+/g, ' '), count: 1 });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}

/**
 * All blog posts, newest first. Plan A: repo content collection only.
 * Plan B extends this to also merge Redis-backed autopublished posts.
 *
 * The `astro:content` import is dynamic so this module stays importable from
 * plain unit tests (Vitest), which don't provide the Astro virtual module.
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  const { getCollection } = await import('astro:content');
  const entries = await getCollection('blog');
  const repoPosts: BlogPost[] = entries.map((entry: any) => ({
    slug: entry.id,
    title: entry.data.title,
    description: entry.data.description,
    pubDate: entry.data.pubDate,
    heroImage: entry.data.heroImage,
    tags: dedupeTags(entry.data.tags ?? []),
    author: entry.data.author,
    featured: entry.data.featured,
    source: 'repo' as const,
    bodyHtml: '',
    ...summarize(entry.data.description, markdownToText(entry.body ?? '')),
  }));
  const redisPosts = await listRedisPosts();
  return sortPostsByDateDesc([...repoPosts, ...redisPosts]);
}

export async function getAllTags(): Promise<TagCount[]> {
  return aggregateTags(await getAllPosts());
}

export async function getPostsByTag(tagParam: string): Promise<BlogPost[]> {
  const key = normalizeTag(decodeURIComponent(tagParam));
  const posts = await getAllPosts();
  return posts.filter((p) => p.tags.some((t) => normalizeTag(t) === key));
}

/**
 * Create a free-form blog post directly from the admin. Generates a unique slug.
 */
export async function createBlogPost(input: {
  title: string;
  description: string;
  bodyHtml: string;
  tags?: string[];
  heroImage?: string;
  author?: string;
  /** ISO publish date; defaults to now (used when importing a sent newsletter). */
  pubDate?: string;
}): Promise<RedisBlogPost> {
  const redis = getRedis();
  const base = slugify(input.title) || 'post';
  // Ensure uniqueness without Math.random (kept deterministic-ish): append a
  // numeric suffix only if the base slug is already taken.
  let slug = base;
  let n = 2;
  while (await redis.get<RedisBlogPost>(`${BLOG_PREFIX}${slug}`)) {
    slug = `${base}-${n++}`;
  }
  const post: RedisBlogPost = {
    slug,
    title: input.title,
    description: input.description,
    pubDate: input.pubDate ?? new Date().toISOString(),
    heroImage: input.heroImage,
    tags: dedupeTags(input.tags ?? []),
    author: input.author?.trim() || 'Diane Melton',
    bodyHtml: input.bodyHtml,
  };
  await redis.set(`${BLOG_PREFIX}${slug}`, post);
  return post;
}

/** Get a single raw Redis post (storage shape) by slug, or null. */
export async function getBlogPost(slug: string): Promise<RedisBlogPost | null> {
  const redis = getRedis();
  return (await redis.get<RedisBlogPost>(`${BLOG_PREFIX}${slug}`)) ?? null;
}

/** Update an existing Redis post in place (slug and pubDate preserved). */
export async function updateBlogPost(
  slug: string,
  updates: { title?: string; description?: string; bodyHtml?: string; tags?: string[]; heroImage?: string; author?: string }
): Promise<RedisBlogPost | null> {
  const redis = getRedis();
  const existing = await redis.get<RedisBlogPost>(`${BLOG_PREFIX}${slug}`);
  if (!existing) return null;
  const updated: RedisBlogPost = {
    ...existing,
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.bodyHtml !== undefined ? { bodyHtml: updates.bodyHtml } : {}),
    ...(updates.heroImage !== undefined ? { heroImage: updates.heroImage } : {}),
    ...(updates.author !== undefined ? { author: updates.author || 'Diane Melton' } : {}),
    ...(updates.tags !== undefined ? { tags: dedupeTags(updates.tags) } : {}),
    slug: existing.slug,
    pubDate: existing.pubDate,
  };
  await redis.set(`${BLOG_PREFIX}${slug}`, updated);
  return updated;
}

/** Delete a Redis post by slug. Returns true if a post was removed. */
export async function deleteBlogPost(slug: string): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.del(`${BLOG_PREFIX}${slug}`);
  return result === 1;
}

/** Public: all Redis-backed posts (storage shape), newest first. For admin listing. */
export async function listBlogPosts(): Promise<RedisBlogPost[]> {
  let redis: Redis;
  try {
    redis = getRedis();
  } catch {
    return [];
  }
  const keys: string[] = [];
  let cursor = 0;
  do {
    const [next, batch] = await redis.scan(cursor, { match: `${BLOG_PREFIX}*`, count: 100 });
    cursor = Number(next);
    keys.push(...batch);
  } while (cursor !== 0);
  const out: RedisBlogPost[] = [];
  for (const key of keys) {
    const r = await redis.get<RedisBlogPost>(key);
    if (r) out.push(r);
  }
  return out.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

/** Read all Redis-backed posts, normalized into BlogPost. Empty if unconfigured. */
async function listRedisPosts(): Promise<BlogPost[]> {
  let redis: Redis;
  try {
    redis = getRedis();
  } catch {
    return [];
  }
  const keys: string[] = [];
  let cursor = 0;
  do {
    const [next, batch] = await redis.scan(cursor, { match: `${BLOG_PREFIX}*`, count: 100 });
    cursor = Number(next);
    keys.push(...batch);
  } while (cursor !== 0);
  if (keys.length === 0) return [];
  const out: BlogPost[] = [];
  for (const key of keys) {
    const r = await redis.get<RedisBlogPost>(key);
    if (!r) continue;
    out.push({
      slug: r.slug,
      title: r.title,
      description: r.description,
      pubDate: new Date(r.pubDate),
      heroImage: r.heroImage,
      tags: dedupeTags(r.tags ?? []),
      author: r.author,
      featured: false,
      source: 'redis',
      bodyHtml: r.bodyHtml,
      ...summarize(r.description, htmlToText(r.bodyHtml)),
    });
  }
  return out;
}

/** Make a URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/* ---------------------------------------------------------------------------
 * Excerpts. Pure helpers so they can be unit-tested.
 * ------------------------------------------------------------------------- */

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
  ndash: '\u2013', mdash: '\u2014', hellip: '\u2026',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[e.toLowerCase()] ?? match;
  });
}

/** Visible text of an HTML fragment, whitespace collapsed. */
export function htmlToText(html: string): string {
  const spaced = html.replace(/<(br|\/p|\/h[1-6]|\/li|\/blockquote)\b[^>]*>/gi, ' ');
  return decodeEntities(spaced.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

/** Rough plain text of a Markdown body (enough for an excerpt). */
function markdownToText(md: string): string {
  return md
    .replace(/^#{1,6}\s+.*$/gm, ' ') // headings
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cut text to about `max` characters at a word boundary, ending in "…". */
export function excerptText(text: string, max = 240): string {
  if (text.length <= max) return text;
  // Look one character past the limit so a word ending exactly at `max` is kept.
  const lastSpace = text.slice(0, max + 1).lastIndexOf(' ');
  const trimmed = lastSpace > max * 0.6 ? text.slice(0, lastSpace) : text.slice(0, max);
  return trimmed.replace(/[\s,;:.!?\u2013\u2014-]+$/, '') + '\u2026';
}

/** True when a summary is just the post's opening words (auto-generated), not a subtitle. */
export function isOpeningSummary(summary: string, bodyText: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\u2026$/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const opening = norm(summary);
  return opening.length > 0 && norm(bodyText).startsWith(opening);
}

function summarize(description: string, bodyText: string): { excerpt: string; subtitle: string } {
  return {
    excerpt: excerptText(bodyText),
    subtitle: isOpeningSummary(description, bodyText) ? '' : description,
  };
}
