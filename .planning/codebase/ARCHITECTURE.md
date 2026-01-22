# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Static Site Generator with Content Management

**Key Characteristics:**
- File-based content collections (Markdown with frontmatter)
- Component-based UI with Astro components
- Zero JavaScript by default (opt-in interactivity)
- Static HTML output at build time
- Content Collections API for structured data

## Layers

**Presentation Layer (Pages):**
- Purpose: Route handling and page rendering
- Contains: Astro page components with data fetching
- Location: `src/pages/**/*.astro`
- Depends on: Layouts, Components, Content Collections
- Used by: End users via browser

**Layout Layer (Templates):**
- Purpose: Page wrapper with shared elements (nav, footer, meta)
- Contains: BaseLayout component
- Location: `src/layouts/BaseLayout.astro`
- Depends on: Components (Navigation, Footer)
- Used by: All pages

**Component Layer (UI):**
- Purpose: Reusable UI elements
- Contains: Navigation, Footer, ResourceCard
- Location: `src/components/*.astro`
- Depends on: Styles (CSS custom properties)
- Used by: Pages and Layouts

**Content Layer (Data):**
- Purpose: Structured content with schema validation
- Contains: Markdown files with Zod schemas
- Location: `src/content/**/*.md`, `src/content/config.ts`
- Depends on: Nothing (source of truth)
- Used by: Pages via `getCollection()`

**API Layer (Server Logic):**
- Purpose: Server-side endpoints
- Contains: OG image proxy, RSS feed
- Location: `src/pages/api/*.ts`, `src/pages/rss.xml.js`
- Depends on: External APIs, Content Collections
- Used by: External services, browsers

**Styling Layer (Design System):**
- Purpose: Visual design tokens and base styles
- Contains: CSS custom properties, resets, utilities
- Location: `src/styles/global.css`, `src/styles/global-v2.css`
- Depends on: Nothing
- Used by: All components and pages

## Data Flow

**Static Generation (Build Time):**

1. Astro reads Markdown files in `src/content/`
2. Zod schemas in `config.ts` validate frontmatter
3. Pages call `getCollection()` to fetch typed content
4. Components render HTML with scoped CSS
5. Static files output to `dist/` for hosting

**Runtime Flow (Browser):**

1. Browser requests page (e.g., `/blog/my-post`)
2. CDN serves pre-built HTML
3. Client-side scripts execute (Navigation toggle, forms)
4. No API calls needed for content (already rendered)

**State Management:**
- File-based: All content in `src/content/` directory
- No persistent in-memory state
- Each page build is independent

## Key Abstractions

**Content Collection:**
- Purpose: Typed content with schema validation
- Examples: `blog`, `poetry`, `publications`, `resources`
- Location: `src/content/config.ts`
- Pattern: Zod schema defines structure, Markdown provides content

**Layout:**
- Purpose: Page template with shared elements
- Examples: `BaseLayout.astro`
- Location: `src/layouts/`
- Pattern: Wraps page content, includes nav/footer/meta

**Component:**
- Purpose: Reusable UI element with props
- Examples: `Navigation.astro`, `Footer.astro`, `ResourceCard.astro`
- Location: `src/components/`
- Pattern: Props interface + template + scoped styles

**API Route:**
- Purpose: Server-side endpoint
- Examples: `og-image.ts` (image proxy)
- Location: `src/pages/api/`
- Pattern: Export `GET`/`POST` function returning `Response`

## Entry Points

**Build Entry:**
- Location: `astro.config.mjs`
- Triggers: `npm run build`
- Responsibilities: Configure site, integrations, markdown processing

**Page Entry Points:**
- Location: `src/pages/index.astro` (homepage)
- Triggers: Browser navigation
- Responsibilities: Fetch content, render page, apply layout

**API Entry Points:**
- Location: `src/pages/api/og-image.ts`
- Triggers: HTTP GET request
- Responsibilities: Fetch external image, proxy response

## Error Handling

**Strategy:** Astro's built-in error handling with try/catch at API boundaries

**Patterns:**
- API routes use try/catch with fallback responses (`og-image.ts`)
- Content validation at build time via Zod schemas
- No runtime error boundaries (static site)

## Cross-Cutting Concerns

**Logging:**
- Console.log for development debugging
- No production logging (static site)

**Validation:**
- Zod schemas for content collections (`src/content/config.ts`)
- HTML5 form validation for user input
- TypeScript for type checking

**SEO:**
- Open Graph meta tags in `BaseLayout.astro`
- Sitemap generation via `@astrojs/sitemap`
- RSS feed via `@astrojs/rss`

**Authentication:**
- Netlify Identity for CMS admin access
- No user authentication for public pages

---

*Architecture analysis: 2026-01-22*
*Update when major patterns change*
