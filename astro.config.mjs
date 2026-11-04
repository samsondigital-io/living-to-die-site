// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://dianemelton.com',
  output: 'server',
  adapter: vercel(),
  // Astro 7 defaults to 'jsx' whitespace handling, which strips the spaces
  // between adjacent inline elements. Keep the Astro 5 behavior.
  compressHTML: true,
  integrations: [
    mdx(),
    sitemap(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      langs: [],
      wrap: true,
    },
  },
});
