# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**Content Management:**
- Decap CMS (formerly Netlify CMS) - Headless CMS for content
  - Version: 3.0.0 (CDN: `https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js`)
  - Location: `public/admin/index.html`, `public/admin/config.yml`
  - Auth: Git Gateway via Netlify Identity
  - Features: Editorial workflow, media library, Markdown editor

**Payment Processing:**
- Not implemented

**Email/SMS:**
- Not implemented (placeholder forms exist)

**External APIs:**
- None (static content only)

## Data Storage

**Databases:**
- None (Git-based content storage via Decap CMS)

**File Storage:**
- Git repository - All content stored in `src/content/`
- Media uploads - `public/images/uploads/` (configured in CMS)

**Caching:**
- Netlify CDN - Automatic edge caching
- No application-level caching

## Authentication & Identity

**Auth Provider:**
- Netlify Identity - User authentication for CMS admin
  - Widget: `https://identity.netlify.com/v1/netlify-identity-widget.js`
  - Location: `src/layouts/BaseLayout.astro` (lines 47, 58-69)
  - Configuration: Netlify dashboard

**OAuth Integrations:**
- Available via Netlify Identity (Google, GitHub, etc.)
- Configuration: Netlify dashboard

## Monitoring & Observability

**Error Tracking:**
- Not configured

**Analytics:**
- Not configured

**Logs:**
- Vercel/Netlify logs (stdout/stderr)
- No application logging

## CI/CD & Deployment

**Hosting:**
- Netlify - Static site hosting
  - Config: `netlify.toml`
  - Build command: `npm run build`
  - Publish directory: `dist/`
  - Node version: 18

**CI Pipeline:**
- Netlify automatic builds on push
- No separate CI workflow configured

## Environment Configuration

**Development:**
- Required env vars: None for local development
- Secrets location: Not required (static site)
- Services: Local `npm run dev` with hot reload

**Staging:**
- Not configured (could use Netlify branch deploys)

**Production:**
- Domain: `https://livingtodie.com` (configured in `astro.config.mjs`)
- Secrets: Managed in Netlify dashboard (Identity, Git Gateway)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## CDN & External Resources

**Font CDN:**
- Google Fonts - `https://fonts.googleapis.com`
  - Location: `src/layouts/BaseLayout.astro` (lines 42-44)
  - Fonts: Crimson Text, Inter, DM Sans

**Image CDN:**
- Unsplash - Fallback images
  - Location: `src/pages/api/og-image.ts`, `src/components/ResourceCard.astro`
  - Usage: Default/error fallback images
- Placeholder.com - Temporary placeholders
  - Location: `src/pages/index.astro`

**CMS CDN:**
- Unpkg - Decap CMS distribution
  - Location: `public/admin/index.html`

## Security Headers

**Configured in `netlify.toml`:**
- X-Frame-Options: DENY (SAMEORIGIN for /admin/*)
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Not Implemented

**Services NOT configured:**
- Email/Newsletter service (forms exist but no backend)
- Analytics (Google Analytics, Segment, etc.)
- Error tracking (Sentry, etc.)
- Payment processing
- Chat/Support widgets
- Search functionality

---

*Integration audit: 2026-01-22*
*Update when adding/removing external services*
