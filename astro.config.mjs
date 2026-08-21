import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { readPostMeta, readSlugRedirects } from './scripts/lib/post-meta.mjs';
import { rehypeImageAttrs } from './scripts/lib/rehype-image-attrs.mjs';

const site = 'https://blog.rasaecology.com';
const posts = readPostMeta();
const redirects = readSlugRedirects();

const lastModified = new Map(
  posts
    .filter((post) => post.updatedAt)
    .map((post) => [`${site}/${post.slug}/`, new Date(post.updatedAt)])
);

// Preview posts are reachable so the author can check them, but they carry a
// noindex and must stay out of the sitemap. Retired slugs are redirect stubs.
const excluded = new Set([
  ...posts.filter((post) => post.status !== 'Published').map((post) => `${site}/${post.slug}/`),
  ...Object.keys(redirects).map((from) => `${site}${from}`),
]);

export default defineConfig({
  site,
  redirects,
  integrations: [
    sitemap({
      filter: (page) => !excluded.has(page),
      serialize: (item) => {
        const lastmod = lastModified.get(item.url);
        return lastmod ? { ...item, lastmod: lastmod.toISOString() } : item;
      },
    }),
  ],
  markdown: {
    processor: unified({ rehypePlugins: [rehypeImageAttrs] }),
  },
  output: 'static',
});
