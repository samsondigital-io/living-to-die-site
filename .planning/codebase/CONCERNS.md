# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Admin Panel - Non-functional Features:**
- Issue: Admin CRUD operations don't persist data
- Files: `src/pages/admin/index.astro` (lines 346-412)
- Why: Placeholder implementation without backend
- Impact: Users may believe they're saving resources when nothing persists
- Fix approach: Implement actual API endpoints or mark as demo/placeholder

**Duplicate Homepage Versions:**
- Issue: Two different homepage implementations exist
- Files: `src/pages/index.astro`, `src/pages/index-v2.astro`
- Why: Design iteration without cleanup
- Impact: Maintenance burden, confusion about current design
- Fix approach: Delete non-current version or consolidate

**Newsletter Forms - No Backend:**
- Issue: Newsletter forms submit but don't save subscriptions
- Files: `src/components/Footer.astro` (lines 185-190), `src/pages/index.astro`, `src/pages/resources.astro`
- Why: Placeholder implementation
- Impact: Users believe they subscribed but emails aren't collected
- Fix approach: Integrate email service (Mailchimp, ConvertKit) or remove forms

## Known Bugs

**No critical bugs identified.**

The codebase is functional for its current static site purpose.

## Security Considerations

**Inline Error Handler:**
- Risk: Uses inline `onerror` attribute with hardcoded external URL
- File: `src/components/ResourceCard.astro` (line 21)
- Current mitigation: Only affects fallback images
- Recommendations: Use proper error handling component or CSS fallback

**Missing rel="noreferrer":**
- Risk: Information leakage on external link clicks
- Files: `src/components/ResourceCard.astro` (lines 28, 32)
- Current mitigation: `rel="noopener"` is present
- Recommendations: Add `noreferrer` for full privacy protection

**No environment variable protection:**
- Risk: Hardcoded site URL could cause issues in staging
- File: `astro.config.mjs` (line 8)
- Current mitigation: None
- Recommendations: Use `process.env.SITE_URL` with fallback

## Performance Bottlenecks

**External Image Dependencies:**
- Problem: Heavy use of external image URLs (Unsplash, placeholder.com)
- Files: Multiple pages and components
- Measurement: Adds external DNS lookups and potential failures
- Cause: Placeholder content not replaced with actual assets
- Improvement path: Replace with local images using Astro image optimization

## Fragile Areas

**API Route Error Handling:**
- File: `src/pages/api/og-image.ts`
- Why fragile: Catches all errors but doesn't log them
- Common failures: Network errors, invalid URLs, image fetch failures
- Safe modification: Add error logging before changing fetch logic
- Test coverage: None

## Scaling Limits

**Netlify Free Tier:**
- Current capacity: Suitable for low-traffic author website
- Limit: 100GB bandwidth/month on free tier
- Symptoms at limit: Site may become unavailable
- Scaling path: Upgrade to Pro tier if traffic increases

## Dependencies at Risk

**No critical dependency risks identified.**

All dependencies are actively maintained:
- Astro 5.x (current)
- @astrojs/* plugins (current)

## Missing Critical Features

**Category Filter Pages:**
- Problem: Category links reference pages that don't exist
- File: `src/pages/blog/index.astro` (lines 65-71)
- Current workaround: Users see 404 errors
- Blocks: Category-based blog navigation
- Implementation complexity: Low (create dynamic route)

**Search Functionality:**
- Problem: No way to search content
- Current workaround: Manual browsing
- Blocks: Finding specific posts/resources
- Implementation complexity: Medium (Pagefind or Algolia integration)

## Test Coverage Gaps

**Complete Test Gap:**
- What's not tested: Entire codebase (no tests exist)
- Risk: Changes could break functionality unnoticed
- Priority: Medium (static site has limited runtime behavior)
- Difficulty to test: Low for API routes, medium for components

**Priority areas to test:**
1. `src/pages/api/og-image.ts` - External API interaction
2. `src/content/config.ts` - Schema validation
3. Content collection queries - Data integrity

## Documentation Gaps

**Missing .env.example:**
- Issue: No documentation of required environment variables
- Impact: New developers don't know Netlify Identity setup
- Fix: Create `.env.example` documenting configuration

**Missing README:**
- Issue: No project README visible (or minimal)
- Impact: Onboarding friction
- Fix: Add comprehensive README with setup instructions

---

## Summary

| Category | Severity | Count |
|----------|----------|-------|
| Non-functional Features | Moderate | 2 |
| Configuration | Low | 2 |
| Missing Features | Low | 2 |
| Test Coverage | Low | 1 |
| Documentation | Low | 2 |

**Overall Assessment:** The codebase is clean and well-organized. Most issues are around incomplete/placeholder functionality rather than technical problems. The site functions correctly for its core purpose (static content display).

---

*Concerns audit: 2026-01-22*
*Update as issues are fixed or new ones discovered*
