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
}

export interface TagCount {
  key: string; // normalized
  label: string; // display
  count: number;
}

/** How an autopublished newsletter is stored in Redis (pubDate as ISO string). */
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

import { Redis } from '@upstash/redis';

const BLOG_PREFIX = 'blogpost:';

/** Upstash Redis client, sharing the same env vars as the drafts store. */
function getRedis(): Redis {
  const url = import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis/KV not configured for blog posts.');
  return new Redis({ url, token });
}

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
    slug: entry.slug,
    title: entry.data.title,
    description: entry.data.description,
    pubDate: entry.data.pubDate,
    heroImage: entry.data.heroImage,
    tags: dedupeTags(entry.data.tags ?? []),
    author: entry.data.author,
    featured: entry.data.featured,
    source: 'repo' as const,
    bodyHtml: '',
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

/** Persist an autopublished newsletter as a Redis blog post. */
export async function publishPostFromNewsletter(input: {
  subject: string;
  preheader: string;
  bodyHtml: string;
  tags?: string[];
  heroImage?: string;
  sentAt: string;
}): Promise<RedisBlogPost> {
  const post = buildRedisPostFromNewsletter(input);
  const redis = getRedis();
  await redis.set(`${BLOG_PREFIX}${post.slug}`, post);
  return post;
}

/**
 * Create a free-form blog post directly from the admin (NOT a newsletter — no
 * email is sent, no `newsletter` tag is forced). Generates a unique slug.
 */
export async function createBlogPost(input: {
  title: string;
  description: string;
  bodyHtml: string;
  tags?: string[];
  heroImage?: string;
  author?: string;
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
  const now = new Date().toISOString();
  const post: RedisBlogPost = {
    slug,
    title: input.title,
    description: input.description,
    pubDate: now,
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

/**
 * Build the stored Redis post for an autopublished newsletter. The `newsletter`
 * tag is always applied, alongside any tags the author added. Pure function
 * (no I/O) so it can be unit-tested; persistence lives in publishPostFromNewsletter.
 */
export function buildRedisPostFromNewsletter(input: {
  subject: string;
  preheader: string;
  bodyHtml: string;
  tags?: string[];
  heroImage?: string;
  sentAt: string;
}): RedisBlogPost {
  const tags = dedupeTags(['newsletter', ...(input.tags ?? [])]);
  const base = slugify(input.subject) || 'newsletter';
  // Suffix with the send date for a stable, unique slug (no randomness, which
  // would break determinism in serverless retries).
  const datePart = input.sentAt.slice(0, 10);
  return {
    slug: `${base}-${datePart}`,
    title: input.subject,
    description: input.preheader,
    pubDate: input.sentAt,
    heroImage: input.heroImage,
    tags,
    author: 'Diane Melton',
    bodyHtml: input.bodyHtml,
  };
}
