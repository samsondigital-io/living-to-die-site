import type { APIRoute } from 'astro';
import { COOKIE_NAME, verifySessionToken } from '../../lib/auth';
import { put } from '@vercel/blob';
import { GoogleGenAI } from '@google/genai';

/**
 * POST /api/generate-image  (admin only)
 *
 * Body: { prompt: string }
 * Returns: { success: true, url } | { success: false, error }
 *
 * Generates an image from a text description with Gemini, uploads it to Vercel
 * Blob, and returns the public URL — the same response shape as
 * /api/upload-image so the client can treat both identically.
 *
 * Confirmed via Context7 (Google Gen AI JS SDK, @google/genai):
 *   new GoogleGenAI({ apiKey })
 *   ai.models.generateContent({ model, contents, config:{ responseModalities:['IMAGE'] } })
 *   image bytes come back as inlineData.data (base64) + inlineData.mimeType.
 * The newer interactions.create() API is also supported; we try it first and
 * fall back to generateContent so we are resilient across SDK minor versions.
 *
 * Requires GEMINI_API_KEY and BLOB_READ_WRITE_TOKEN in the environment.
 */

const PRIMARY_MODEL = 'gemini-3-pro-image-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash-image';

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Extract { base64, mime } from whatever shape the SDK returned. */
function extractImage(result: any): { base64: string; mime: string } | null {
  // interactions.create() shape: outputs[].{ type:'image', data, mime_type }
  const outputs = result?.outputs;
  if (Array.isArray(outputs)) {
    const img = outputs.find((o: any) => o?.type === 'image' && o?.data);
    if (img) return { base64: img.data, mime: img.mime_type || 'image/png' };
  }
  // generateContent() shape: candidates[].content.parts[].inlineData.{ data, mimeType }
  const parts = result?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const part = parts.find((p: any) => p?.inlineData?.data);
    if (part) return { base64: part.inlineData.data, mime: part.inlineData.mimeType || 'image/png' };
  }
  return null;
}

async function generate(ai: any, prompt: string): Promise<{ base64: string; mime: string } | null> {
  // Try the newer interactions API first.
  try {
    if (ai?.interactions?.create) {
      const interaction = await ai.interactions.create({
        model: PRIMARY_MODEL,
        input: prompt,
        response_modalities: ['image'],
      });
      const img = extractImage(interaction);
      if (img) return img;
    }
  } catch (e) {
    console.error('interactions.create path failed, falling back:', e);
  }

  // Fall back to generateContent on a broadly-available image model.
  const response = await ai.models.generateContent({
    model: FALLBACK_MODEL,
    contents: prompt,
    config: { responseModalities: ['IMAGE'] },
  });
  return extractImage(response);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!verifySessionToken(cookies.get(COOKIE_NAME)?.value)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const apiKey = import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ success: false, error: 'Image generation is not configured.' }, 500);
  }

  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return json({ success: false, error: 'Please enter a short description.' }, 400);
    }

    const ai = new GoogleGenAI({ apiKey });
    const img = await generate(ai, prompt.trim());
    if (!img) {
      return json({ success: false, error: 'No image was generated. Please try again.' }, 502);
    }

    const bytes = Buffer.from(img.base64, 'base64');
    const ext = (img.mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const filename = `generated/${Date.now()}.${ext}`;
    const blob = await put(filename, bytes, { access: 'public', contentType: img.mime });

    return json({ success: true, url: blob.url }, 200);
  } catch (error) {
    console.error('generate-image error:', error);
    return json(
      { success: false, error: 'Could not create the image right now. Please upload one instead.' },
      500
    );
  }
};
