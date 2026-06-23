# Plan C — Reusable ImagePicker with AI Generation (Tier 2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One reusable admin image field that lets Diane either upload an image or generate one from a text description (Gemini), with upload always available as fallback. Used in the newsletter composer and the resources admin — **not** the homepage.

**Architecture:** A new auth-gated `api/generate-image.ts` calls Gemini's image-generation model with a text prompt, uploads the bytes to Vercel Blob (reusing the existing blob flow), and returns `{ success, url }` — the same shape as the existing `api/upload-image.ts`. A small client-side `image-picker.js` (vanilla, no framework, matching this project's inline-script style) wires an upload input + a "generate from description" box + preview/regenerate into any container. Both admin pages mount it on their image fields.

**Tech Stack:** Google Gemini (image generation) via `@google/genai` — **exact model id + SDK call must be confirmed via Context7 at build time** (see Task 1). Vercel Blob (`@vercel/blob`, already installed), existing `lib/auth.ts`.

**Depends on:** Nothing in Plan A/B (independent). Requires `GEMINI_API_KEY` in env.

**Security precondition:** `BLOB_READ_WRITE_TOKEN` must be rotated (it was exposed in chat). `GEMINI_API_KEY` is set in `.env` by the user; never read into client code.

---

## File Structure

- **Create** `src/pages/api/generate-image.ts` — auth-gated; prompt → Gemini → Blob → `{success,url}`.
- **Create** `public/admin/image-picker.js` — reusable client widget (upload + generate + preview).
- **Modify** `src/pages/admin/newsletter.astro` — add a heroImage field that mounts the picker; include the resulting URL in send/draft payloads.
- **Modify** `src/pages/admin/resources.astro` — replace/augment its existing image upload with the picker (keep manual upload working).
- **Modify** `src/lib/drafts.ts` + `src/pages/api/drafts/[id].ts` — allow `heroImage?: string` on drafts (so the chosen image persists and reaches autopublish in Plan B).

---

## Task 1: Confirm the Gemini image API (research gate — do this first)

**Files:** none (research) — then `package.json`.

- [ ] **Step 1: Fetch current Gemini image-generation docs**

Use Context7 (`resolve-library-id` → `query-docs`) for "Google Gemini API image generation Node SDK `@google/genai` generate image from text, model id, response inlineData base64". Record:
- the exact npm package (`@google/genai` vs legacy `@google/generative-ai`),
- the current image-capable model id,
- how image bytes are returned (e.g. `inlineData.data` base64).

Write the confirmed facts as a comment block at the top of `src/pages/api/generate-image.ts` when you create it in Task 2.

- [ ] **Step 2: Install the confirmed SDK**

Run (substitute the package Context7 confirms):
```bash
cd /Users/mattmelton/Development/living-to-die/living-to-die-site
npm install @google/genai
```
Expected: added to dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Google GenAI SDK for image generation"
```

---

## Task 2: `api/generate-image.ts` (auth-gated → Gemini → Blob)

**Files:**
- Create: `src/pages/api/generate-image.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/pages/api/generate-image.ts` (adjust the Gemini call to match Task 1's confirmed SDK/model — the structure below is the contract; the marked section is what Context7 verifies):
```ts
import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { put } from '@vercel/blob';
import { GoogleGenAI } from '@google/genai'; // confirm import per Task 1

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const apiKey = import.meta.env.GEMINI_API_KEY;
  if (!apiKey) return json({ success: false, error: 'Image generation is not configured.' }, 500);

  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return json({ success: false, error: 'Please enter a short description.' }, 400);
    }

    // ---- BEGIN Gemini call (verify exact model + response shape via Task 1) ----
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // CONFIRM via Context7 in Task 1
      contents: prompt,
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (!imagePart) return json({ success: false, error: 'No image was generated. Try again.' }, 502);
    const base64 = imagePart.inlineData.data as string;
    const mime = imagePart.inlineData.mimeType ?? 'image/png';
    // ---- END Gemini call ----

    const bytes = Buffer.from(base64, 'base64');
    const ext = mime.split('/')[1] || 'png';
    const filename = `generated/${Date.now()}.${ext}`;
    const blob = await put(filename, bytes, { access: 'public', contentType: mime });

    return json({ success: true, url: blob.url }, 200);
  } catch (error) {
    console.error('generate-image error:', error);
    return json({ success: false, error: 'Could not create the image right now. Please upload one instead.' }, 500);
  }
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
```

- [ ] **Step 2: Build + smoke test auth**

Run: `npx astro build` (expect clean).
Then `npm run dev` and `curl -i -X POST localhost:4321/api/generate-image -H 'content-type: application/json' -d '{"prompt":"test"}'`
Expected: `401 Unauthorized` (no session cookie) — proves the auth gate.

- [ ] **Step 3: Authenticated happy-path test**

Log into `/admin` in the browser, then from the browser console on an admin page:
```js
await (await fetch('/api/generate-image', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({prompt:'a calm sunrise over a quiet lake, soft hopeful tones'}), credentials:'same-origin'})).json()
```
Expected: `{ success: true, url: 'https://...blob...' }`. Open the URL — it's a real image. If the model id/response shape is wrong, fix per Task 1 and retry.

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/generate-image.ts
git commit -m "feat(admin): AI image generation endpoint (Gemini -> Blob)"
```

