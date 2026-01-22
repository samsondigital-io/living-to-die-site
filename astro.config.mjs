// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://livingtodie.com', // Update with actual domain
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
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
