# Daylight Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved "Daylight" design schema — blush/pink palette, pill buttons, CSS 3D book hero, taped-polaroid artwork, numbered feature chips — to every public page of the Living To Die Astro site, folding in the accessibility and performance fixes from the 2026-07-22 landing-page review.

**Architecture:** The design source of truth is the committed mockup `mockups-daylight/full-b-daylight.html` (approved by Matt on 2026-07-22). All pages share `src/styles/global-v2.css` + `BaseLayout.astro`, so the work proceeds foundation-first: tokens → layout/nav/footer → homepage → secondary pages → sweep. Every page keeps its current section structure and content; only styling and the hero change ("restyled, not restructured").

**Tech Stack:** Astro 4, scoped component styles + `global-v2.css`, vitest (existing lib tests), Playwright MCP for visual verification. No new dependencies.

**Branch:** `redesign/daylight` (created from `main` at ba802b2).

**Out of scope:** `/admin/*` pages (internal tooling), `src/pages/api/*`, email templates, content changes. `index-v2.astro` is deleted as dead code (Task 8) — flag to Matt before executing that task if uncertain.

---

## Design Reference Card

Copy values from here; do not invent new ones. Full reference: `mockups-daylight/full-b-daylight.html`.

| Token | Value | Usage |
|---|---|---|
| `--color-blush` | `#fdf2f7` | section tints, chips bg |
| `--color-blush-deep` | `#f8e3ef` | gradient ends |
| `--color-pink` | `#d63384` | primary actions, accents |
| `--color-pink-dark` | `#b52a6f` | headings, hover, footer bg |
| `--color-pink-light` | `#e85da0` | gradients, focus ring |
| Buttons | `border-radius: 999px` (pill), Montserrat 700 | all `.btn` |
| Display headings | Montserrat 800, color `--color-pink-dark` | `h2.display` pattern |
| Eyebrow | Montserrat 700, 0.72rem, `letter-spacing: .3em`, uppercase, pink | section kickers |
| Cards | `border-radius: 20px`, `--shadow-md` → `--shadow-xl` on hover, `translateY(-6px)` | feature/resource cards |
| Number chips | 3rem square, `border-radius: 12px`, pink→pink-light 135deg gradient | structure cards |
| Hero book | CSS 3D component, `--bk-w: min(31vw, 480px)`, `rotateY(24deg)` | homepage hero |
| Polaroid | white frame, `rotate(-2.5deg)`, two pink tape corners | window artwork |
| Cover art | `/book-cover-official.webp` (152K, in `public/`) | Book3D front face |

Accessibility invariants (apply everywhere, verified in Task 12):
- No `outline: none` without a `:focus-visible` replacement ring (`outline: 2px solid var(--color-pink); outline-offset: 3px`).
- Every input has a `<label>` (visually hidden `.sr-only` is fine).
- Form success/error messages live in an `aria-live="polite"` element that exists at page load.
- `scroll-behavior: smooth` and all animations wrapped in `@media (prefers-reduced-motion: ...)`.
- No `transition: all`. No `vh` for hero heights — use `svh`.
- Every `<img>` has explicit `width`/`height`. `target="_blank"` ⇒ `rel="noopener noreferrer"`.

---

### Task 1: Daylight tokens + shared patterns in `global-v2.css`

**Files:**
- Modify: `src/styles/global-v2.css`

- [ ] **Step 1: Replace the color palette block** (lines ~11-44). The old "sage" names carry pink values — rename honestly, keep legacy aliases so unmigrated pages don't break:

