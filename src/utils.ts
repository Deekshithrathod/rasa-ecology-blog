import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

export async function getPublishedPosts() {
  const posts = await getCollection('blog', ({ data }) => data.status === 'Published');

  return posts.sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getPostUrl(post: BlogPost) {
  return `/blog/${getPostSlug(post)}/`;
}

export function getPostSlug(post: BlogPost) {
  return post.id.replace(/\.(md|mdx)$/, '');
}