---

## Task 3: Reusable client widget

**Files:**
- Create: `public/admin/image-picker.js`

- [ ] **Step 1: Create the widget**

Create `public/admin/image-picker.js`:
```js
// Reusable admin image picker: upload OR generate-from-description, with preview.
// Usage: ImagePicker.mount(containerEl, { onChange: (url) => {...}, initialUrl });
window.ImagePicker = {
  mount(container, opts = {}) {
    const onChange = opts.onChange || (() => {});
    container.innerHTML = `
      <div class="ip">
        <div class="ip__preview" ${opts.initialUrl ? '' : 'hidden'}>
          <img class="ip__img" src="${opts.initialUrl || ''}" alt="Selected image" />
          <button type="button" class="ip__remove">Remove</button>
        </div>
        <div class="ip__row">
          <label class="ip__upload btn-small">Upload image
            <input type="file" accept="image/*" hidden class="ip__file" />
          </label>
          <span class="ip__or">or</span>
          <input type="text" class="ip__prompt" placeholder="Describe an image to create…" />
          <button type="button" class="ip__gen btn-small">✨ Create</button>
        </div>
        <p class="ip__status" hidden></p>
      </div>`;

    const fileInput = container.querySelector('.ip__file');
    const promptInput = container.querySelector('.ip__prompt');
    const genBtn = container.querySelector('.ip__gen');
    const status = container.querySelector('.ip__status');
    const preview = container.querySelector('.ip__preview');
    const img = container.querySelector('.ip__img');
    const removeBtn = container.querySelector('.ip__remove');

    function setStatus(msg, isError) {
      status.hidden = !msg; status.textContent = msg || '';
      status.style.color = isError ? '#721c24' : '#555';
    }
    function setUrl(url) {
      img.src = url; preview.hidden = false; onChange(url); setStatus('');
    }

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      setStatus('Uploading…');
      const fd = new FormData(); fd.append('file', file);
      try {
        const r = await fetch('/api/upload-image', { method: 'POST', body: fd, credentials: 'same-origin' });
        const d = await r.json();
        if (d.success) setUrl(d.url); else setStatus(d.error || 'Upload failed', true);
      } catch { setStatus('Upload failed. Please try again.', true); }
    });

    genBtn.addEventListener('click', async () => {
      const prompt = promptInput.value.trim();
      if (prompt.length < 3) return setStatus('Type a short description first.', true);
      genBtn.disabled = true; setStatus('Creating your image… this takes a few seconds.');
      try {
        const r = await fetch('/api/generate-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }), credentials: 'same-origin',
        });
        const d = await r.json();
        if (d.success) setUrl(d.url); else setStatus(d.error || 'Could not create image. Upload one instead.', true);
      } catch { setStatus('Could not create image. Upload one instead.', true); }
      genBtn.disabled = false;
    });

    removeBtn.addEventListener('click', () => {
      preview.hidden = true; img.src = ''; onChange(''); fileInput.value = ''; promptInput.value = '';
    });
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add public/admin/image-picker.js
git commit -m "feat(admin): reusable image-picker widget (upload + AI generate)"
```

---

## Task 4: Mount in newsletter composer + resources