```css
:root {
  /* Colors - Neutrals */
  --color-soft-black: #1a1a1a;
  --color-warm-gray: #4a4a4a;
  --color-light-gray: #757575;
  --color-soft-white: #fdfdf9;
  --color-pure-white: #ffffff;

  /* Colors - Daylight palette */
  --color-pink: #d63384;
  --color-pink-dark: #b52a6f;
  --color-pink-light: #e85da0;
  --color-blush: #fdf2f7;
  --color-blush-deep: #f8e3ef;
  --color-cream: #fef7fb;

  /* Legacy aliases (do not use in new code; removed in Task 12) */
  --color-sage: var(--color-pink);
  --color-sage-dark: var(--color-pink-dark);
  --color-sage-light: var(--color-pink-light);
  --color-rose: var(--color-pink);
  --color-rose-dark: var(--color-pink-dark);
  --color-beige: var(--color-blush);

  /* Semantic */
  --color-primary: var(--color-pink);
  --color-primary-dark: var(--color-pink-dark);
  --color-primary-light: var(--color-pink-light);
  --color-accent: var(--color-pink);
  --color-accent-dark: var(--color-pink-dark);
  --color-background: var(--color-soft-white);
  --color-surface: var(--color-pure-white);
  --color-text: var(--color-soft-black);
  --color-text-light: var(--color-warm-gray);
  --color-text-lighter: var(--color-light-gray);
  --color-border: rgba(0, 0, 0, 0.08);

  /* Gradients */
  --gradient-soft: linear-gradient(180deg, var(--color-soft-white) 0%, var(--color-blush) 100%);
  --gradient-warm: linear-gradient(135deg, var(--color-blush) 0%, var(--color-blush-deep) 100%);
  --gradient-chip: linear-gradient(135deg, var(--color-pink) 0%, var(--color-pink-light) 100%);
}
```

Keep the existing typography/spacing/shadow/z-index variables unchanged.

- [ ] **Step 2: Fix motion + overflow base styles.** Replace the bare `scroll-behavior: smooth` on `html` with:

```css
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

- [ ] **Step 3: Rebuild `.btn` as pills, kill `transition: all`.** Replace the Buttons section:

```css
.btn {
  display: inline-block;
  padding: 1rem 2.1rem;
  font-family: var(--font-accent);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.04em;
  text-align: center;
  text-decoration: none;
  border: 2px solid transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background-color var(--transition-base), color var(--transition-base),
              border-color var(--transition-base), transform var(--transition-base),
              box-shadow var(--transition-base);
}
.btn--primary { background: var(--color-pink); color: var(--color-pure-white); }
.btn--primary:hover {
  background: var(--color-pink-dark);
  color: var(--color-pure-white);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.btn--secondary { background: transparent; color: var(--color-pink); border-color: var(--color-pink); }
.btn--secondary:hover { background: var(--color-pink); color: var(--color-pure-white); transform: translateY(-2px); }
```

(Keep `.btn--ghost` as is, but change its transition to `text-decoration-color var(--transition-base)` only — already true.)

- [ ] **Step 4: Real focus states.** Replace the `input:focus { outline: none; ... }` block:

```css
input:focus, textarea:focus, select:focus { border-color: var(--color-pink); }
input:focus-visible, textarea:focus-visible, select:focus-visible,
a:focus-visible, button:focus-visible {
  outline: 2px solid var(--color-pink);
  outline-offset: 3px;
}
```

Also change `.card` transition (already `transform, box-shadow` — leave) and add shared patterns used by every page:

```css
.eyebrow {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--color-pink);
  margin-bottom: 1.1rem;
}
.display {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.8vw, 2.9rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.01em;
  color: var(--color-pink-dark);
  margin-bottom: 1.5rem;
}
.sr-only {
  position: absolute; width: 1px; height: 1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
}
.form-status { display: none; color: var(--color-pink-dark); font-style: italic; margin-top: 1rem; }
.form-status.show { display: block; }
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/styles/global-v2.css
git commit -m "feat(daylight): design tokens, pill buttons, focus-visible states, shared patterns"
```

---

### Task 2: BaseLayout — metadata, skip link, deferred admin script

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Absolute OG image + og:url.** In the frontmatter, after `canonicalURL`, add `const ogImage = new URL(image, Astro.site);` and use it:

```astro
<meta property="og:url" content={canonicalURL} />
<meta property="og:image" content={ogImage} />
...
<meta name="twitter:image" content={ogImage} />
```

- [ ] **Step 2: Defer the Netlify Identity widget** (it is admin-only and render-blocking):

```html
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js" defer></script>
```

- [ ] **Step 3: Skip link.** First element inside `<body>`:

```html
<a href="#main-content" class="skip-link">Skip to content</a>
```

Give `<main>` the id: `<main id="main-content">`. Style (in global-v2.css, add under Layout Components):

```css
.skip-link {
  position: absolute; top: -100%; left: 1rem; z-index: 2000;
  background: var(--color-pink); color: #fff;
  padding: 0.75rem 1.5rem; border-radius: var(--radius-full);
  font-family: var(--font-display); font-weight: 700; text-decoration: none;
}
.skip-link:focus-visible { top: 1rem; }
```

- [ ] **Step 4: Verify + commit**

Run: `npm run build` → passes. Tab into a built page: first focus stop is the skip link.

```bash
git add src/layouts/BaseLayout.astro src/styles/global-v2.css
git commit -m "fix(layout): absolute og:image + og:url, skip link, defer admin widget"
```

---

### Task 3: Book3D component (reusable CSS 3D hardcover)

**Files:**
- Create: `src/components/Book3D.astro`

- [ ] **Step 1: Create the component.** Port from `mockups-daylight/full-b-daylight.html` (`.book3d` block) verbatim, parameterized:

```astro
---
interface Props {
  /** CSS width expression, e.g. "min(31vw, 480px)" */
  width?: string;
  alt?: string;
}
const {
  width = 'min(31vw, 480px)',
  alt = 'Living To Die book cover — black damask with a photograph of Brenda Sawicki, a pink ribbon, and the scales of justice',
} = Astro.props;
---

