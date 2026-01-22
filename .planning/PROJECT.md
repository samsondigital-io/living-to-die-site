# Living to Die — Author Website

## What This Is

An author website for Diane Melton promoting her book "Living to Die" (coming 2026). The site showcases the book, provides curated resources for readers, and offers contact information for speaking engagements. Built for a general audience seeking information about the book and its themes.

## Core Value

**A polished, trustworthy author presence** — visitors should immediately understand who Diane is, what the book is about, and how to connect with her.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Astro static site with content collections — existing
- ✓ Navigation and footer components — existing
- ✓ BaseLayout with SEO meta tags — existing
- ✓ Resource cards with external linking — existing
- ✓ Decap CMS integration for content management — existing
- ✓ Netlify hosting with automatic deploys — existing
- ✓ RSS feed generation — existing
- ✓ Sitemap generation — existing

### Active

<!-- Current scope. Building toward these. -->

**Navigation & Structure:**
- [ ] Streamline nav to: Home, About, Resources, Contact
- [ ] Remove Poetry, Musings, Publications from nav (keep functionality for future)
- [ ] Add Contact section to header
- [ ] Implement header scroll behavior (slide up on scroll down)

**Resources:**
- [ ] Review all resources for legitimacy (remove fake sites like MedicalMalpracticeCenter.com)
- [ ] Revise resources to single button links to main sites
- [ ] Ensure all resource links open in new tab (target _blank)
- [ ] Pull proper OG images for all resource organizations

**Content Updates:**
- [ ] Fix book release date: 2026 not 2024
- [ ] Remove "praise" section (for now)
- [ ] Create Contact section with speaking engagements / booking info

**Footer:**
- [ ] Remove social media links
- [ ] Remove media kit
- [ ] Change "Stay Connected" to Newsletter signup form

**Visual Refinements:**
- [ ] Polish spacing, typography, consistency
- [ ] Enhance visual presentation where opportunity exists

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Newsletter backend (Mailchimp integration) — future phase, form UI only for now
- Blog functionality — exists but not active, implement later
- E-commerce / book sales — not selling directly on site
- Poetry, Musings, Publications pages — functionality preserved, just hidden from nav for now

## Context

This is a personal project being built for the user's mother, author Diane Melton. The site promotes her upcoming book "Living to Die" (2026) and serves as her author platform.

**Current state:**
- Existing Astro 5.x codebase with content collections
- Some non-functional features (admin panel CRUD doesn't persist, newsletter forms don't submit)
- Multiple resources that may be fake or have broken links
- Outdated book release date (shows 2024)
- Some placeholder content (praise section)

**Codebase documented in:**
- `.planning/codebase/` (7 documents mapping architecture, stack, conventions, etc.)

## Constraints

- **Stack**: Astro, Netlify, Decap CMS — must stay on current infrastructure
- **Timeline**: None specified — quality over speed

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep content collection functionality hidden rather than deleted | May want Poetry/Publications later | — Pending |
| Newsletter form UI without backend | Mailchimp integration is future phase | — Pending |
| Trust Claude's judgment on visual refinements | User open to improvements | — Pending |

---
*Last updated: 2026-01-22 after initialization*
