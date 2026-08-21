import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    // Present only on posts the Notion sync owns; hand-authored files omit it.
    notionId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    author: z.string(),
    status: z.enum(['Draft', 'Preview', 'Ready', 'Published', 'Archived']).default('Draft'),
    tags: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    canonicalUrl: z.url().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImage: z.string().optional(),
    targetKeyword: z.string().optional(),
  }),
});

export const collections = { blog };