<div class="book3d" style={`--bk-w: ${width}`}>
  <div class="book3d__back" aria-hidden="true"></div>
  <div class="book3d__spine" aria-hidden="true"></div>
  <div class="book3d__front">
    <img src="/book-cover-official.webp" alt={alt} width="1200" height="1801" fetchpriority="high" />
  </div>
</div>

<style>
  .book3d {
    --bk-t: calc(var(--bk-w) * 0.115);
    position: relative;
    width: var(--bk-w);
    aspect-ratio: 2 / 3;
    transform-style: preserve-3d;
    transform: rotateY(24deg) rotateX(2deg);
    transition: transform 0.6s cubic-bezier(0.19, 1, 0.22, 1);
  }
  .book3d__front {
    position: absolute;
    inset: 0;
    transform: translateZ(calc(var(--bk-t) / 2));
    border-radius: 3px 10px 10px 3px;
    overflow: hidden;
    box-shadow: inset 5px 0 12px rgba(0, 0, 0, 0.35);
  }
  .book3d__front img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .book3d__front::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(255,255,255,0.16) 0%, transparent 6%, transparent 95%, rgba(255,255,255,0.1) 100%);
  }
  .book3d__spine {
    position: absolute;
    top: 0; bottom: 0; left: 0;
    width: var(--bk-t);
    transform: translateX(calc(var(--bk-t) / -2)) rotateY(-90deg);
    background: linear-gradient(180deg, #211c24 0%, #16121a 55%, #0f0c12 100%);
    border-radius: 2px 0 0 2px;
  }
  .book3d__back {
    position: absolute;
    inset: 0;
    transform: translateZ(calc(var(--bk-t) / -2));
    background: #17131a;
    border-radius: 10px 3px 3px 10px;
    box-shadow: 0 45px 60px rgba(70, 20, 45, 0.35);
  }
  @media (prefers-reduced-motion: reduce) { .book3d { transition: none; } }
</style>
```

Note: the hover tilt (`rotateY(16deg)`) lives on the parent (`.hero__book:hover .book3d` needs `:global` in the page's scoped style — shown in Task 4).

- [ ] **Step 2: Verify + commit**

Run: `npm run build` → passes (component unused yet, but must compile).

```bash
git add src/components/Book3D.astro
git commit -m "feat(daylight): reusable CSS 3D hardcover component using official cover art"
```

---

### Task 4: Homepage hero (Daylight) + remove parallax

**Files:**
- Modify: `src/pages/index.astro` (hero markup ~lines 23-41, hero styles ~lines 211-306, parallax script ~lines 798-813)

- [ ] **Step 1: Replace the hero section markup** with the Daylight hero (book left, copy right). Content fields stay dynamic:

```astro
<section class="hero">
  <div class="hero__book">
    <Book3D />
  </div>
  <div class="hero__copy">
    <span class="hero__badge">{content.hero_badge}</span>
    <h1 class="hero__title">{content.hero_title}</h1>
    <p class="hero__byline">By Diane Melton</p>
    <p class="hero__subtitle">{content.hero_subtitle}</p>
    <div class="hero__buttons">
      <a href="#preorder" class="btn btn--primary">Notify Me at Release</a>
      <a href="#author" class="btn btn--secondary">Meet the Author</a>
    </div>
    <p class="hero__note">A true story of hope, negligence &amp; justice</p>
  </div>
</section>
```

Add `import Book3D from '../components/Book3D.astro';` to frontmatter.

- [ ] **Step 2: Replace the hero styles** in the scoped `<style>` with the mockup's (`.hero`, `.hero__book`, `.hero__badge`, `.hero__title`, `.hero__byline`, `.hero__subtitle`, `.hero__actions`→`.hero__buttons`, `.hero__note` from `mockups-daylight/full-b-daylight.html` — `.hero` starts at line 107, book/hero styles run through ~line 285), with these Astro-specific adjustments:
  - `min-height: 100svh` (not vh).
  - Hover tilt needs global escape: `.hero__book:hover :global(.book3d) { transform: rotateY(16deg) rotateX(1.5deg) translateY(-8px); }`
  - Delete: `.hero__background`, `.hero__bg-image`, `.hero__overlay` styles and their media-query overrides.

- [ ] **Step 3: Delete the parallax script** (`// Parallax effect for hero background` block) — the new hero has no scroll-driven transform. Keep the two form-submission handlers.

- [ ] **Step 4: Visual verify**

Run: `npm run dev`, open `http://localhost:4321/`, compare against `mockups-daylight/full-b-daylight.html` hero at 1440px and 390px widths. Book renders 3D with spine; no horizontal scrollbar; reveal animations intact.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(daylight): homepage hero with 3D official cover, drop field parallax"
```

---

### Task 5: Homepage body — preorder, summary+polaroid, chips, author, newsletter

**Files:**
- Modify: `src/pages/index.astro` (remaining sections + styles)

- [ ] **Step 1: Pre-order band.** Replace `.section--contrast` blue gradient styles with the blush band (fixes the white-on-lightblue contrast bug):

```css
.section--contrast {
  background: linear-gradient(135deg, var(--color-blush) 0%, var(--color-blush-deep) 100%);
}
.preorder__headline h2 { /* change */ color: var(--color-pink-dark); }
```

Remove the stale `.preorder__headline h2 { color: white }` rule. Input becomes pill-shaped: `border-radius: var(--radius-full); border: 2px solid rgba(214, 51, 132, 0.25); background: #fff;` and delete its `outline: none` focus block (global handles it).

- [ ] **Step 2: Summary section with polaroid.** Keep `summary__body` copy; replace the `summary__highlights` aside with polaroid + themes stack (mockup markup ~lines 585-605; `.polaroid` CSS starts at line 288):

```astro
<div class="summary__side reveal-right">
  <figure class="polaroid">
    <img src="/living-to-die-hero-parallax.webp"
         alt="Painting of Brenda seated on her bed, gazing through a wide window at rolling green hills"
         width="3600" height="2400" loading="lazy" />
    <figcaption>The view from her window — where the story begins</figcaption>
  </figure>
  <aside class="themes">
    <h3>Key Themes</h3>
    <ul>
      <li>{content.theme1}</li>
      <li>{content.theme2}</li>
      <li>{content.theme3}</li>
    </ul>
  </aside>
</div>
```

Styles: copy `.polaroid` (incl. tape `::before/::after`) and `.themes` blocks from the mockup verbatim. Grid becomes `grid-template-columns: 1.05fr 0.95fr; align-items: center;`.

- [ ] **Step 3: Structure cards → numbered chips.** Replace `.structure__card` styles with `.feature-card` pattern (mockup CSS at lines 353-380, markup with chips at ~611-625): radius 20px, chip `<span class="feature-card__chip" aria-hidden="true">1</span>` before each `<h3>`, hover `translateY(-6px)` + `--shadow-xl`, transition only `transform, box-shadow`. Add a centered section header above the grid: eyebrow "About the Book" + `<h2 class="display">Inside these pages</h2>`.

- [ ] **Step 4: Author blob.** Replace `.author__portrait img` box-shadow styling with the blob treatment:

```css
.author__portrait { position: relative; }
.author__portrait::before {
  content: '';
  position: absolute;
  inset: -1.75rem;
  border-radius: 50% 45% 55% 50% / 55% 50% 50% 45%;
  background: radial-gradient(circle at 30% 30%, var(--color-blush-deep), var(--color-blush) 70%);
  z-index: 0;
}
.author__portrait img {
  position: relative; z-index: 1;
  width: 100%; height: auto;
  border-radius: 18px;
  box-shadow: var(--shadow-xl);
}
```

Add `width="900" height="983"` and `loading="lazy"` to the author `<img>`.

- [ ] **Step 5: Resources preview + newsletter.** Resource preview cards: `border-radius: 20px`, `border-top: 4px solid var(--color-pink)`, transition `transform, box-shadow` (replace `transition: all`), `rel="noopener noreferrer"`. Newsletter: wrap in `.newsletter__card` pattern (mockup CSS starts at line 474) — 28px radius, `--gradient-warm`, decorative corner glow via `::before`.

- [ ] **Step 6: Form robustness (all three homepage forms).** Add hidden labels + status regions and disable-on-submit. Markup pattern per form:

```astro
<label for="preorder-email" class="sr-only">Email address</label>
<input id="preorder-email" type="email" ... />
...
<p class="form-status" id="preorder-success" role="status" aria-live="polite">Please check your email to confirm.</p>
```

Script pattern (replace both existing handlers):

```js
function wireForm(formId, statusId) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn?.setAttribute('disabled', '');
    try {
      await fetch(form.action, { method: 'POST', body: new FormData(form), mode: 'no-cors' });
      form.classList.add('hidden');
      status?.classList.add('show');
    } catch {
      form.submit();
    } finally {
      btn?.removeAttribute('disabled');
    }
  });
}
wireForm('preorder-form', 'preorder-success');
wireForm('homepage-newsletter-form', 'homepage-newsletter-success');
```

- [ ] **Step 7: Delete dead code.** Remove `latestPosts` computation (frontmatter lines 6-10) and the unused `.blog-grid`/`.blog-card*` CSS block (~lines 571-630).

- [ ] **Step 8: Visual verify against mockup**

Run: `npm run dev`; compare every section to `mockups-daylight/full-b-daylight.html` at 1440px and 390px. Submit a form with devtools offline → button re-enables, native fallback fires.

- [ ] **Step 9: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(daylight): homepage body — blush preorder, polaroid summary, chip cards, author blob, robust forms"
```

---

### Task 6: Navigation — Daylight styling + a11y

**Files:**
- Modify: `src/components/Navigation.astro`

- [ ] **Step 1: Remove dead dropdown code.** `navItems` has no `dropdown` entries: delete the dropdown markup branch (lines ~21-31), all `.nav__dropdown*` styles (desktop + mobile), and the two dropdown JS blocks. This removes the hover-only-dropdown a11y issue outright.

- [ ] **Step 2: Toggle button semantics:**

```astro
<button class="nav__toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu">
```

In the toggle handler, sync state; add Escape-to-close:

```js
navToggle?.addEventListener('click', () => {
  const open = navMenu?.classList.toggle('active');
  navToggle.classList.toggle('active', !!open);
  navToggle.setAttribute('aria-expanded', String(!!open));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navMenu?.classList.contains('active')) {
    navMenu.classList.remove('active');
    navToggle?.classList.remove('active');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.focus();
  }
});
```

Every other place that removes `active` must also reset `aria-expanded` — wrap in a `closeMenu()` helper used by all closers.

- [ ] **Step 3: Style pass.** `transition: all` on `.nav` → `transition: background-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base);`. Scroll listener gets `{ passive: true }`. Hamburger pill: `border-radius: var(--radius-full)` on `.nav--minimal .nav__toggle`. Mobile menu `transition: all` → `transform, opacity`.

- [ ] **Step 4: Verify + commit**

`npm run dev` mobile viewport: toggle opens/closes with correct `aria-expanded` (inspect), Escape closes and refocuses the button.

```bash
git add src/components/Navigation.astro
git commit -m "fix(nav): daylight styling, aria-expanded/Escape handling, drop dead dropdown code"
```

---

### Task 7: Footer — Daylight styling + form fixes

**Files:**
- Modify: `src/components/Footer.astro`

- [ ] **Step 1:** Background `var(--color-primary)` → `var(--color-pink-dark)`. Button `transition` already property-scoped — keep. Input pill radius.
- [ ] **Step 2:** "Newsletter" link points at `/blog` — change to `/#newsletter` (the homepage newsletter section; add `id="newsletter"` to that section in `index.astro` if missing).
- [ ] **Step 3:** Same form pattern as Task 5 Step 6: `sr-only` label, `role="status" aria-live="polite"` on `#newsletter-success`, disable-on-submit in the handler.
- [ ] **Step 4: Verify + commit**

