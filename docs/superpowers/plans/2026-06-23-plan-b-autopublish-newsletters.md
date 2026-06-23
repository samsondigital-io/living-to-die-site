# Plan B — Autopublish Newsletters to the Blog (Tier 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a newsletter is sent successfully (Send Now or scheduled), automatically create a public blog post from it — stored in Redis, merged into the same `lib/blog.ts` source the templates already use.

**Architecture:** Extend `lib/blog.ts` with Redis read + a `publishPostFromNewsletter()` writer (same Upstash Redis as drafts). `getAllPosts()` merges repo + Redis posts. The two send paths call the writer **after** MailerLite reports success; a blog-write failure never fails the send. Redis posts carry pre-built HTML in `bodyHtml`; the slug page renders Redis posts from `bodyHtml` and repo posts from `<Content/>`.

**Tech Stack:** Upstash Redis (`@upstash/redis`, already used by drafts), Astro, Vitest.

**Depends on:** Plan A (must be complete — `lib/blog.ts`, tag pages, unified sources exist).

---

## File Structure

- **Modify** `src/lib/blog.ts` — add `BLOG_PREFIX`, `getRedis()` reuse, `RedisBlogPost` storage type, `listRedisPosts()`, `publishPostFromNewsletter()`, `slugify()`; merge Redis into `getAllPosts()`.
- **Modify** `src/lib/blog.test.ts` — unit-test `slugify()` and the newsletter→post mapping (pure part).
- **Modify** `src/pages/blog/[...slug].astro` — render Redis posts from `bodyHtml` (repo posts keep `<Content/>`).
- **Modify** `src/pages/api/newsletter.ts` — after success, call `publishPostFromNewsletter()` (guarded), pass tags + publish flag.
- **Modify** `src/pages/api/send-scheduled.ts` — same after each successful send; read tags/flag from the draft.
- **Modify** `src/lib/drafts.ts` — add optional `tags?: string[]` and `publishToBlog?: boolean` to the draft type.
- **Modify** `src/pages/admin/newsletter.astro` — add a tags input + "Publish to blog when sent" checkbox; include them in send + draft payloads.

---

## Task 1: `slugify()` + newsletter→post mapping (TDD)

**Files:**
- Modify: `src/lib/blog.ts`
- Test: `src/lib/blog.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/blog.test.ts`:
```ts
import { slugify, buildRedisPostFromNewsletter } from './blog';

describe('slugify', () => {
  it('lowercases, hyphenates, strips punctuation', () => {
    expect(slugify('A Reflection on Mortality!')).toBe('a-reflection-on-mortality');
  });
});

describe('buildRedisPostFromNewsletter', () => {
  it('maps subject/preheader/html and forces the newsletter tag', () => {
    const p = buildRedisPostFromNewsletter({
      subject: 'June Issue',
      preheader: 'This month',
      bodyHtml: '<p>hi</p>',
      tags: ['Book Updates'],
      sentAt: '2026-06-01T00:00:00.000Z',
    });
    expect(p.title).toBe('June Issue');
    expect(p.description).toBe('This month');
    expect(p.bodyHtml).toBe('<p>hi</p>');
    expect(p.tags).toContain('newsletter');
    expect(p.tags).toContain('Book Updates');
    expect(p.slug.startsWith('june-issue')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `slugify`/`buildRedisPostFromNewsletter` not exported.

- [ ] **Step 3: Implement**

Add to `src/lib/blog.ts`:
```ts
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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

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
  // Suffix with date for uniqueness/stability (no Math.random in serverless-safe code).
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog.ts src/lib/blog.test.ts
git commit -m "feat(blog): newsletter->post mapping and slugify"
```

---

## Task 2: Redis read + write + merge into getAllPosts

**Files:**
- Modify: `src/lib/blog.ts`

- [ ] **Step 1: Add Redis client + list/publish**

Add to `src/lib/blog.ts` (reuse the same env vars as `drafts.ts`):
```ts
import { Redis } from '@upstash/redis';

const BLOG_PREFIX = 'blogpost:';

function getRedis(): Redis {
  const url = import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis/KV not configured for blog posts.');
  return new Redis({ url, token });
}

