import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { saveResource, listResources, type ResourceCategory } from '../../lib/resources';

export const POST: APIRoute = async ({ cookies }) => {
  // Check admin authentication
  const adminAuth = cookies.get('admin_auth')?.value;
  if (adminAuth !== 'true') {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Check if resources already exist in Redis
    const existingResources = await listResources();
    if (existingResources.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Redis already has ${existingResources.length} resources. Clear them first or skip migration.`,
          existing: existingResources.length
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get resources from content collection
    const contentResources = await getCollection('resources');

    const migrated: string[] = [];
    const errors: string[] = [];

    for (const item of contentResources) {
      try {
        // Map content collection data to Resource format
        const resource = await saveResource({
          title: item.data.title,
          description: item.data.description,
          url: item.data.url,
          category: item.data.category as ResourceCategory,
          featured: item.data.featured ?? false,
          imageUrl: undefined, // No custom images in content collection
        });
        migrated.push(resource.title);
      } catch (err) {
        errors.push(`Failed to migrate ${item.data.title}: ${err}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        migrated: migrated.length,
        titles: migrated,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
