# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- PascalCase for Astro components: `Navigation.astro`, `BaseLayout.astro`, `ResourceCard.astro`
- kebab-case for other files: `og-image.ts`, `global-v2.css`, `rss.xml.js`
- `index.astro` for directory default pages
- `[...slug].astro` for dynamic catch-all routes

**Functions:**
- camelCase for all functions: `getStaticPaths`, `getCollection`
- No special prefix for async functions
- Event handlers inline in scripts: `addEventListener('click', () => {})`

**Variables:**
- camelCase for variables: `latestPosts`, `allBlogPosts`
- UPPER_SNAKE_CASE not used (no constants observed)
- No underscore prefix for private

**Types:**
- PascalCase for interfaces: `Props`, `CollectionEntry`
- No I prefix: `Props` not `IProps`
- TypeScript strict mode enabled

## Code Style

**Formatting:**
- 2-space indentation throughout
- Single quotes for strings
- Semicolons required at end of statements
- ~80-100 character line length (soft limit)

**Linting:**
- ESLint: Not configured
- Prettier: Not configured
- TypeScript strict mode provides some linting

## Import Organization

**Order:**
1. Astro/framework imports: `import { getCollection } from 'astro:content';`
2. Local components: `import BaseLayout from '../layouts/BaseLayout.astro';`
3. Type imports: `import type { CollectionEntry } from 'astro:content';`

**Grouping:**
- Imports grouped by source
- No enforced sorting (no ESLint)

**Path Aliases:**
- None configured (uses relative paths)

## Error Handling

**Patterns:**
- try/catch in API routes (`src/pages/api/og-image.ts`)
- Fallback returns for error cases
- No custom error classes

**Error Types:**
- Return fallback response on fetch errors
- No explicit error throwing in components

## Logging

**Framework:**
- console.log for development
- No production logging configured

**Patterns:**
- Minimal logging in source
- Admin form logs to console: `console.log('Resource data:', ...)`

## Comments

**When to Comment:**
- Explain why, not what
- Section headers in CSS: `/* Post Content */`
- Inline comments for complex regex or logic

**JSDoc/TSDoc:**
- Not used (TypeScript interfaces provide documentation)

**TODO Comments:**
- None found in codebase

## Function Design

**Size:**
- Functions generally short
- Complex logic extracted to helpers

**Parameters:**
- Props interface for component parameters
- Destructuring in component frontmatter: `const { title, description } = Astro.props;`

**Return Values:**
- Explicit returns in TypeScript
- Components return JSX-like template

## Module Design

**Exports:**
- Named exports for API routes: `export const GET: APIRoute`
- Default export not used in Astro components (implicit)

**Barrel Files:**
- Not used (direct imports)

## CSS Conventions

**Methodology:**
- BEM (Block Element Modifier): `.component__element--modifier`
- Examples:
  - `.nav__container` (block + element)
  - `.nav__link` (block + element)
  - `.category-badge--news` (block + modifier)

**CSS Custom Properties:**
- Design tokens in `:root`: `--color-primary`, `--font-heading`
- Component-specific properties not used

**Scoped Styles:**
- `<style>` blocks in Astro components
- Styles automatically scoped to component

**Responsive Design:**
- Mobile-first with `@media (max-width: 768px)`
- `clamp()` for fluid typography
- Flexbox and CSS Grid for layouts

## Content Conventions

**Frontmatter:**
- camelCase for field names: `pubDate`, `heroImage`, `featured`
- Required fields: `title`, `description`, `pubDate`
- Optional fields marked in Zod schema

**Markdown:**
- Standard Markdown with frontmatter
- MDX support enabled for JSX in content

---

*Convention analysis: 2026-01-22*
*Update when patterns change*