```bash
git add src/components/Footer.astro src/pages/index.astro
git commit -m "fix(footer): daylight styling, correct newsletter link, accessible form status"
```

---

### Task 8: Delete `index-v2.astro`

**Files:**
- Delete: `src/pages/index-v2.astro`

- [ ] **Step 1:** Confirm nothing references it: `grep -rn "index-v2" src/ --include="*.astro" --include="*.ts"` → expect no hits outside the file itself.
- [ ] **Step 2:** `git rm src/pages/index-v2.astro`
- [ ] **Step 3:** `npm run build` → passes.
- [ ] **Step 4:** `git commit -m "chore: remove dead index-v2 experiment page"`

---

### Task 9: ResourceCard + resources page

**Files:**
- Create: `public/images/resource-fallback.svg`
- Modify: `src/components/ResourceCard.astro`, `src/pages/resources.astro`

- [ ] **Step 1: Local fallback image** (replaces the Unsplash hotlink):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fdf2f7"/>
      <stop offset="1" stop-color="#f8e3ef"/>
    </linearGradient>
  </defs>
  <rect width="400" height="200" fill="url(#g)"/>
  <path d="M200 88c-10-16-34-12-34 6 0 14 20 24 34 34 14-10 34-20 34-34 0-18-24-22-34-6z" fill="#d63384" opacity="0.55"/>
