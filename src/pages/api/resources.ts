import type { APIRoute } from 'astro';
import { listResources, saveResource } from '../../lib/resources';
import type { CreateResourceInput, ResourceCategory } from '../../lib/resources';

const VALID_CATEGORIES: ResourceCategory[] = ['medical-advocacy', 'legal-resources', 'medical-research', 'support-communities'];

/**
 * GET /api/resources
 * List all resources, sorted by category then title
 *
 * Response:
 * { success: true, data: Resource[] }
 */
export const GET: APIRoute = async ({ cookies }) => {
  // Check authentication
  const authCookie = cookies.get('admin_auth');
  if (authCookie?.value !== 'true') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const resources = await listResources();
    return new Response(JSON.stringify({ success: true, data: resources }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error listing resources:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * POST /api/resources
 * Create a new resource
 *
 * Request body:
 * {
 *   title: string,
 *   description: string,
 *   url: string,
 *   category: 'medical-advocacy' | 'legal-resources' | 'medical-research' | 'support-communities',
 *   featured?: boolean,
 *   imageUrl?: string
 * }
 *
 * Response:
 * { success: true, data: Resource }
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
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'description', 'url', 'category'];
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== 'string') {
        return new Response(JSON.stringify({ success: false, error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(body.category)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const resourceInput: CreateResourceInput = {
      title: body.title,
      description: body.description,
      url: body.url,
      category: body.category,
      featured: body.featured === true,
      imageUrl: body.imageUrl || undefined,
    };

    const resource = await saveResource(resourceInput);
    return new Response(JSON.stringify({ success: true, data: resource }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
