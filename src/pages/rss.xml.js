import rss from '@astrojs/rss';
import { getAllPosts } from '../lib/blog.ts';

export async function GET(context) {
  const posts = await getAllPosts();
  return rss({
    title: 'Living to Die | Blog',
    description: 'Updates, reflections, and insights from the author of Living to Die',
    site: context.site,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.pubDate,
      link: `/blog/${post.slug}/`,
      author: post.author,
      categories: post.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
