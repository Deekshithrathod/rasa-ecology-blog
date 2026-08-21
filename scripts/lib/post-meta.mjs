import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const blogDir = path.resolve('src/content/blog');
const historyPath = path.resolve('data/slug-history.json');

const unquote = (value) => value.trim().replace(/^["']|["']$/g, '');

// astro.config.mjs runs before the content collection exists, so the few fields
// the sitemap needs are read straight off the frontmatter. Anything richer
// belongs in a page that can import astro:content instead.
const readFrontmatter = (contents) => {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const data = {};

  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!field) continue;
    data[field[1]] = unquote(field[2]);
  }

  return data;
};

export const readPostMeta = () => {
  let entries;

  try {
    entries = readdirSync(blogDir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.endsWith('.md') || entry.endsWith('.mdx'))
    .map((entry) => {
      const data = readFrontmatter(readFileSync(path.join(blogDir, entry), 'utf8'));

      return {
        slug: entry.replace(/\.(md|mdx)$/, ''),
        status: data.status ?? 'Draft',
        publishedAt: data.publishedAt,
        updatedAt: data.updatedAt || data.publishedAt,
      };
    });
};

export const readSlugHistory = () => {
  try {
    return JSON.parse(readFileSync(historyPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
};

// A slug that a post no longer uses keeps working as a redirect to the slug it
// moved to, so links and rankings earned under the old URL survive the rename.
export const readSlugRedirects = () => {
  const redirects = {};
  const live = new Set(
    readPostMeta()
      .filter((post) => post.status === 'Published')
      .map((post) => post.slug)
  );

  for (const entry of Object.values(readSlugHistory())) {
    if (!live.has(entry.current)) continue;

    for (const previous of entry.previous ?? []) {
      if (live.has(previous)) continue;
      redirects[`/${previous}/`] = `/${entry.current}/`;
    }
  }

  return redirects;
};
