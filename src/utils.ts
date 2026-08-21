import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

const byNewest = (a: BlogPost, b: BlogPost) =>
  b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf();

export async function getPublishedPosts() {
  const posts = await getCollection('blog', ({ data }) => data.status === 'Published');

  return posts.sort(byNewest);
}

// Preview posts get a page so the author can see the real thing before it goes
// public, but they are kept out of listings, feeds, and the sitemap, and the
// page itself is noindex.
export async function getRoutablePosts() {
  const posts = await getCollection(
    'blog',
    ({ data }) => data.status === 'Published' || data.status === 'Preview',
  );

  return posts.sort(byNewest);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getPostUrl(post: BlogPost) {
  return `/${getPostSlug(post)}/`;
}

export function getPostSlug(post: BlogPost) {
  return post.id.replace(/\.(md|mdx)$/, '');
}
