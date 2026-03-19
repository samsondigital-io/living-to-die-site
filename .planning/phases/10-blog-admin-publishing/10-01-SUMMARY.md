---
phase: 10-newsletter-publishing
plan: 01
subsystem: api
tags: [mailerlite, newsletter, api, astro]

# Dependency graph
requires:
  - phase: 06-mailing-list
    provides: MailerLite account and subscriber group
  - phase: 09-email-templates
    provides: Newsletter HTML template structure
provides:
  - MailerLite API wrapper for campaign creation
  - Newsletter API endpoint for sending campaigns
  - Blog schema newsletter category
affects: [10-02-newsletter-ui]

# Tech tracking
tech-stack:
  added: [@mailerlite/mailerlite-nodejs]
  patterns: [MailerLite campaign API, template-based email building]

key-files:
  created: [src/lib/mailerlite.ts, src/pages/api/newsletter.ts]
  modified: [package.json, src/content/config.ts]

key-decisions:
  - "MailerLite-only approach for MVP - newsletters sent via API, blog persistence deferred"
  - "Dual-mode API: supports pre-built HTML or template-based content"

patterns-established:
  - "Newsletter template replacement: placeholder → content mapping"
  - "Structured result pattern: { success, campaignId?, error? }"

issues-created: []

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 10 Plan 01: Newsletter Backend Summary

**MailerLite SDK integration with API wrapper for campaign creation and newsletter endpoint**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T17:14:35Z
- **Completed:** 2026-03-19T17:17:33Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Installed @mailerlite/mailerlite-nodejs SDK
- Added 'newsletter' category to blog content schema
- Created MailerLite API wrapper with template processing
- Built auth-protected newsletter API endpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: Install MailerLite SDK and update blog schema** - `eb757b2` (feat)
2. **Task 2: Create MailerLite API wrapper** - `9b5eba3` (feat)
3. **Task 3: Create newsletter API endpoint** - `2fce543` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `package.json` - Added @mailerlite/mailerlite-nodejs dependency
- `src/content/config.ts` - Added newsletter category to blog schema enum
- `src/lib/mailerlite.ts` - MailerLite API wrapper with createAndSendNewsletter, buildNewsletterHtml, sendNewsletterFromTemplate
- `src/pages/api/newsletter.ts` - POST /api/newsletter endpoint with admin auth

## Decisions Made

- **MailerLite-only approach:** Newsletter sending without blog post persistence. Plan noted that file creation at runtime isn't possible with Vercel SSR, so newsletters go directly to MailerLite. Blog persistence deferred as future enhancement.
- **Dual-mode API:** Endpoint accepts either pre-built HTML (htmlContent) or structured content with template (useTemplate: true). Provides flexibility for different admin UI approaches.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected MailerLite package name**
- **Found during:** Task 1 (SDK installation)
- **Issue:** Plan specified `mailerlite-nodejs` but correct npm package is `@mailerlite/mailerlite-nodejs`
- **Fix:** Used npm search to find correct scoped package name
- **Verification:** Package installed successfully, types available

**2. [Rule 1 - Bug] Fixed schedule() API call signature**
- **Found during:** Task 2 (API wrapper creation)
- **Issue:** Initial call used object form `{ id, delivery }` but SDK expects `(campaign_id, params)` signature
- **Fix:** Changed to `schedule(String(campaignId), { delivery: 'instant' })`
- **Verification:** TypeScript compiles, build passes

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug), 0 deferred
**Impact on plan:** Minor API corrections, no scope change.

## Issues Encountered

None

## Next Step

Ready for 10-02-PLAN.md (Newsletter Admin UI)

---
*Phase: 10-newsletter-publishing*
*Completed: 2026-03-19*