**Files:**
- Modify: `src/pages/admin/newsletter.astro`
- Modify: `src/pages/admin/resources.astro`
- Modify: `src/lib/drafts.ts`, `src/pages/api/drafts/[id].ts`

- [ ] **Step 1: Allow heroImage on drafts**

In `src/lib/drafts.ts` add `heroImage?: string;` to `NewsletterDraft`, and add `'heroImage'` to the allow-list in `src/pages/api/drafts/[id].ts`.

- [ ] **Step 2: Add picker to the composer**

In `src/pages/admin/newsletter.astro`, add a field + container in the Content section:
```html
<div class="field">
  <label>Header image <span class="label-hint">— optional; shown on the blog post</span></label>
  <div id="hero-image-picker"></div>
  <input type="hidden" id="heroImage" name="heroImage" />
</div>
```
At the end of the page scripts, add (regular, non-module is fine since the widget is global):
```html
<script src="/admin/image-picker.js" is:inline></script>
<script is:inline>
  ImagePicker.mount(document.getElementById('hero-image-picker'), {
    initialUrl: '',
    onChange: (url) => { document.getElementById('heroImage').value = url; },
  });
</script>
```
Include `heroImage: document.getElementById('heroImage').value || undefined` in `getFormData()` so it flows into draft save and the Send Now payload (and, via Plan B, into autopublish).

- [ ] **Step 3: Mount in resources admin**

In `src/pages/admin/resources.astro`, locate the existing image upload field. Add a `<div id="resource-image-picker"></div>` and a hidden input bound to the existing image URL field, then mount the picker with `initialUrl` set to the current value when editing:
```html
<script src="/admin/image-picker.js" is:inline></script>
<script is:inline>
  // existingImageInput = the field resources already uses for the image URL
  const target = document.getElementById('resource-image-url'); // adjust to actual id
  ImagePicker.mount(document.getElementById('resource-image-picker'), {
    initialUrl: target?.value || '',
    onChange: (url) => { if (target) target.value = url; },
  });
</script>
```
Keep the existing upload working — the picker's upload path calls the same `/api/upload-image`, so behavior is preserved; the AI box is additive.

- [ ] **Step 4: Add minimal widget CSS (shared)**

Add to both admin pages' `<style>` (or a shared block) so the widget looks consistent:
```css
.ip__row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
.ip__prompt { flex: 1; min-width: 180px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; }
.ip__or { color: #888; font-size: 0.85rem; }
.ip__preview { margin-bottom: 0.5rem; }
.ip__img { max-width: 240px; border-radius: 8px; display: block; margin-bottom: 0.25rem; }
.ip__status { font-size: 0.85rem; margin-top: 0.4rem; }
```

- [ ] **Step 5: End-to-end verify**

Run `npm run dev`, log in:
- Composer: upload an image → preview shows, hidden `heroImage` set. Remove → cleared. Type a description → "✨ Create" → image appears. Save draft, reload, confirm image persists.
- Resources: edit a resource, generate or upload an image, save, confirm it shows on the public resources page.
- Logged out: `curl` both `/api/upload-image` and `/api/generate-image` → 401.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/newsletter.astro src/pages/admin/resources.astro src/lib/drafts.ts src/pages/api/drafts/[id].ts
git commit -m "feat(admin): mount image-picker in composer and resources"
```

---

## Self-Review (completed)

- **Spec coverage:** reusable component in composer + resources, NOT homepage (T4); manual upload always available as fallback (widget always renders upload; AI errors tell her to upload) (T3); AI generation via Gemini (T1/T2); auth-gated like other admin APIs (T2); plain-language errors, "creating…" state (T3); heroImage persists for Plan B autopublish (T4 S1–S2).
- **Placeholder scan:** The only deliberately-unresolved item is the exact Gemini model id/response shape — gated behind a Context7 research step (T1) with the contract fixed and the verify-or-fix loop in T2 S3. The resources image-field id is marked "adjust to actual id" because it must be read from that file at edit time.
- **Type consistency:** endpoint returns `{success,url}` identical to `upload-image.ts`, so the widget treats both calls the same. `heroImage` added consistently to draft type, allow-list, and composer payload.
- **Security:** auth gate on both endpoints; `GEMINI_API_KEY` server-only; `BLOB_READ_WRITE_TOKEN` rotation called out as precondition.