export async function publishPostFromNewsletter(input: {
  subject: string; preheader: string; bodyHtml: string;
  tags?: string[]; heroImage?: string; sentAt: string;
}): Promise<RedisBlogPost> {
  const post = buildRedisPostFromNewsletter(input);
  const redis = getRedis();
  await redis.set(`${BLOG_PREFIX}${post.slug}`, post);
  return post;
}

async function listRedisPosts(): Promise<BlogPost[]> {
  let redis: Redis;
  try { redis = getRedis(); } catch { return []; }
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
      slug: r.slug, title: r.title, description: r.description,
      pubDate: new Date(r.pubDate), heroImage: r.heroImage,
      tags: dedupeTags(r.tags ?? []), author: r.author,
      featured: false, source: 'redis', bodyHtml: r.bodyHtml,
    });
  }
  return out;
}
```

- [ ] **Step 2: Merge Redis posts into `getAllPosts`**

In `getAllPosts()`, after building `repoPosts`, change the return to merge:
```ts
  const redisPosts = await listRedisPosts();
  return sortPostsByDateDesc([...repoPosts, ...redisPosts]);
```

- [ ] **Step 3: Build + run existing tests**

Run: `npm test && npx astro build`
Expected: tests pass; build completes (Redis is read at request time; empty list if unconfigured).

- [ ] **Step 4: Commit**

```bash
git add src/lib/blog.ts
git commit -m "feat(blog): read/write Redis posts and merge into getAllPosts"
```

---

## Task 3: Render Redis posts on the slug page

**Files:**
- Modify: `src/pages/blog/[...slug].astro`

- [ ] **Step 1: Make the slug page handle both sources**

Replace the frontmatter lookup so it first checks the collection (repo), then falls back to a Redis post via `getAllPosts()`:
```astro
---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getAllPosts, normalizeTag } from '../../lib/blog';

const { slug } = Astro.params;
const allEntries = await getCollection('blog');
const entry = allEntries.find((p) => p.slug === slug);

const allPosts = await getAllPosts();
const post = allPosts.find((p) => p.slug === slug);
if (!post) return Astro.redirect('/blog');

let Content = null;
if (entry) ({ Content } = await render(entry));

const tags = post.tags;
const relatedPosts = allPosts
  .filter((p) => p.slug !== post.slug && p.tags.some((t) => tags.some((et) => normalizeTag(et) === normalizeTag(t))))
  .slice(0, 3);
---
```

In the body, render either the MD component or the stored HTML:
```astro
<div class="post-content">
  {Content ? <Content /> : <Fragment set:html={post.bodyHtml} />}
</div>
```
Update header fields to use `post.*` (`post.title`, `post.description`, `post.heroImage`, `post.pubDate`, `post.author`). Keep the tag footer linking to `/blog/tag/${encodeURIComponent(normalizeTag(tag))}`.

- [ ] **Step 2: Build + verify**

Run: `npx astro build`
Expected: clean build. (Full end-to-end verify happens in Task 5 after a real send.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/blog/[...slug].astro
git commit -m "feat(blog): render redis-backed posts on slug page"
```

---

## Task 4: Composer fields (tags + publish toggle) and draft type

**Files:**
- Modify: `src/lib/drafts.ts`
- Modify: `src/pages/admin/newsletter.astro`

- [ ] **Step 1: Extend the draft type**

In `src/lib/drafts.ts`, add to the `NewsletterDraft` interface:
```ts
  tags?: string[];
  publishToBlog?: boolean;
```
And add both to the `allowedFields`/update + create paths if they whitelist fields (the `[id].ts` PUT already uses an allow-list — add `'tags'` and `'publishToBlog'` to it in `src/pages/api/drafts/[id].ts`).

- [ ] **Step 2: Add UI to the composer**

In `src/pages/admin/newsletter.astro`, inside the "Content" or a new "Blog" section, add:
```html
<div class="field">
  <label for="tags">Tags <span class="label-hint">— comma separated; helps readers browse the blog</span></label>
  <input type="text" id="tags" name="tags" placeholder="e.g., Book Updates, Events" />
</div>
<div class="field">
  <label><input type="checkbox" id="publishToBlog" checked /> Publish this to the blog when sent</label>
</div>
```

In the page's `getFormData()` JS, add:
```js
tags: document.getElementById('tags').value
  .split(',').map(t => t.trim()).filter(Boolean),
publishToBlog: document.getElementById('publishToBlog').checked,
```
Include `tags` and `publishToBlog` in the Send Now `body.content` payload and in the save/schedule draft payloads.

