import { Redis } from '@upstash/redis';
import { createBlogPost } from './blog';
import { getSentCampaignEmail, listSentCampaignIds } from './mailerlite';
import { extractNewsletterArticle } from './newsletter-extract';

/**
 * Publish sent MailerLite campaigns as blog posts.
 *
 * Each campaign is imported at most once: `mlcampaign:<id>` records the slug
 * of the post it became. That makes webhook retries and the admin "Import"
 * button safe to repeat, and means a post Diane deletes stays deleted.
 * (The key prefix deliberately doesn't match the `blogpost:*` scan.)
 */

const CAMPAIGN_PREFIX = 'mlcampaign:';
const NEWSLETTER_TAG = 'Newsletter';

export type ImportResult =
  | { status: 'imported'; campaignId: string; slug: string; title: string }
  | { status: 'skipped'; campaignId: string; reason: 'already-imported' | 'not-sent' };

function getRedis(): Redis {
  const url = import.meta.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis/KV not configured for blog posts.');
  return new Redis({ url, token });
}

export async function importCampaign(campaignId: string): Promise<ImportResult> {
  const redis = getRedis();
  const key = `${CAMPAIGN_PREFIX}${campaignId}`;

  // Claim the campaign first so a webhook and a manual import running at the
  // same moment can't both create a post. The claim expires if we crash.
  const claimed = await redis.set(key, 'importing', { nx: true, ex: 300 });
  if (!claimed) return { status: 'skipped', campaignId, reason: 'already-imported' };

  try {
    const email = await getSentCampaignEmail(campaignId);
    if (!email) {
      await redis.del(key);
      return { status: 'skipped', campaignId, reason: 'not-sent' };
    }
    const article = extractNewsletterArticle(email.html, {
      subject: email.subject,
      preheader: email.preheader,
    });
    const post = await createBlogPost({
      title: article.title,
      description: article.description,
      bodyHtml: article.bodyHtml,
      heroImage: article.heroImage,
      tags: [NEWSLETTER_TAG],
      pubDate: email.sentAt ?? undefined,
    });
    await redis.set(key, post.slug);
    return { status: 'imported', campaignId, slug: post.slug, title: post.title };
  } catch (error) {
    await redis.del(key).catch(() => {});
    throw error;
  }
}

/** Import every sent campaign that hasn't been imported yet. */
export async function importAllSentCampaigns(): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const id of await listSentCampaignIds()) {
    results.push(await importCampaign(id));
  }
  return results;
}
