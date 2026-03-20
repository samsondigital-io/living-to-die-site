import type { APIRoute } from 'astro';
import { getResource, updateResource, deleteResource } from '../../../lib/resources';
import type { UpdateResourceInput, ResourceCategory } from '../../../lib/resources';

const VALID_CATEGORIES: ResourceCategory[] = ['medical-advocacy', 'legal-resources', 'medical-research', 'support-communities'];

/**
 * GET /api/resources/[id]
 * Get a single resource by ID
 *
 * Response:
 * { success: true, data: Resource }
 * or
 * { success: false, error: 'Not found' } (404)
 */
export const GET: APIRoute = async ({ params, cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Missing resource ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const resource = await getResource(id);
    if (!resource) {
      return new Response(JSON.stringify({ success: false, error: 'Resource not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data: resource }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting resource:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * PUT /api/resources/[id]
 * Update an existing resource
 *
 * Request body: Partial resource fields to update
 *
 * Response:
 * { success: true, data: Resource }
 * or
 * { success: false, error: 'Not found' } (404)
 */
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Missing resource ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    // Validate category if provided
    if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate URL if provided
    if (body.url !== undefined) {
      try {
        new URL(body.url);
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Build update object from allowed fields
    const updates: UpdateResourceInput = {};
    const allowedFields = ['title', 'description', 'url', 'category', 'featured', 'imageUrl'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = body[field];
      }
    }

    const resource = await updateResource(id, updates);
    if (!resource) {
      return new Response(JSON.stringify({ success: false, error: 'Resource not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data: resource }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * DELETE /api/resources/[id]
 * Delete a resource
 *
 * Response:
 * { success: true }
 * or
 * { success: false, error: 'Not found' } (404)
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Missing resource ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const deleted = await deleteResource(id);
    if (!deleted) {
      return new Response(JSON.stringify({ success: false, error: 'Resource not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
