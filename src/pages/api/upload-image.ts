import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB - Vercel Blob free tier limit

/**
 * POST /api/upload-image
 * Upload an image to Vercel Blob storage
 *
 * Request: multipart/form-data with 'file' field
 *
 * Requirements:
 * - File must be an image (Content-Type starts with 'image/')
 * - Max size: 4MB
 *
 * Response:
 * { success: true, url: string }
 * or
 * { success: false, error: string }
 *
 * Note: Requires BLOB_READ_WRITE_TOKEN environment variable.
 * This is automatically provided when Vercel Blob storage is linked to the project.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check file type - must be an image
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ success: false, error: 'File must be an image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `resources/${timestamp}-${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      // BLOB_READ_WRITE_TOKEN is read automatically from environment
    });

    return new Response(JSON.stringify({ success: true, url: blob.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific Vercel Blob errors
    if (errorMessage.includes('BLOB_READ_WRITE_TOKEN')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Blob storage not configured. Enable Vercel Blob in project settings.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
