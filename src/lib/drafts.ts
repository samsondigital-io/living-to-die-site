import { Redis } from '@upstash/redis';

// Newsletter draft interface matching existing newsletter admin structure
export interface NewsletterDraft {
  id: string;
  subject: string;
  preheader: string;
  issueInfo?: string;
  openingParagraph: string;
  section1Title: string;
  section1Content: string;
  section2Title?: string;
  section2Content?: string;
  ctaUrl?: string;
  ctaText?: string;
  closingMessage: string;
  // Scheduling fields
  scheduledFor?: string; // ISO date string, null = draft only
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: string;
  updatedAt: string;
}

// Input type for creating a new draft (omits auto-generated fields)
export type CreateDraftInput = Omit<NewsletterDraft, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

// Input type for updating a draft
export type UpdateDraftInput = Partial<Omit<NewsletterDraft, 'id' | 'createdAt'>>;

const DRAFT_PREFIX = 'draft:';

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
 * Creates a new draft with generated ID
 */
export async function saveDraft(input: CreateDraftInput): Promise<NewsletterDraft> {
  const redis = getRedis();
  const now = new Date().toISOString();

  const draft: NewsletterDraft = {
    ...input,
    id: generateId(),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await redis.set(`${DRAFT_PREFIX}${draft.id}`, draft);
    return draft;
  } catch (error) {
    console.error('Error saving draft:', error);
    throw new Error('Failed to save draft');
  }
}

/**
 * Updates an existing draft
 */
export async function updateDraft(id: string, updates: UpdateDraftInput): Promise<NewsletterDraft | null> {
  const redis = getRedis();

  try {
    const existing = await redis.get<NewsletterDraft>(`${DRAFT_PREFIX}${id}`);
    if (!existing) {
      return null;
    }

    const updated: NewsletterDraft = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID modification
      createdAt: existing.createdAt, // Preserve original creation date
      updatedAt: new Date().toISOString(),
    };

    await redis.set(`${DRAFT_PREFIX}${id}`, updated);
    return updated;
  } catch (error) {
    console.error('Error updating draft:', error);
    throw new Error('Failed to update draft');
  }
}

/**
 * Get a single draft by ID
 */
export async function getDraft(id: string): Promise<NewsletterDraft | null> {
  const redis = getRedis();

  try {
    const draft = await redis.get<NewsletterDraft>(`${DRAFT_PREFIX}${id}`);
    return draft;
  } catch (error) {
    console.error('Error getting draft:', error);
    return null;
  }
}

/**
 * List all drafts, sorted by updatedAt descending
 */
export async function listDrafts(): Promise<NewsletterDraft[]> {
  const redis = getRedis();

  try {
    // Get all draft keys
    const keys: string[] = [];
    let cursor = 0;

    do {
      const [nextCursor, batchKeys] = await redis.scan(cursor, {
        match: `${DRAFT_PREFIX}*`,
        count: 100,
      });
      cursor = nextCursor;
      keys.push(...batchKeys);
    } while (cursor !== 0);

    if (keys.length === 0) {
      return [];
    }

    // Get all drafts
    const drafts: NewsletterDraft[] = [];
    for (const key of keys) {
      const draft = await redis.get<NewsletterDraft>(key);
      if (draft) {
        drafts.push(draft);
      }
    }

    // Sort by updatedAt descending
    drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return drafts;
  } catch (error) {
    console.error('Error listing drafts:', error);
    return [];
  }
}

/**
 * Delete a draft by ID
 */
export async function deleteDraft(id: string): Promise<boolean> {
  const redis = getRedis();

  try {
    const result = await redis.del(`${DRAFT_PREFIX}${id}`);
    return result === 1;
  } catch (error) {
    console.error('Error deleting draft:', error);
    return false;
  }
}

/**
 * Get drafts that are scheduled and ready to send (scheduledFor is in the past)
 */
export async function getScheduledDrafts(): Promise<NewsletterDraft[]> {
  const redis = getRedis();

  try {
    // Get all drafts first
    const allDrafts = await listDrafts();

    // Filter for scheduled drafts that are ready to send
    const now = new Date();
    return allDrafts.filter(draft => {
      if (draft.status !== 'scheduled' || !draft.scheduledFor) {
        return false;
      }
      const scheduledDate = new Date(draft.scheduledFor);
      return scheduledDate <= now;
    });
  } catch (error) {
    console.error('Error getting scheduled drafts:', error);
    return [];
  }
}