</svg>
```

- [ ] **Step 2: ResourceCard changes:** `onerror="this.onerror=null;this.src='/images/resource-fallback.svg'"`, add `width="400" height="200"` to the img, `rel="noopener noreferrer"` on the Visit link, card `border-radius: 20px`, `border-top: 4px solid var(--color-pink)`, transition `transform, box-shadow` only.
- [ ] **Step 3: resources.astro:** the `.resources-hero` band (line 65) → blush gradient (`--gradient-warm`) with `.eyebrow` + `.display` header; category `h2.section-title`s (line 76) use `.display` scale; keep grid structure. This page also has its own newsletter section (lines 93-97) — apply the same `.newsletter__card` recipe as homepage Task 5 Step 5.
- [ ] **Step 4: Verify + commit**

`npm run dev` `/resources`: cards match homepage preview cards; kill network → fallback SVG shows.

```bash
git add public/images/resource-fallback.svg src/components/ResourceCard.astro src/pages/resources.astro
git commit -m "feat(daylight): resource cards restyled, local image fallback"
```

---

### Task 10: Contact page

**Files:**
- Modify: `src/pages/contact.astro`

- [ ] **Step 1:** Hero band → blush gradient with `.eyebrow`/`.display`. Contact cards → 20px radius + hover lift (same `.feature-card` recipe as Task 5 Step 3 — copy the CSS into this page's scoped style). Form inputs keep rectangular-rounded (`--radius-md`) — long forms read better than pills — but submit button is pill `.btn--primary`.
- [ ] **Step 2:** Labels exist for every field (verified: 4 `<label>`s — keep). Delete the one existing `outline: none` rule in the scoped styles (verified present today); global `:focus-visible` takes over. Acceptance: `grep -n "outline: none" src/pages/contact.astro` → no hits. Note: the form posts to `action="#"` (non-functional today) — out of scope here, but flag to Matt as follow-up.
- [ ] **Step 3: Verify + commit**

```bash
git add src/pages/contact.astro
git commit -m "feat(daylight): contact page restyled"
```

---

### Task 11: Blog + poetry pages

**Files:**
- Modify: `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`, `src/pages/blog/tag/[tag].astro`, `src/pages/poetry/index.astro`

These pages already consume `global-v2.css` variables, so the Task 1 token swap does most of the recolor automatically. Per page:

- [ ] **Step 1: blog/index.astro** — topic pills already pill-shaped: confirm colors read from tokens (`--color-pink`), not hard-coded hex: `grep -n "#d63384\|#b52a6f\|sage\|rose" src/pages/blog/index.astro` and replace stragglers with vars. Cards → 20px radius + hover recipe. Featured card border → `border-top: 4px solid var(--color-pink)`.
- [ ] **Step 2: blog/[...slug].astro** — same grep-and-replace for hard-coded colors/legacy names; prose links use `--color-pink`; any `transition: all` → property list.
- [ ] **Step 3: blog/tag/[tag].astro** — inherits blog index styles; same grep pass.
- [ ] **Step 4: poetry/index.astro** — hero band → blush gradient; poem cards → 20px radius + hover lift; same grep pass.
- [ ] **Step 5:** Sweep-verify all four: `grep -rn "transition: all\|outline: none" src/pages/blog src/pages/poetry` → no hits.
- [ ] **Step 6: Verify + commit**

`npm run dev`: `/blog`, one post page, one tag page, `/poetry` all render in daylight palette; no unstyled/sage-green remnants.

```bash
git add src/pages/blog src/pages/poetry
git commit -m "feat(daylight): blog and poetry pages aligned to daylight tokens"
```

---

### Task 12: Site-wide invariant sweep + legacy alias removal

**Files:**
- Modify: any stragglers found; `src/styles/global-v2.css` (remove aliases)

- [ ] **Step 1: Run the invariant greps** (each must return no hits in `src/`, excluding `admin/`). Verified baseline on 2026-07-22 before work: `transition: all` 18 hits, `outline: none` 3, vh-heroes 2, `_blank` without noreferrer 2, unsplash 5 — so a zero result after the page tasks proves real cleanup, not a broken grep:

```bash
grep -rn "transition: all" src --include="*.astro" --include="*.css" | grep -v admin
grep -rn "outline: none" src --include="*.astro" --include="*.css" | grep -v admin
grep -rn "100vh\|85vh\|70vh" src --include="*.astro" | grep -v admin
grep -rn 'target="_blank"' src --include="*.astro" | grep -v 'noreferrer' | grep -v admin
grep -rn "unsplash" src --include="*.astro" | grep -v admin
```

Fix every hit using the recipes from earlier tasks (svh, property transitions, focus-visible, noreferrer, local fallback).

- [ ] **Step 2: Remove legacy aliases.** `grep -rn "sage\|--color-rose\|--color-beige" src --include="*.astro" --include="*.css" | grep -v admin` → migrate remaining usages to the new token names, then delete the alias block from `global-v2.css` `:root`. Re-run the grep → no hits.
- [ ] **Step 3: Image dimensions audit.** `grep -rn "<img" src --include="*.astro" | grep -v "width="` → add real `width`/`height` to each hit (check actual file dimensions with `sips -g pixelWidth -g pixelHeight <file>`).
- [ ] **Step 4:** `npm run build` → passes. `npm test` → existing vitest suite passes.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(daylight): invariant sweep — motion, focus, dimensions, drop legacy aliases"
```

