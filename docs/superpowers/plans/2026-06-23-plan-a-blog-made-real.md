# Plan A — Blog Made Real (Tier 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the half-built blog into a real, indexable, low-maintenance public archive with a tag system (replacing categories), working signup forms, and a nav link — fed today only by repo Markdown, but structured so Plan B can add Redis-backed autopublished posts without touching the templates.

**Architecture:** Introduce `src/lib/blog.ts` as the single source of truth that returns a normalized `BlogPost[]`. In Plan A it reads only the Astro content collection (repo `.md`); Plan B will extend the same function to merge Redis posts. All pages/RSS consume `getAllPosts()` and the tag helpers, never `getCollection('blog')` directly. Categories are removed entirely in favor of normalized free-text tags.

**Tech Stack:** Astro 5 (content collections), TypeScript, Vitest (added in Task 1), Vercel Blob (unchanged), Upstash Redis (Plan B only).

---

## File Structure

- **Create** `vitest.config.ts` — test runner config (logic tests only).
- **Create** `src/lib/blog.ts` — `BlogPost` type, `normalizeTag()`, `getAllPosts()`, `getAllTags()`, `getPostsByTag()`. Single source of truth for blog data.
- **Create** `src/lib/blog.test.ts` — unit tests for tag normalization + sorting + tag aggregation.
- **Modify** `src/content/config.ts` — remove required `category` enum from blog schema; keep `tags`.
- **Modify** `src/content/blog/welcome-post.md` — drop `category`; retag; soften "comments" line.
- **Modify** `src/pages/blog/index.astro` — consume `lib/blog.ts`; tag cloud sidebar; rename to "Blog"; working signup form; remove dead `noindex`.
- **Modify** `src/pages/blog/[...slug].astro` — consume `lib/blog.ts`; render tags to working tag links; related-by-tags; remove dead `noindex`/category.
- **Create** `src/pages/blog/tag/[tag].astro` — tag filter page.
- **Delete** `src/pages/blog/category/[category].astro` — category route removed.
- **Modify** `src/pages/rss.xml.js` — consume `lib/blog.ts`; drop `category`.
- **Modify** `src/components/Navigation.astro` — add "Blog" nav item.
- **Modify** `src/components/Footer.astro` — fix the "Newsletter" link target if needed (points to `/blog`, fine — verify only).

---

## Task 1: Add Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (devDependencies + `test` script)

- [ ] **Step 1: Install Vitest**

Run:
```bash
cd /Users/mattmelton/Development/living-to-die/living-to-die-site
npm install -D vitest@^2
```
Expected: adds `vitest` to devDependencies, no errors.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create a smoke test and run it**

Create `src/lib/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```
Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 5: Delete the smoke test and commit**

Run: `rm src/lib/smoke.test.ts`
```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for logic unit tests"
```

---

## Task 2: Create `lib/blog.ts` tag normalization (TDD)

**Files:**
- Create: `src/lib/blog.ts`
- Test: `src/lib/blog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/blog.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeTag, dedupeTags } from './blog';

describe('normalizeTag', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeTag('  Book   Updates ')).toBe('book updates');
  });
  it('lowercases', () => {
    expect(normalizeTag('Newsletter')).toBe('newsletter');
  });
});

describe('dedupeTags', () => {
  it('dedupes case- and whitespace-insensitively, keeping first display label', () => {
    expect(dedupeTags(['Book Updates', 'book updates', ' Events '])).toEqual([
      'Book Updates',
      'Events',
    ]);
  });
  it('drops empty tags', () => {
    expect(dedupeTags(['', '  ', 'Events'])).toEqual(['Events']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import `normalizeTag`/`dedupeTags` from `./blog`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/blog.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog.ts src/lib/blog.test.ts
git commit -m "feat(blog): add tag normalization and dedup helpers"
```

---

## Task 3: Add `BlogPost` type + `getAllPosts()` reading the content collection (TDD for sorting)

