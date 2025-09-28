import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.enum(['news', 'reflections', 'updates', 'events']),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Diane Melton'),
    featured: z.boolean().default(false),
  }),
});

const poetry = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    publication: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const publications = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    publication: z.string(),
    pubDate: z.coerce.date(),
    link: z.string().url().optional(),
    description: z.string(),
    type: z.enum(['essay', 'article', 'story', 'review']),
  }),
});

const resources = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().url(),
    category: z.enum(['medical-advocacy', 'legal-resources', 'medical-research', 'support-communities']),
    primaryLink: z.string().url(),
    secondaryLink: z.string().url().optional(),
    primaryLinkText: z.string().default('Visit Site'),
    secondaryLinkText: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog, poetry, publications, resources };