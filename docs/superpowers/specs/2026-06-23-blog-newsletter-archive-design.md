# Blog as Newsletter-Fed Archive + Admin Image Tooling — Design

**Date:** 2026-06-23
**Author:** Diane Melton's site (Living to Die) — admin/blog work
**Status:** Approved design, pre-implementation

## Goal

Grow Diane's newsletter subscriber list ahead of the September 2026 book launch by
making the admin self-contained and turning the blog into a low-maintenance,
SEO-friendly archive that is fed automatically by the newsletters she already sends.

Diane is a non-technical, elderly (internet-literate) author. The guiding principle
throughout is **ruthless simplicity**: fewer screens, fewer decisions, no jargon,
no maintenance burden, and nothing that can leave her "stuck."

## Priority Order (agreed)

- **Tier 1 — the list actually grows:** fix dead blog signup forms; make the blog real
  (naming, tags, indexability, nav).
- **Tier 2 — Diane is self-sufficient:** autopublish newsletters to the blog; image
  upload + AI image generation in the admin.
- **Tier 3 — measure it:** analytics dashboard (subscriber count, open rates).
  **Explicitly deferred** — not built in this round, not specified here beyond noting it.

## Key Decisions

1. **One MailerLite group.** The canonical group is **Subscribers**, which is what
   `MAILERLITE_GROUP_ID` already points to (verified: value begins `1819…`, used in
   `lib/mailerlite.ts`). The only change needed is fixing the stale "Book Updates"
   comment in code to say "Subscribers." No data migration (the group holds only two
   of Matt's test subscribers). Any future group reference must use this one group.

2. **Blog = newsletter archive.** When a newsletter is sent successfully, it is also
   published as a blog post automatically. Diane writes one thing; it lives in two
   places (inbox + public archive).

3. **No categories — tags instead.** Replace the required `category` enum with a
   flexible `tags: string[]` model. Free-text tags are allowed, with normalization
   guardrails (see below) so the tag cloud doesn't rot. A sidebar **tag cloud**
   replaces the categories list.

4. **`Newsletter` tag auto-applied** to every autopublished issue, alongside any tags
   Diane adds on that send.

5. **Diane's welcome post is real content** (she wrote it) and stays as a repo
   Markdown file. Its "share in the comments" line is softened to "reach out" (no
   comment system is built).

6. **Images:** reuse the existing Vercel Blob upload endpoint; add AI image generation
   ("create image from description") via Gemini, available in every admin image field,
   with manual upload always available as fallback.

## Architecture

### Data sources (the core decision)

The blog reads from **two merged sources**, normalized into one unified post type:

1. **Repo Markdown posts** — `src/content/blog/*.md` via Astro content collections.
   Rare, hand-authored (e.g. Diane's welcome post). Body rendered from Markdown.
2. **Redis posts** — autopublished newsletters, stored in Upstash Redis (same infra as
   drafts). The ongoing stream. Body stored as pre-built HTML.

A new `src/lib/blog.ts` exposes functions returning a **unified `BlogPost` type** from
both sources, sorted by date. Templates (index, single post, tag filter, RSS) are
source-agnostic — a repo post and a Redis post look identical to them.

Rationale: serverless has a read-only filesystem, so runtime autopublish cannot write
`.md` files — Redis is required for that path. Keeping repo posts as-is (rather than
migrating the welcome post into Redis) preserves nice Markdown authoring for the rare
hand-written post and avoids re-seeding content.

### Unified BlogPost type (shape)

```
BlogPost {
  slug: string
  title: string
  description: string        // preheader for newsletters; description for repo posts
  pubDate: Date
  heroImage?: string         // blob URL or repo path
  tags: string[]             // normalized; 'newsletter' auto-added for sends
  author: string             // default "Diane Melton"
  featured: boolean
  source: 'repo' | 'redis'
  bodyHtml: string           // repo: rendered MD; redis: stored newsletter HTML
}
```

### Tag normalization (guardrail for free-text)

In `lib/blog.ts`, tags are normalized on save and when building the cloud/filters:
- trim whitespace
- collapse internal whitespace
- match/dedup case-insensitively (store a display label, key on lowercase)

So "Book Updates", "book updates", and " Book  Updates " collapse to one tag. This is
what makes free-text tags safe.

### Autopublish flow

```
Send Now  (api/newsletter.ts)            Scheduled (api/send-scheduled.ts)
        │                                          │
        └──── MailerLite send succeeds ────────────┘
                         │
                         ▼
        lib/blog.ts → publishPostFromNewsletter()
          title       = subject
          description = preheader
          bodyHtml    = buildNewsletterHtml(...)  (reused)
          pubDate     = send time
          tags        = ['newsletter', ...diane's tags]
          author      = 'Diane Melton'
          heroImage   = optional uploaded/generated image
                         │
                         ▼
                 Redis blog post (live on /blog)
```

- Autopublish fires **only on a successful send.** A failed campaign never creates a post.
- A **"Publish to blog when sent" checkbox (default ON)** and a **tags field** are added
  to the composer, so Diane keeps per-issue control without it being mandatory.
- Full newsletter content is published (good for SEO + gives visitors a reason to
  subscribe), with a Subscribe CTA appended to the post body.

### Images

- **Manual upload:** reuse existing auth-gated `api/upload-image.ts` (Vercel Blob).
  Returned blob URL becomes `heroImage`. (Confirm size/type constraints; reuse as-is.)
- **AI generation:** new auth-gated `api/generate-image.ts` → calls Gemini image
  generation with Diane's text prompt → uploads result to Blob → returns a URL in the
  same shape as a manual upload. Gemini key read from env (`GEMINI_API_KEY`); exact
  model + SDK to be confirmed via Context7 at build time. Available in the **newsletter
  composer** and **resources** image fields only — **not** homepage images.
- **Reusable component:** one `ImagePicker` admin component (manual upload + "✨ generate
  from description" + preview/regenerate) dropped into the **newsletter composer** and
  **resources** image fields. **NOT** the homepage image fields (homepage images are
  excluded). Identical behavior in both places; one place to maintain. Manual upload is
  always present as fallback.
- **UX guardrails:** clear "Generating…" state, regenerate button, plain-language errors
  (never raw API errors).

## Page / Route Changes

| Path | Change |
|---|---|
| `src/content/config.ts` | Remove required `category` enum; keep/standardize `tags: string[]`. |
| `src/lib/blog.ts` | **New.** Merge repo + Redis posts; normalize tags; `publishPostFromNewsletter()`. |
| `src/pages/blog/index.astro` | Read merged posts; replace category sidebar with **tag cloud**; rename "Musings & Updates" → "Blog"; wire signup form to hosted MailerLite form; remove dead `noindex` meta. |
| `src/pages/blog/[...slug].astro` | Read merged posts; render `bodyHtml`; fix `#tag` links to working `/blog/tag/<tag>`; remove dead `noindex`; related posts by shared tags. |
| `src/pages/blog/category/[category].astro` | **Delete.** |
| `src/pages/blog/tag/[tag].astro` | **New.** Filter merged posts by normalized tag. |
| `src/pages/rss.xml.js` | Read merged posts; align feed title with site "Blog" naming. |
| `src/components/Navigation.astro` | Add "Blog" nav link. |
| `src/content/blog/welcome-post.md` | Soften "comments" line → "reach out"/contact; retag to seed cloud (e.g. `book updates`, `behind the scenes`). |
| `src/pages/admin/newsletter.astro` | Add tags field, "Publish to blog" checkbox, `ImagePicker`. |
| `src/pages/api/newsletter.ts` | After successful send, call `publishPostFromNewsletter()`. |
| `src/pages/api/send-scheduled.ts` | After each successful send, call `publishPostFromNewsletter()`. |
| `src/lib/mailerlite.ts` | Fix stale "Book Updates" comment → "Subscribers." |
| `src/components/admin/ImagePicker.*` | **New.** Reusable upload + AI-generate field. Used in newsletter composer + resources only (NOT homepage). |
| `src/pages/api/generate-image.ts` | **New.** Auth-gated Gemini image gen → Blob → URL. |

## Error Handling

- Autopublish failure must **not** fail the send response: the newsletter going out is
  the critical path. If the blog write fails after a successful send, log it and still
  report the send as successful (blog post can be reconciled later). Never the reverse.
- AI image generation failures surface a plain-language message; manual upload remains
  available; no raw API errors shown.
- Tag filter route 404s gracefully (redirect to `/blog`) for unknown tags.

## Testing

- `lib/blog.ts`: tag normalization (case/whitespace dedup); merge ordering by date;
  unified type shape for both sources.
- Autopublish: success creates a Redis post with `newsletter` tag + Diane's tags;
  failed send creates **no** post; blog-write failure does not break the send result.
- Blog index/tag pages render merged repo + Redis posts; tag cloud counts correct.
- Signup forms POST to the hosted MailerLite form (smoke test).
- Image: manual upload returns a usable URL; AI endpoint is auth-gated and returns the
  same URL shape; failure path falls back to manual upload.

## Security Notes

- `BLOB_READ_WRITE_TOKEN` was exposed in chat during planning → **must be rotated** in
  Vercel before/at deploy; new value only in env.
- `GEMINI_API_KEY` lives only in env; never read into client code. The generate-image
  endpoint is auth-gated like other admin APIs (`verifySessionToken`).
- All new admin endpoints reuse the existing signed-session auth (`lib/auth.ts`).

## Explicitly Out of Scope (this round)

- Analytics dashboard (Tier 3) — deferred.
- Comment system — not built; copy softened instead.
- Multi-group MailerLite segmentation — consolidated to one group.
- Teaser/subscribe-gated posts — full content is published.
- Per-post hand-authoring UI in admin — autopublish replaces the need; rare hand-written
  posts remain repo Markdown.
```