**Files:**
- Modify: `src/lib/blog.ts`
- Test: `src/lib/blog.test.ts`

> Note: `getAllPosts()` calls Astro's `getCollection`, which isn't available in plain Vitest. So we unit-test a pure helper `sortPostsByDateDesc()` and `aggregateTags()`, and keep `getAllPosts()` as a thin wrapper that maps the collection into `BlogPost` and calls the pure helper. The wrapper is verified by running the site (Task 6).

- [ ] **Step 1: Write the failing test**

Append to `src/lib/blog.test.ts`:
```ts
import { sortPostsByDateDesc, aggregateTags, type BlogPost } from './blog';

function post(partial: Partial<BlogPost>): BlogPost {
  return {
    slug: 's',
    title: 't',
    description: 'd',
    pubDate: new Date('2026-01-01'),
    tags: [],
    author: 'Diane Melton',
    featured: false,
    source: 'repo',
    bodyHtml: '',
    ...partial,
  };
}

describe('sortPostsByDateDesc', () => {
  it('sorts newest first', () => {
    const a = post({ slug: 'old', pubDate: new Date('2026-01-01') });
    const b = post({ slug: 'new', pubDate: new Date('2026-06-01') });
    expect(sortPostsByDateDesc([a, b]).map((p) => p.slug)).toEqual(['new', 'old']);
  });
});

describe('aggregateTags', () => {
  it('counts tags case-insensitively with display label + count', () => {
    const posts = [
      post({ tags: ['Newsletter', 'Events'] }),
      post({ tags: ['newsletter'] }),
    ];
    const tags = aggregateTags(posts);
    const newsletter = tags.find((t) => t.key === 'newsletter');
    expect(newsletter?.count).toBe(2);
    expect(newsletter?.label).toBe('Newsletter');
    expect(tags.find((t) => t.key === 'events')?.count).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `sortPostsByDateDesc`/`aggregateTags`/`BlogPost` not exported.

- [ ] **Step 3: Write the implementation**

Add to `src/lib/blog.ts`:
```ts
import { getCollection } from 'astro:content';

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
  key: string;   // normalized
  label: string; // display
  count: number;
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
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * All blog posts, newest first. Plan A: repo content collection only.
 * Plan B extends this to also merge Redis-backed autopublished posts.
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  const entries = await getCollection('blog');
  const repoPosts: BlogPost[] = await Promise.all(
    entries.map(async (entry) => {
      const { render } = await import('astro:content');
      const { Content } = await render(entry);
      // Body is rendered in the page via <Content/>; bodyHtml kept empty for repo
      // posts because Astro renders MD components directly. See Task 5 note.
      return {
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
        // attach the rendered component for repo posts (used by the slug page)
        _Content: Content,
      } as BlogPost & { _Content?: unknown };
    })
  );
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
```

> **Implementation note for the engineer:** repo Markdown posts render via Astro's `<Content/>` component, not an HTML string. To keep the slug page simple, the slug page (Task 5) will re-fetch the single collection entry and render `<Content/>` directly rather than reading `bodyHtml`. `getAllPosts()` is the source for *lists* (index, tag, RSS, related). This avoids forcing repo MD through an HTML string. Plan B's Redis posts DO use `bodyHtml`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all tests). If `astro:content` import breaks Vitest, move the `getCollection` import to a dynamic `import()` inside `getAllPosts` so the test file never loads it. Re-run until green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog.ts src/lib/blog.test.ts
git commit -m "feat(blog): BlogPost type, getAllPosts, tag aggregation"
```

---

## Task 4: Remove `category` from schema + welcome post

**Files:**
- Modify: `src/content/config.ts:3-16`
- Modify: `src/content/blog/welcome-post.md:1-10,41-51`

- [ ] **Step 1: Remove the category enum from the blog schema**

In `src/content/config.ts`, change the `blog` schema to drop `category`:
```ts
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Diane Melton'),
    featured: z.boolean().default(false),
  }),
});
```

