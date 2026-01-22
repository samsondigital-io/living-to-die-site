# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5.x (strict mode) - All application code (`tsconfig.json`, `src/**/*.ts`)
- Astro Component Syntax - Page and component templates (`src/**/*.astro`)

**Secondary:**
- JavaScript - Build scripts, config files, RSS feed (`rss.xml.js`)
- CSS - Global styles and scoped component styles (`src/styles/`)
- YAML - CMS configuration (`public/admin/config.yml`)
- TOML - Deployment configuration (`netlify.toml`)

## Runtime

**Environment:**
- Node.js 18.x (specified in `netlify.toml`)
- Static site generation (no server runtime required in production)

**Package Manager:**
- npm (package manager)
- Lockfile: `package-lock.json` (v3 format)

## Frameworks

**Core:**
- Astro 5.16.14 - Static site generator with content collections (`package.json`)

**Astro Integrations:**
- @astrojs/mdx 4.3.13 - MDX support for enhanced Markdown (`astro.config.mjs`)
- @astrojs/rss 4.0.15 - RSS feed generation (`src/pages/rss.xml.js`)
- @astrojs/sitemap 3.7.0 - Automatic sitemap generation (`astro.config.mjs`)

**Third-party:**
- astro-seo 0.8.4 - SEO metadata management (`package.json`)

**Testing:**
- Not configured (no test framework installed)

**Build/Dev:**
- Vite (built into Astro) - Bundler and development server
- TypeScript compiler - Strict mode enabled
- Shiki - Syntax highlighting with github-light theme (`astro.config.mjs`)

## Key Dependencies

**Critical:**
- zod - Schema validation for content collections (`src/content/config.ts`)
- Astro Content Collections API - Structured content management

**Infrastructure:**
- Node.js built-ins - fs, path for file operations
- Fetch API - Used in `og-image.ts` for external requests

## Configuration

**Environment:**
- No environment variables required for development
- Site URL configured in `astro.config.mjs`: `https://livingtodie.com`
- Netlify Identity requires configuration via Netlify dashboard

**Build:**
- `astro.config.mjs` - Site URL, integrations, markdown settings
- `tsconfig.json` - TypeScript strict mode, extends `astro/tsconfigs/strict`
- `netlify.toml` - Build command, publish directory, headers, redirects

**Scripts:**
```bash
npm run dev      # Local dev server (localhost:4321)
npm run build    # Production build to ./dist/
npm run preview  # Preview production build
```

## Platform Requirements

**Development:**
- Any platform with Node.js 18+
- No external dependencies or Docker required

**Production:**
- Netlify hosting (configured in `netlify.toml`)
- Automatic deploys on main branch push
- Static file output to `dist/` directory

---

*Stack analysis: 2026-01-22*
*Update after major dependency changes*
