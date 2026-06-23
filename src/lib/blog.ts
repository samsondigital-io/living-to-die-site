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
