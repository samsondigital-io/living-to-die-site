import { Redis } from '@upstash/redis';

const CONTENT_KEY = 'homepage_content';

// Default content (used if nothing in Redis yet)
export const defaultContent = {
  hero_title: 'Living To Die',
  hero_subtitle: 'A powerful story of hope and a mother\'s resilient fight for life and justice for all women',
  hero_badge: 'Coming 2026',
  preorder_heading: 'Pre-Order Your Copy',
  preorder_text: 'LIVING TO DIE draws readers into a family\'s fourteen-year-long odyssey through a mother\'s recurrent breast cancer, medical negligence, and the relentless pursuit of justice.',
  summary_heading: 'An Unconventional Journey',
  summary_paragraph1: 'In a small town in Connecticut one summer day, a thirty-nine-year-old mother goes for a routine screening mammogram and an abnormality is suspected. Six days later at the follow-up mammogram, the woman\'s breast cancer is missed. Ten months later, by the time her cancer is finally diagnosed, it had spread to her lymph nodes. Drawing on a wellspring of hope and raw grit, she wages a fight for her life and for accountability, challenging a medical system that failed her.',
  summary_paragraph2: 'Through meticulous reporting and intimate storytelling, LIVING TO DIE chronicles her unconventional journey of a missed diagnosis, the legal crusade against medical negligence, and the fierce love that kept a family whole. This narrative investigates the incandescent strength of a woman determined to leave a legacy of justice.',
  theme1: 'A true story at the intersection of medicine and law in a riveting landmark case',
  theme2: 'The right of patients, given options, to choose their own pathways to wellness',
  theme3: 'The hope and strength of family as anchors through uncertainty',
  structure1_heading: 'Inside the Book',
  structure1_text: 'A resilient mother\'s struggle to survive breast cancer on her own terms. An impeccably researched narrative spanning years of a courtroom drama',
  structure2_heading: 'For Readers Who...',
  structure2_text: 'Would like to go behind the scenes in the true story of a complex medical and legal thriller. If you or a loved one has been diagnosed with breast cancer, has been misdiagnosed, or are interested in alternative medicine',
  structure3_heading: 'Ideal For',
  structure3_text: 'Book clubs, advocacy organizations, graduate law and medical curriculums and graduate ethics programs',
  author_bio1: 'My lifelong love of writing began in third grade when the teacher spotlighted my composition in front of the class. As a reflective teenager, I sat at my corner desk and wrote poetry. I majored in English literature at Mt. Holyoke College, where I received my B. A. While raising my family, I earned a Master of Arts in Liberal Studies from Wesleyan University in creative writing. I went on to teach writing and poetry at Central Connecticut State University.',
  author_bio2: 'My essays and narrative nonfiction have appeared in The New York Times, The Hartford Courant, Northeast Magazine, Seasons Magazine, and Latitudes. I was honored by the Connecticut Society of Professional Journalists for outstanding feature writing. LIVING TO DIE is my debut nonfiction book.',
  author_bio3: 'I can\'t draw a stick figure, but I\'m an amateur street photographer. I suppose capturing the world through a lens is a lot like describing reality, as I see it, with words. I love to tell other people\'s stories (not my own, yet!), because people, every one of us, are fascinating. I raised my three children in Connecticut and now live with my husband in Florida. I love welcoming friends around the table, walking, swimming, working out, and escaping to the beach. But most of all, cherishing my two grandchildren, my hearts. When I first met Brenda, I knew I had to tell her gripping story. I invite you to join me on Brenda Sawicki\'s incredible journey.',
  newsletter_heading: 'Let\'s Stay Connected!',
  newsletter_text: 'My newsletter investigates topics relating to breast cancer, medical malpractice, and the writing process of LIVING TO DIE. Please sign up for my newsletter, book updates, events, and share your comments. Thanks so much!',
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

    if (!content) {
      return defaultContent;
    }

    // Merge with defaults - use default value if stored value is empty string
    const merged: HomepageContent = { ...defaultContent };
    for (const key of Object.keys(defaultContent) as Array<keyof HomepageContent>) {
      if (content[key] && content[key].trim() !== '') {
        merged[key] = content[key];
      }
    }
    return merged;
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
