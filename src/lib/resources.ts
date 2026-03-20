import { Redis } from '@upstash/redis';

// Resource category type
export type ResourceCategory = 'medical-advocacy' | 'legal-resources' | 'medical-research' | 'support-communities';

// Resource interface for admin-managed resources
export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  category: ResourceCategory;
  featured: boolean;
  imageUrl?: string; // Optional - if null, frontend falls back to OG image proxy
  createdAt: string;
  updatedAt: string;
}

// Input type for creating a new resource (omits auto-generated fields)
export type CreateResourceInput = Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>;

// Input type for updating a resource
export type UpdateResourceInput = Partial<Omit<Resource, 'id' | 'createdAt'>>;

const RESOURCE_PREFIX = 'resource:';

function getRedis(): Redis {
  const redisUrl = import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL;
  const redisToken = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error('Redis/KV not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
  }

  return new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

function generateId(): string {
  // Use crypto.randomUUID() which is built into Node.js/modern browsers
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/**
 * Creates a new resource with generated ID
 */
export async function saveResource(input: CreateResourceInput): Promise<Resource> {
  const redis = getRedis();
  const now = new Date().toISOString();

  const resource: Resource = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await redis.set(`${RESOURCE_PREFIX}${resource.id}`, resource);
    return resource;
  } catch (error) {
    console.error('Error saving resource:', error);
    throw new Error('Failed to save resource');
  }
}

/**
 * Updates an existing resource
 */
export async function updateResource(id: string, updates: UpdateResourceInput): Promise<Resource | null> {
  const redis = getRedis();

  try {
    const existing = await redis.get<Resource>(`${RESOURCE_PREFIX}${id}`);
    if (!existing) {
      return null;
    }

    const updated: Resource = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID modification
      createdAt: existing.createdAt, // Preserve original creation date
      updatedAt: new Date().toISOString(),
    };

    await redis.set(`${RESOURCE_PREFIX}${id}`, updated);
    return updated;
  } catch (error) {
    console.error('Error updating resource:', error);
    throw new Error('Failed to update resource');
  }
}

/**
 * Get a single resource by ID
 */
export async function getResource(id: string): Promise<Resource | null> {
  const redis = getRedis();

  try {
    const resource = await redis.get<Resource>(`${RESOURCE_PREFIX}${id}`);
    return resource;
  } catch (error) {
    console.error('Error getting resource:', error);
    return null;
  }
}

/**
 * List all resources, sorted by category then title
 */
export async function listResources(): Promise<Resource[]> {
  const redis = getRedis();

  try {
    // Get all resource keys
    const keys: string[] = [];
    let cursor = 0;

    do {
      const [nextCursor, batchKeys] = await redis.scan(cursor, {
        match: `${RESOURCE_PREFIX}*`,
        count: 100,
      });
      cursor = Number(nextCursor);
      keys.push(...batchKeys);
    } while (cursor !== 0);

    if (keys.length === 0) {
      return [];
    }

    // Get all resources
    const resources: Resource[] = [];
    for (const key of keys) {
      const resource = await redis.get<Resource>(key);
      if (resource) {
        resources.push(resource);
      }
    }

    // Sort by category then title
    const categoryOrder: Record<ResourceCategory, number> = {
      'medical-advocacy': 0,
      'legal-resources': 1,
      'medical-research': 2,
      'support-communities': 3,
    };

    resources.sort((a, b) => {
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
      if (categoryDiff !== 0) return categoryDiff;
      return a.title.localeCompare(b.title);
    });

    return resources;
  } catch (error) {
    console.error('Error listing resources:', error);
    return [];
  }
}

/**
 * Delete a resource by ID
 */
export async function deleteResource(id: string): Promise<boolean> {
  const redis = getRedis();

  try {
    const result = await redis.del(`${RESOURCE_PREFIX}${id}`);
    return result === 1;
  } catch (error) {
    console.error('Error deleting resource:', error);
    return false;
  }
}
