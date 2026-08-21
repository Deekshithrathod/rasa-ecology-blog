import { readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

export const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// A missing Description would otherwise ship as the page's meta description, so
// fall back to the opening prose with the markdown syntax taken back out.
export const excerptFromMarkdown = (markdown, limit = 155) => {
  const prose = (markdown ?? '')
    .split('\n')
    .filter((line) => !/^\s*(#|>|```|!\[|---|\||-\s|\d+\.\s)/.test(line))
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!prose) return '';
  if (prose.length <= limit) return prose;

  const clipped = prose.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(' ');

  return `${(lastSpace > 60 ? clipped.slice(0, lastSpace) : clipped).replace(/[,;:.]$/, '')}…`;
};

// The slug is the post's public URL, so a later edit in Notion would silently
// break every existing link to it. The history maps each Notion page to the
// slugs it has ever used; the build turns the retired ones into redirects.
export const recordSlug = (history, pageId, slug, onChange) => {
  const entry = history[pageId];

  if (!entry) {
    history[pageId] = { current: slug, previous: [] };
    return history;
  }

  if (entry.current === slug) return history;

  onChange?.(entry.current, slug);

  entry.previous = [...new Set([...(entry.previous ?? []), entry.current])].filter(
    (value) => value !== slug
  );
  entry.current = slug;

  return history;
};

// Unpublishing in Notion has to actually take the post down. Every file the sync
// owns but did not just write is one whose page left the published set.
// Files without a notionId are hand-authored and are never touched.
export const removeStalePosts = async (outputDir, writtenFiles) => {
  let entries;

  try {
    entries = await readdir(outputDir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const removed = [];

  for (const entry of entries) {
    if (!entry.endsWith('.md') && !entry.endsWith('.mdx')) continue;
    if (writtenFiles.has(entry)) continue;

    const filePath = path.join(outputDir, entry);
    const contents = await readFile(filePath, 'utf8');

    if (!/^notionId:/m.test(contents)) continue;

    await unlink(filePath);
    removed.push(entry);
  }

  return removed;
};