- [ ] **Step 2: Update the welcome post frontmatter + soften comments line**

In `src/content/blog/welcome-post.md`, replace frontmatter lines (remove `category`, retag):
```yaml
---
title: "Welcome to the Living to Die Blog"
description: "Join me on this journey as we prepare to share Brenda Sawicki's powerful story with the world."
pubDate: 2024-01-15
tags: ["Book Updates", "Behind the Scenes", "Welcome"]
author: "Diane Melton"
featured: true
heroImage: "/images/blog/welcome-hero.jpg"
---
```

And change the "Join the Conversation" paragraph (around line 43) from:
```
Please feel free to share your thoughts in the comments, and don't hesitate to reach out with your own stories.
```
to:
```
I'd love to hear from you — please [reach out](/contact) with your own stories and reflections.
```

- [ ] **Step 3: Verify the build still parses content**

Run: `npx astro sync`
Expected: completes with no schema errors. (If it complains about `welcome-hero.jpg`, that's a missing image, handled in Task 6 — not a schema error.)

- [ ] **Step 4: Commit**

```bash
git add src/content/config.ts src/content/blog/welcome-post.md
git commit -m "feat(blog): drop category enum in favor of tags; soften comments copy"
```

---

## Task 5: Rewrite blog index + slug + tag pages to use tags

**Files:**
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/blog/[...slug].astro`
- Create: `src/pages/blog/tag/[tag].astro`
- Delete: `src/pages/blog/category/[category].astro`

- [ ] **Step 1: Delete the category route**

Run: `rm src/pages/blog/category/[category].astro && rmdir src/pages/blog/category 2>/dev/null; true`

- [ ] **Step 2: Rewrite `src/pages/blog/index.astro` frontmatter + sidebar**

Replace the frontmatter (top `---` block) with:
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getAllPosts, getAllTags } from '../../lib/blog';

const posts = await getAllPosts();
const tags = await getAllTags();
const featuredPosts = posts.filter((p) => p.featured);
---
```

Change the `<BaseLayout title="Musings" ...>` opening tag to:
```astro
<BaseLayout title="Blog" description="News, reflections, and updates from Diane Melton on the journey of bringing Living to Die to life.">
```
Delete the line `  <meta slot="head" name="robots" content="noindex, nofollow" />`.

Change the hero `<h1>Musings & Updates</h1>` to `<h1>Blog</h1>`.

Replace the **Categories** sidebar section (the `<div class="sidebar-section">` containing `<h3>Categories</h3>` and the `category-list`) with a tag cloud:
```astro
<div class="sidebar-section">
  <h3>Topics</h3>
  <ul class="tag-cloud">
    <li><a href="/blog" class="tag-cloud__link active">All Posts</a></li>
    {tags.map((tag) => (
      <li>
        <a href={`/blog/tag/${encodeURIComponent(tag.key)}`} class="tag-cloud__link">
          {tag.label} <span class="tag-cloud__count">({tag.count})</span>
        </a>
      </li>
    ))}
  </ul>
</div>
```

Wire the sidebar signup form (the `<form class="sidebar-form">`) to the working hosted MailerLite endpoint used by the footer:
```astro
<form class="sidebar-form" action="https://assets.mailerlite.com/jsonp/2188276/forms/181849541197170482/subscribe" method="post" target="_blank">
  <input type="email" name="fields[email]" placeholder="Your email" required autocomplete="email" />
  <button type="submit" class="btn btn--primary">Subscribe</button>
</form>
```

In the posts loop, replace every `post.slug` with `post.slug`, and replace the category badge block:
```astro
<span class="category-badge category-badge--{post.data.category}">
  {post.data.category}
</span>
```
with tag chips (use the post's first tag, or omit if none):
```astro
{post.tags.length > 0 && (
  <span class="tag-chip">{post.tags[0]}</span>
)}
```
And update field accessors throughout the loop from `post.data.X` to `post.X` (this file now iterates `BlogPost`, not collection entries): `post.heroImage`, `post.title`, `post.description`, `post.pubDate`, `post.author`. The link becomes `href={`/blog/${post.slug}`}`.

- [ ] **Step 3: Replace category CSS with a neutral chip + tag-cloud style**

In `src/pages/blog/index.astro` `<style>`, delete the four `.category-badge--news/reflections/updates/events` rules and add:
```css
.tag-chip {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--color-accent);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  width: fit-content;
  margin-bottom: 0.75rem;
}
.tag-cloud { list-style: none; padding: 0; }
.tag-cloud li { margin-bottom: 0.5rem; }
.tag-cloud__link {
  color: var(--color-text); text-decoration: none; padding: 0.5rem 1rem;
  display: block; border-radius: var(--radius-sm); transition: all var(--transition-fast);
}
.tag-cloud__link:hover, .tag-cloud__link.active { background: var(--color-accent); color: white; }
.tag-cloud__count { opacity: 0.6; font-size: 0.85em; }
```

- [ ] **Step 4: Rewrite `src/pages/blog/[...slug].astro`**

Replace its frontmatter with (keeps `<Content/>` rendering for repo posts; uses `getAllPosts` only for related-by-tags):
```astro
---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getAllPosts } from '../../lib/blog';
import { normalizeTag } from '../../lib/blog';

const { slug } = Astro.params;
const allEntries = await getCollection('blog');
const entry = allEntries.find((p) => p.slug === slug);
if (!entry) return Astro.redirect('/blog');
const { Content } = await render(entry);

const tags = entry.data.tags ?? [];
const allPosts = await getAllPosts();
const relatedPosts = allPosts
  .filter((p) => p.slug !== entry.slug && p.tags.some((t) => tags.some((et) => normalizeTag(et) === normalizeTag(t))))
  .slice(0, 3);
---
```
Delete the `<meta slot="head" name="robots" .../>` line. Replace the `category-badge` meta block in the header with the post's tags (and remove the `.category-badge--*` color CSS as in Step 3). The tags footer already maps to `/blog/tag/${tag}` — change it to normalized:
```astro
{tags.length > 0 && (
  <div class="post-tags">
    <span>Tags:</span>
    {tags.map((tag) => (
      <a href={`/blog/tag/${encodeURIComponent(normalizeTag(tag))}`} class="tag">#{tag}</a>
    ))}
  </div>
)}
```
Update `post.data.X` references in this file to `entry.data.X` (title, description, heroImage, pubDate, author, updatedDate) and related-post fields to the `BlogPost` shape (`relPost.slug`, `relPost.heroImage`, `relPost.title`, `relPost.description`, `relPost.pubDate`).

- [ ] **Step 5: Create the tag filter page**

Create `src/pages/blog/tag/[tag].astro`:
```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
import { getPostsByTag, getAllTags } from '../../../lib/blog';

const { tag } = Astro.params;
const posts = await getPostsByTag(tag!);
const allTags = await getAllTags();
const display = allTags.find((t) => t.key === tag)?.label ?? tag;
---
<BaseLayout title={`#${display}`} description={`Posts tagged ${display}`}>
  <section class="blog-hero">
    <div class="container">
      <h1>#{display}</h1>
      <p>{posts.length} post{posts.length === 1 ? '' : 's'}</p>
    </div>
  </section>
  <section class="section section--alt">
    <div class="container">
      {posts.length === 0 ? (
        <p>No posts yet. <a href="/blog">Back to all posts</a>.</p>
      ) : (
        <div class="posts-grid">
          {posts.map((post) => (
            <article class="post-card">
              <div class="post-card__content">
                {post.tags.length > 0 && <span class="tag-chip">{post.tags[0]}</span>}
                <h3 class="post-card__title"><a href={`/blog/${post.slug}`}>{post.title}</a></h3>
                <p class="post-card__excerpt">{post.description}</p>
                <a href={`/blog/${post.slug}`} class="post-card__link">Read more →</a>
              </div>
            </article>
          ))}
        </div>
      )}
      <p style="margin-top:2rem;"><a href="/blog" class="btn btn--secondary">← All posts</a></p>
    </div>
  </section>
  <style>
    .blog-hero { padding: 8rem 0 4rem; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%); color: white; text-align: center; }
    .blog-hero h1 { color: white; }
    .posts-grid { display: grid; gap: 2rem; }
    .post-card { background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); padding: 1.5rem; }
    .tag-chip { display:inline-block; padding:0.25rem 0.75rem; background:var(--color-accent); color:white; border-radius:var(--radius-sm); font-size:0.75rem; font-weight:600; text-transform:uppercase; margin-bottom:0.75rem; }
  </style>
