---
status: resolved
trigger: "the blog is broken. I haven't worked on it for a while. Can you take a look"
created: 2026-03-19T10:30:00Z
updated: 2026-03-19T10:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - Astro 5.x removed render() from collection entries
test: Applying fix - import render from astro:content, use render(post)
expecting: Blog pages load without TypeError
next_action: Fix blog/[...slug].astro import and render call

## Symptoms

expected: Blog should show newsletter posts. Ideally auto-publish from MailerLite campaigns.
actual: TypeError crashes page - "post.render is not a function"
errors: TypeError: post.render is not a function at blog/[...slug].astro:15:32
reproduction: Click any blog category or post
started: Unknown - hasn't been worked on for a while

## Eliminated

[none yet]

## Evidence

- timestamp: 2026-03-19T10:32:00Z
  checked: Astro version in package.json
  found: astro ^5.16.14
  implication: Using Astro 5.x which has breaking API changes

- timestamp: 2026-03-19T10:32:00Z
  checked: blog/[...slug].astro line 15
  found: `const { Content } = await post.render();`
  implication: Using old Astro 4.x render() API - this method was removed in Astro 5.x

- timestamp: 2026-03-19T10:32:00Z
  checked: Astro 5.x migration guide
  found: render() moved from entry method to separate function import from astro:content
  implication: Need to change `post.render()` to `render(post)`

- timestamp: 2026-03-19T10:35:00Z
  checked: Blog index page (src/pages/blog/index.astro)
  found: Line 68 links to `/blog/category/${category}` but no page exists for those URLs
  implication: Catch-all route treats category URLs as post slugs → undefined post → error

## Resolution

root_cause: Three issues - (1) Astro 5.x render() API change, (2) Missing category pages, (3) SSR mode ignores getStaticPaths props
fix: (1) Import `render` from 'astro:content', use `render(post)`. (2) Create category/[category].astro page. (3) Fetch post by slug from params instead of relying on props.
verification: User confirmed categories and individual posts now load correctly
files_changed: [src/pages/blog/[...slug].astro, src/pages/blog/category/[category].astro]
