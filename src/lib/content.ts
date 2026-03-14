import { Redis } from '@upstash/redis';

const CONTENT_KEY = 'homepage_content';

// Default content (used if nothing in Redis yet)
export const defaultContent = {
  hero_title: 'Living to Die',
  hero_subtitle: 'A powerful memoir of faith, justice, and a mother\'s relentless fight against medical negligence.',
  hero_badge: 'Coming 2026',
  summary_heading: 'An Unconventional Journey',
  summary_paragraph1: 'On August 8, 2000, a follow-up mammogram missed an abnormality. Ten months later, by the time her cancer was finally diagnosed, it had spread to her lymph nodes. Drawing on deep wells of faith, and raw grit, Brenda waged a fight for her life and for accountability— challenging a medical system that failed her.',
  summary_paragraph2: 'Through meticulous reporting and intimate storytelling, Living to Die chronicles Brenda\'s unconventional journey from diagnosis to refusing traditional treatment, the legal crusade against negligence, and the fierce love that kept a family whole. This memoir bears witness to the cost of institutional failure and to the incandescent strength of a woman determined to leave a legacy of justice.',
  author_bio1: 'Diane Melton\'s devotion to writing began in third grade when a teacher spotlighted her writing. She later earned a Master of Arts in Liberal Studies from Wesleyan University, concentrating in creative writing, and went on to teach writing and poetry at Central Connecticut State University.',
  author_bio2: 'Her essays and narrative nonfiction have appeared in The New York Times, The Hartford Courant, Northeast Magazine, Seasons Magazine, and Latitudes. She was honored by the Connecticut Society of Professional Journalists for outstanding feature writing.',
  author_bio3: 'Away from the page, Diane is an avid street photographer who loves welcoming friends around the table, walking, swimming, training at the gym, and escaping to the beach. Living to Die marks her debut nonfiction book, and she invites readers to join her on Brenda Sawicki\'s incredible journey.',
  newsletter_heading: 'Stay Connected',
  newsletter_text: 'Join our community for book updates, events, and resources for advocates and caregivers.',
};

export type HomepageContent = typeof defaultContent;

export async function getHomepageContent(): Promise<HomepageContent> {
  // Check if Redis is configured (support both Vercel KV and direct Upstash names)
  const redisUrl = import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL;
  const redisToken = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl) {
    return defaultContent;
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken || '',
    });

    const content = await redis.get<HomepageContent>(CONTENT_KEY);
    return content || defaultContent;
  } catch (error) {
    console.error('Redis GET error:', error);
    return defaultContent;
  }
}

export async function saveHomepageContent(data: HomepageContent): Promise<boolean> {
  const redisUrl = import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL;
  const redisToken = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl) {
    throw new Error('Redis not configured');
  }

  const redis = new Redis({
    url: redisUrl,
    token: redisToken || '',
  });

  await redis.set(CONTENT_KEY, data);
  return true;
}