- [ ] **Step 3: Verify the form round-trips**

Run: `npm run dev`, log into `/admin/newsletter`, save a draft with tags + checkbox, reload via "Load Draft", confirm the tags and checkbox state persist.

- [ ] **Step 4: Commit**

```bash
git add src/lib/drafts.ts src/pages/api/drafts/[id].ts src/pages/admin/newsletter.astro
git commit -m "feat(newsletter): tags + publish-to-blog toggle on composer"
```

---

## Task 5: Wire autopublish into both send paths

**Files:**
- Modify: `src/pages/api/newsletter.ts`
- Modify: `src/pages/api/send-scheduled.ts`

- [ ] **Step 1: Autopublish on Send Now**

In `src/pages/api/newsletter.ts`, after a successful `result.success` send and before returning the success response, add a guarded publish. The endpoint must already have the built HTML; if `createAndSendNewsletter` doesn't return the HTML, build it the same way or pass `body.content` through. Insert:
```ts
import { publishPostFromNewsletter } from '../../lib/blog';
import { buildNewsletterHtml } from '../../lib/mailerlite';
// ... after result.success === true:
if (body.content?.publishToBlog !== false) {
  try {
    const sentAt = new Date().toISOString();
    // Reuse the same HTML the campaign used. If only structured content is
    // available here, rebuild it; otherwise pass body.htmlContent.
    const bodyHtml = body.htmlContent ?? '';
    await publishPostFromNewsletter({
      subject: body.subject,
      preheader: body.preheader,
      bodyHtml,
      tags: body.content?.tags ?? [],
      sentAt,
    });
  } catch (e) {
    console.error('Autopublish to blog failed (send still succeeded):', e);
  }
}
```

> **Engineer note:** confirm where the final HTML is available in this endpoint. The cleanest fix is to have `sendNewsletterFromTemplate`/`createAndSendNewsletter` return the built `htmlContent` in their result, then pass that to `publishPostFromNewsletter`. Do that small refactor in `lib/mailerlite.ts` if needed so the blog body exactly matches the email.

- [ ] **Step 2: Autopublish on scheduled send**

In `src/pages/api/send-scheduled.ts`, inside the `if (result.success)` branch (after `updateDraft(... 'sent')`), add:
```ts
import { publishPostFromNewsletter } from '../../lib/blog';
// ...
if (draft.publishToBlog !== false) {
  try {
    await publishPostFromNewsletter({
      subject: draft.subject,
      preheader: draft.preheader,
      bodyHtml: result.htmlContent ?? '',
      tags: draft.tags ?? [],
      sentAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error(`Autopublish failed for ${draft.id} (send succeeded):`, e);
  }
}
```
(Requires the mailerlite result to include `htmlContent` — same refactor as Step 1.)

- [ ] **Step 3: End-to-end verify**

With `npm run dev` and valid env (MailerLite + Redis), send a test newsletter to the Subscribers group with tags + checkbox on. Then:
- Confirm the email sends (campaign id returned).
- Visit `/blog` → the issue appears with a `newsletter` tag + your tags.
- Open it → body renders from stored HTML; tag links work.
- Toggle the checkbox OFF, send again → no new blog post is created.
- Simulate a blog-write failure (temporarily break Redis env) → the send still returns success and logs the autopublish error.

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/newsletter.ts src/pages/api/send-scheduled.ts src/lib/mailerlite.ts
git commit -m "feat(newsletter): autopublish sent newsletters to the blog (guarded)"
```

---

## Self-Review (completed)

- **Spec coverage:** autopublish on both send paths (T5), `newsletter` auto-tag + Diane's tags (T1/T4), full content published (T1 bodyHtml), publish-toggle default ON (T4), send-is-critical-path / blog-write best-effort (T5 try/catch), Redis storage like drafts (T2), merged source (T2), slug renders both sources (T3).
- **Placeholder scan:** the only judgment call (where the final HTML lives in the send endpoint) is called out explicitly with the recommended refactor; no silent TBDs.
- **Type consistency:** `RedisBlogPost` (storage, `pubDate: string`) vs `BlogPost` (runtime, `pubDate: Date`) mapping is explicit in `listRedisPosts`. `publishPostFromNewsletter` input shape matches both call sites.
- **Dependency:** requires `mailerlite` send result to expose `htmlContent` — noted as a small refactor in T5.
