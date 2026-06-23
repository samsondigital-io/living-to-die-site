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
  return sortPostsByDateDesc(repoPosts);
}

export async function getAllTags(): Promise<TagCount[]> {
  return aggregateTags(await getAllPosts());
}

export async function getPostsByTag(tagParam: string): Promise<BlogPost[]> {
  const key = normalizeTag(decodeURIComponent(tagParam));
  const posts = await getAllPosts();
  return posts.filter((p) => p.tags.some((t) => normalizeTag(t) === key));
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