</BaseLayout>
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/blog/
git commit -m "feat(blog): tag-based index, slug, and tag pages; remove categories"
```

---

## Task 6: Update RSS + nav, then verify the whole blog by running it

**Files:**
- Modify: `src/pages/rss.xml.js`
- Modify: `src/components/Navigation.astro:8-13`

- [ ] **Step 1: Update RSS to use the unified source and drop category**

Replace `src/pages/rss.xml.js` body:
```js
import rss from '@astrojs/rss';
import { getAllPosts } from '../lib/blog.ts';

export async function GET(context) {
  const posts = await getAllPosts();
  return rss({
    title: 'Living to Die | Blog',
    description: 'Updates, reflections, and insights from the author of Living to Die',
    site: context.site,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.pubDate,
      link: `/blog/${post.slug}/`,
      author: post.author,
      categories: post.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
```

- [ ] **Step 2: Add the Blog nav link**

In `src/components/Navigation.astro`, change `navItems`:
```ts
const navItems = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/#author' },
  { label: 'Blog', href: '/blog' },
  { label: 'Resources', href: '/resources' },
  { label: 'Contact', href: '/contact' },
];
```

- [ ] **Step 3: Build to catch type/render errors**

Run: `npx astro build`
Expected: build completes. Fix any error that references `post.data.category` or a missing import (those are leftover category references). Re-run until clean.

- [ ] **Step 4: Run the dev server and manually verify**

Run: `npm run dev` and check in a browser:
- `/blog` — shows the welcome post, a "Topics" tag cloud with counts, title "Blog", a working Subscribe box.
- Click a tag → `/blog/tag/<tag>` lists matching posts.
- Open the welcome post → tags render as `#tag` links that go to the tag page; "comments" line now says "reach out"; no console error about a dropped `noindex`.
- `/rss.xml` — loads, lists the post, no `undefined` category.
- Nav shows "Blog" and it links to `/blog`.

> If `welcome-hero.jpg` 404s, either add the image at `public/images/blog/welcome-hero.jpg` or remove the `heroImage` line from the welcome post. Note which you did.

- [ ] **Step 5: Commit**

```bash
git add src/pages/rss.xml.js src/components/Navigation.astro
git commit -m "feat(blog): unified RSS source, add Blog to nav"
```

---

## Self-Review (completed)

- **Spec coverage:** Tier-1 items all mapped — dead signup forms (T5 S2), naming "Blog" (T5/T6), tag model + cloud (T2/T3/T5), `/blog/tag/` route fixing broken links (T5), removed dead `noindex` (T5), nav link (T6), softened comments (T4), one-source `lib/blog.ts` ready for Plan B merge (T3). One-group consolidation comment fix already shipped in the earlier security commit.
- **Placeholder scan:** No TBDs; all code shown. The one judgment call (missing hero image) has explicit handling in T6 S4.
- **Type consistency:** `BlogPost` fields (`slug,title,description,pubDate,heroImage,tags,author,featured,source,bodyHtml`) are used consistently across index/tag/RSS. Slug page deliberately uses collection `entry` + `<Content/>` (documented note) while lists use `BlogPost`.
- **Known risk:** `astro:content` inside `lib/blog.ts` under Vitest — mitigation (dynamic import) is written into T3 S4.
