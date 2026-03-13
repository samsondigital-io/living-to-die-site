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
- [ ] **Phase 6: Mailing List** - Implement functional mailing list integration

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
- Ensure all links open in new tab (target _blank)
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
**Research**: Likely (email service provider options, API integration)
**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6 to break down)

Key work:
- Connect newsletter form to email service provider
- Handle form submission and validation
- Implement success/error states
- Consider double opt-in flow

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Navigation & Structure | 1/1 | Complete | 2026-01-22 |
| 2. Resource Cleanup | 1/1 | Complete | 2026-01-22 |
| 3. Content Updates | 1/1 | Complete | 2026-01-22 |
| 4. Footer Refinements | 1/1 | Complete | 2026-01-22 |
| 5. Visual Polish | 1/1 | Complete | 2026-01-22 |
| 6. Mailing List | 0/0 | Not Started | — |
