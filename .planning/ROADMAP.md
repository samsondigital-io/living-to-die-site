# Roadmap: Living to Die Author Website

## Overview

Transform the existing Astro site from a rough draft into a polished author platform. We'll streamline navigation, clean up resources, update content, refine the footer, and apply visual polish—delivering a trustworthy presence for Diane Melton's upcoming book.

## Domain Expertise

None

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Navigation & Structure** - Streamline nav, add Contact to header, implement scroll behavior
- [x] **Phase 2: Resource Cleanup** - Audit resources for legitimacy, simplify to single-button links, fix external linking
- [x] **Phase 3: Content Updates** - Fix book date, remove placeholders, create Contact section
- [x] **Phase 4: Footer Refinements** - Newsletter form UI, remove social/media kit links
- [x] **Phase 5: Visual Polish** - Spacing, typography, and consistency improvements
- [x] **Phase 6: Mailing List** - Implement functional mailing list integration
- [x] **Phase 7: Content Changes** - Apply copy edits from stakeholder review meeting
- [x] **Phase 8: SEO** - Search engine optimization and discoverability
- [ ] **Phase 9: Email Templates** - Custom MailerLite email templates matching site branding
- [ ] **Phase 10: Newsletter Publishing** - Admin page to compose and send newsletters via MailerLite

## Phase Details

### Phase 1: Navigation & Structure

**Goal**: Clean, focused navigation with intuitive UX
**Depends on**: Nothing (first phase)
**Research**: Unlikely (internal Astro patterns, CSS)
**Plans**: 1 plan

Plans:

- [x] 01-01: Streamline nav items and add hide-on-scroll behavior

Key work:

- Streamline nav to: Home, About, Resources, Contact
- Hide Poetry, Musings, Publications from nav (preserve functionality)
- Add Contact section/link to header
- Implement header scroll behavior (slide up on scroll down)

### Phase 2: Resource Cleanup

**Goal**: Trustworthy, verified resource links
**Depends on**: Phase 1
**Research**: Unlikely (content audit and verification)
**Plans**: 1 plan

Plans:

- [x] 02-01: Remove questionable resources and simplify to single-link cards

Key work:

- Review all resources for legitimacy (remove fake sites)
- Revise to single button links to main sites
- Ensure all links open in new tab (target \_blank)
- Pull proper OG images for all resource organizations

### Phase 3: Content Updates

**Goal**: Accurate, current content across the site
**Depends on**: Phase 2
**Research**: Unlikely (content changes, Astro templates)
**Plans**: 1 plan

Plans:

- [x] 03-01: Fix dates, remove testimonials, add Contact page

Key work:

- Fix book release date: 2026 not 2024
- Remove "praise" section (placeholder content)
- Create Contact section with speaking engagements / booking info

### Phase 4: Footer Refinements

**Goal**: Focused footer with newsletter signup
**Depends on**: Phase 3
**Research**: Unlikely (form UI without backend)
**Plans**: 1 plan

Plans:

- [x] 04-01: Remove social icons, fix broken links

Key work:

- Remove social media links
- Remove media kit link
- Change "Stay Connected" to Newsletter signup form (UI only, no Mailchimp backend)

### Phase 5: Visual Polish

**Goal**: Professional, cohesive visual presentation
**Depends on**: Phase 4
**Research**: Unlikely (CSS refinements)
**Plans**: 1 plan

Plans:

- [x] 05-01: Author photo, resource OG images, spacing fixes

Key work:

- Polish spacing throughout
- Refine typography
- Ensure visual consistency
- Enhance presentation where opportunity exists

### Phase 6: Mailing List

**Goal**: Functional mailing list signup with backend integration
**Depends on**: Phase 5
**Research**: Complete (MailerLite selected)
**Plans**: 1 plan

Plans:

- [x] 06-01: Connect newsletter forms to MailerLite

Key work:

- Connect newsletter form to email service provider
- Handle form submission and validation
- Implement success/error states
- Consider double opt-in flow

### Phase 7: Content Changes

**Goal**: Apply all copy edits from stakeholder review meeting
**Depends on**: Phase 6
**Research**: None (changes specified)
**Plans**: 1 plan

Plans:

- [x] 07-01: Apply copy changes from meeting review

Key work:

- Replace "hope" with "hope" sitewide
- Capitalize "T" in "Living To Die"
- Change "medical injustice" → "medical negligence"
- Change "memoir" → "non-fiction account"
- Change "devotion to storytelling" → "devotion to writing"
- Remove "hope communities" from Ideal For
- Change "Reserve Your Copy" → "Notify Me When Available"
- Remove "final years" from book description
- Change "Stay Connected" → "Join the Newsletter"
- Replace author photo with realistic version

### Phase 8: SEO

**Goal**: Search engine optimization and discoverability
**Depends on**: Phase 7
**Research**: None needed (using existing Astro patterns and installed packages)
**Plans**: 1 plan

Plans:

- [x] 08-01: Meta optimization, robots.txt, and structured data

Key work:

- Meta tags and Open Graph optimization
- Sitemap and robots.txt configuration
- Structured data (schema.org)
- Page titles and descriptions
- Image alt text audit
- Performance optimization for Core Web Vitals

### Phase 9: Email Templates

**Goal**: Custom MailerLite email templates matching site branding
**Depends on**: Phase 8
**Research**: Likely (MailerLite template system, HTML email best practices)
**Plans**: 0 plans

Plans:

- [ ] TBD (run /gsd:plan-phase 9 to break down)

Key work:

- Welcome email template for new subscribers
- Book release notification template
- General newsletter template
- Brand-aligned design (rose/sage colors, typography)
- Mobile-responsive HTML email structure
- Upload and configure templates in MailerLite

### Phase 10: Newsletter Publishing

**Goal**: Admin interface to compose newsletters that send via MailerLite to subscribers
**Depends on**: Phase 9
**Research**: Complete (MailerLite API documented)
**Plans**: 2 plans

Plans:

- [ ] 10-01: MailerLite API setup + Newsletter backend
- [ ] 10-02: Newsletter admin UI with compose and send

Key work:

- Install MailerLite Node.js SDK
- Add 'newsletter' category to blog schema
- Create MailerLite API wrapper for campaign creation
- Newsletter API endpoint (POST /api/newsletter)
- Admin page at /admin/newsletter with compose form
- Preview and send functionality
- Uses branded email template from Phase 9

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase                     | Plans Complete | Status   | Completed  |
| ------------------------- | -------------- | -------- | ---------- |
| 1. Navigation & Structure | 1/1            | Complete | 2026-01-22 |
| 2. Resource Cleanup       | 1/1            | Complete | 2026-01-22 |
| 3. Content Updates        | 1/1            | Complete | 2026-01-22 |
| 4. Footer Refinements     | 1/1            | Complete | 2026-01-22 |
| 5. Visual Polish          | 1/1            | Complete | 2026-01-22 |
| 6. Mailing List           | 1/1            | Complete | 2026-03-13 |
| 7. Content Changes        | 1/1            | Complete | 2026-03-14 |
| 8. SEO                    | 1/1            | Complete | 2026-03-14 |
| 9. Email Templates        | 0/0            | Not Started | — |
| 10. Newsletter Publishing | 0/2            | Planned | — |