---

### Task 13: Full-site visual QA

**Files:** none (verification only; fixes loop back into the relevant task's files)

- [ ] **Step 1:** `npm run build && npm run preview` (serves the production build).
- [ ] **Step 2:** With Playwright, screenshot every public route at 1440×900 and 390×844: `/`, `/blog`, one blog post, one tag page, `/resources`, `/contact`, `/poetry`. Review each against `mockups-daylight/full-b-daylight.html` for palette/pattern consistency.
- [ ] **Step 3:** Keyboard pass on `/`: Tab order starts at skip link; every interactive element shows a visible focus ring; mobile menu opens/closes with correct `aria-expanded`; Escape closes it.
- [ ] **Step 4:** Reduced-motion pass: emulate `prefers-reduced-motion: reduce` → no reveal/float/smooth-scroll motion.
- [ ] **Step 5:** Fix anything found (amend the owning task's files), re-screenshot, then final commit:

```bash
git add -A
git commit -m "test(daylight): full-site visual + a11y QA pass"
```

- [ ] **Step 6:** Present branch summary to Matt for review before any merge/deploy. Verified: the build uses the `@astrojs/vercel` adapter (Vercel deployment), so merging to `main` on the connected GitHub repo may auto-deploy — do NOT merge without explicit approval. Also note: this clone's only git remote is a local `container-use` mirror; pushing to GitHub requires Matt to confirm the remote setup.

---

## Self-Review Notes

- Spec coverage: hero (Task 4), all homepage sections (Task 5), every public page (Tasks 9-11), all review findings mapped: contrast bug (T5S1), focus states (T1S4), labels/aria-live (T5S6, T7S3), aria-expanded/Escape (T6S2), og:image/url (T2S1), skip link (T2S3), netlify defer (T2S2), unsplash fallback (T9), svh + transition:all + noreferrer + dimensions (T12), dead code (T5S7, T6S1, T8).
- Type consistency: `.form-status`/`.show` pattern defined in T1S4, used in T5S6/T7S3. `closeMenu()` helper noted in T6S2. Book3D `width` prop matches T4 usage.
- The polaroid/themes/chips CSS referenced "from mockup lines ~N" — the mockup is committed in-repo at `mockups-daylight/full-b-daylight.html`, so those references are stable and copy-pasteable.
