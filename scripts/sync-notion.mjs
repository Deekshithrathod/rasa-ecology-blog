import { Client } from '@notionhq/client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  excerptFromMarkdown,
  recordSlug,
  removeStalePosts,
  slugify,
} from './lib/sync-support.mjs';

const loadLocalEnv = async () => {
  try {
    const file = await readFile(path.resolve('.env'), 'utf8');

    for (const line of file.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key]) continue;

      process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

await loadLocalEnv();

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
const outputDir = path.resolve('src/content/blog');
const assetDir = path.resolve('public/notion-assets');
const historyPath = path.resolve('data/slug-history.json');

// Notion's own status vocabulary is not fixed, so several spellings map onto the
// two states the site cares about. Anything else stays out of the build.
const publishedStatuses = new Set(['Published', 'Done', 'Complete']);
const previewStatuses = new Set(['Preview', 'In review']);
const syncedStatuses = new Set([...publishedStatuses, ...previewStatuses]);

if (!token || !databaseId) {
  console.log('Skipping Notion sync: NOTION_TOKEN or NOTION_DATABASE_ID is missing.');
  process.exit(0);
}

const notion = new Client({ auth: token });

const shareHint =
  'In Notion, open the database → ••• → Connections → re-add the integration, ' +
  'then re-run the sync.';

// Since API version 2025-09-03 a database is a container for one or more data
// sources, and pages are queried per data source. Access is granted per data
// source too, so a database can be readable while its data sources are not.
const resolveDataSourceId = async (id) => {
  let database;

  try {
    database = await notion.databases.retrieve({ database_id: id });
  } catch (error) {
    if (error.code === 'object_not_found') {
      throw new Error(`Notion database ${id} is not shared with this integration. ${shareHint}`);
    }
    throw error;
  }

  const dataSources = database.data_sources ?? [];

  if (dataSources.length === 0) {
    throw new Error(`Notion database ${id} reports no data sources. ${shareHint}`);
  }

  const unreachable = [];

  for (const dataSource of dataSources) {
    try {
      await notion.dataSources.query({ data_source_id: dataSource.id, page_size: 1 });
      return dataSource.id;
    } catch (error) {
      if (error.code !== 'object_not_found') throw error;
      unreachable.push(`  - ${dataSource.name || 'unnamed'} (${dataSource.id})`);
    }
  }

  throw new Error(
    `Notion database ${id} is readable, but none of its data sources are:\n` +
      `${unreachable.join('\n')}\n` +
      `The integration's grant does not cover them. ${shareHint}`
  );
};

const richTextToMarkdown = (items = []) =>
  items
    .map((item) => {
      let text = item.plain_text ?? '';
      const href = item.href;
      const annotations = item.annotations ?? {};

      text = text.replace(/\*/g, '\\*').replace(/_/g, '\\_');

      if (annotations.code) text = `\`${text}\``;
      if (annotations.bold) text = `**${text}**`;
      if (annotations.italic) text = `_${text}_`;
      if (annotations.strikethrough) text = `~~${text}~~`;
      if (href) text = `[${text}](${href})`;

      return text;
    })
    .join('');

const plainText = (property) => {
  if (!property) return '';

  if (property.type === 'title') return property.title.map((item) => item.plain_text).join('');
  if (property.type === 'rich_text') return property.rich_text.map((item) => item.plain_text).join('');
  if (property.type === 'select') return property.select?.name ?? '';
  if (property.type === 'status') return property.status?.name ?? '';
  if (property.type === 'date') return property.date?.start ?? '';
  if (property.type === 'url') return property.url ?? '';

  return '';
};

const multiSelect = (property) => {
  if (!property || property.type !== 'multi_select') return [];
  return property.multi_select.map((option) => option.name);
};

const firstFileUrl = (property) => {
  if (!property || property.type !== 'files' || property.files.length === 0) return undefined;
  const [file] = property.files;
  return file.type === 'external' ? file.external.url : file.file.url;
};

const coverImageUrl = (cover) => {
  if (!cover) return undefined;
  return cover.type === 'external' ? cover.external?.url : cover.file?.url;
};

const yamlString = (value) => JSON.stringify(value ?? '');

const yamlArray = (values) => `[${values.map((value) => yamlString(value)).join(', ')}]`;

// Notion-hosted files use signed URLs that expire after ~1 hour, so they must be
// downloaded into the build. External URLs are stable and pass through unchanged.
const downloadNotionAsset = async (url, slug, name) => {
  if (!url) return undefined;
  if (!url.includes('prod-files-secure.s3')) return url;

  const parsedUrl = new URL(url);
  const extension = path.extname(parsedUrl.pathname) || '.jpg';
  const fileName = `${slug}-${name}${extension}`;
  const destination = path.join(assetDir, fileName);

  // Large assets (GIFs, hero images) can be slow; retry once before giving up.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await mkdir(assetDir, { recursive: true });
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));

      return `/notion-assets/${fileName}`;
    } catch (error) {
      if (attempt === 2) {
        console.warn(`Skipping Notion asset for ${slug} (${name}): ${error.message}`);
        return undefined;
      }
    }
  }
};

const getTitle = (properties) =>
  plainText(properties.Title) || plainText(properties.Name) || 'Untitled';

const getDate = (properties, key, fallback) => {
  const value = plainText(properties[key]);
  return value || fallback;
};

const blockChildren = async (blockId) => {
  const blocks = [];
  let cursor;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return blocks;
};

const blockToMarkdown = async (block, context, listIndex) => {
  const { slug } = context;
  const type = block.type;
  const value = block[type];

  switch (type) {
    case 'paragraph':
      return richTextToMarkdown(value.rich_text);
    case 'heading_1':
      return `# ${richTextToMarkdown(value.rich_text)}`;
    case 'heading_2':
      return `## ${richTextToMarkdown(value.rich_text)}`;
    case 'heading_3':
      return `### ${richTextToMarkdown(value.rich_text)}`;
    case 'bulleted_list_item':
      return `- ${richTextToMarkdown(value.rich_text)}`;
    case 'numbered_list_item':
      return `${listIndex}. ${richTextToMarkdown(value.rich_text)}`;
    case 'quote':
      return `> ${richTextToMarkdown(value.rich_text)}`;
    case 'callout':
      return `> ${richTextToMarkdown(value.rich_text)}`;
    case 'code':
      return `\`\`\`${value.language === 'plain text' ? '' : value.language}\n${richTextToMarkdown(value.rich_text)}\n\`\`\``;
    case 'image': {
      const sourceUrl = value.type === 'external' ? value.external.url : value.file.url;
      const caption = richTextToMarkdown(value.caption) || 'Notion image';
      context.imageCount = (context.imageCount ?? 0) + 1;
      const localUrl = await downloadNotionAsset(sourceUrl, slug, `image-${context.imageCount}`);
      return `![${caption}](${localUrl ?? sourceUrl})`;
    }
    case 'divider':
      return '---';
    default:
      return '';
  }
};

const indentLines = (text, indent) =>
  text
    .split('\n')
    .map((line) => (line ? `${indent}${line}` : line))
    .join('\n');

// Columns exist only as Notion layout. Markdown has no equivalent, so a
// column_list and its columns contribute nothing themselves and their children
// are flattened into the surrounding document flow.
const layoutTypes = new Set(['column_list', 'column']);

const renderBlocks = async (blocks, context, indent = '') => {
  const lines = [];
  let listIndex = 1;

  for (const block of blocks) {
    const children = block.has_children ? await blockChildren(block.id) : [];

    if (layoutTypes.has(block.type)) {
      const flattened = await renderBlocks(children, context, indent);
      if (flattened) lines.push(flattened);
      listIndex = 1;
      continue;
    }

    const line = await blockToMarkdown(block, context, listIndex);

    if (block.type === 'numbered_list_item') {
      listIndex += 1;
    } else {
      listIndex = 1;
    }

    if (line) lines.push(indent ? indentLines(line, indent) : line);

    if (children.length > 0) {
      const nested = await renderBlocks(children, context, `${indent}  `);
      if (nested) lines.push(nested);
    }
  }

  return lines.join('\n\n');
};

const pageBodyToMarkdown = async (pageId, slug) => {
  const blocks = await blockChildren(pageId);
  return renderBlocks(blocks, { slug, imageCount: 0 });
};

const loadSlugHistory = async () => {
  try {
    return JSON.parse(await readFile(historyPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
};

const frontmatterForPage = async (page, slug, body) => {
  const properties = page.properties;
  const title = getTitle(properties);
  const publishedAt = getDate(properties, 'Published Date', new Date().toISOString().slice(0, 10));
  const updatedAt = getDate(properties, 'Updated Date', publishedAt);
  const description =
    plainText(properties.Description) || excerptFromMarkdown(body) || `${title}.`;
  const author = plainText(properties.Author) || 'Rasa Ecology';
  const notionStatus = plainText(properties.Status) || 'Draft';
  const status = publishedStatuses.has(notionStatus)
    ? 'Published'
    : previewStatuses.has(notionStatus)
      ? 'Preview'
      : notionStatus;
  const tags = multiSelect(properties.Tags);
  const heroSource = firstFileUrl(properties['Hero Image']) ?? coverImageUrl(page.cover);
  const heroImage = await downloadNotionAsset(heroSource, slug, 'hero');
  const heroImageAlt = plainText(properties['Hero Image Alt']);
  const targetKeyword = plainText(properties['Target Keyword']);

  const lines = [
    '---',
    // notionId marks this file as sync-owned. Files without it are hand-authored
    // and are never rewritten or removed by the sync.
    `notionId: ${yamlString(page.id)}`,
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `author: ${yamlString(author)}`,
    `status: ${yamlString(status)}`,
    `tags: ${yamlArray(tags)}`,
    `publishedAt: ${yamlString(publishedAt)}`,
    `updatedAt: ${yamlString(updatedAt)}`,
  ];

  if (heroImage) lines.push(`heroImage: ${yamlString(heroImage)}`);
  if (heroImageAlt) lines.push(`heroImageAlt: ${yamlString(heroImageAlt)}`);
  if (targetKeyword) lines.push(`targetKeyword: ${yamlString(targetKeyword)}`);

  lines.push('---');

  return lines.join('\n');
};

const querySyncablePages = async () => {
  const pages = [];
  let cursor;
  const dataSourceId = await resolveDataSourceId(databaseId);

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
      sorts: [
        {
          property: 'Published Date',
          direction: 'descending',
        },
      ],
    });

    pages.push(
      ...response.results.filter((page) => syncedStatuses.has(plainText(page.properties?.Status)))
    );
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
};

await mkdir(outputDir, { recursive: true });

let pages;

try {
  pages = await querySyncablePages();
} catch (error) {
  console.error(`Notion sync failed: ${error.message}`);
  process.exit(1);
}

const history = await loadSlugHistory();
const writtenFiles = new Set();
const usedSlugs = new Map();
let previewCount = 0;

for (const page of pages) {
  const title = getTitle(page.properties);
  let slug = slugify(plainText(page.properties.Slug) || title);

  if (!slug) slug = slugify(page.id);

  // Two posts resolving to one slug would silently overwrite each other.
  if (usedSlugs.has(slug)) {
    console.warn(
      `Duplicate slug "${slug}" from "${title}" collides with "${usedSlugs.get(slug)}". ` +
        'Set a unique Slug in Notion; skipping this post.'
    );
    continue;
  }

  usedSlugs.set(slug, title);
  recordSlug(history, page.id, slug, (from, to) => {
    console.warn(
      `Slug changed for "${title}": "${from}" → "${to}". The old URL will be redirected.`
    );
  });

  const body = await pageBodyToMarkdown(page.id, slug);
  const frontmatter = await frontmatterForPage(page, slug, body);
  const content = `${frontmatter}\n\n${body || '_This post has no body content yet._'}\n`;
  const fileName = `${slug}.md`;

  await writeFile(path.join(outputDir, fileName), content, 'utf8');
  writtenFiles.add(fileName);

  if (previewStatuses.has(plainText(page.properties.Status))) previewCount += 1;

  console.log(`Synced Notion post: ${slug}`);
}

const removed = await removeStalePosts(outputDir, writtenFiles);

for (const entry of removed) {
  console.log(`Removed unpublished post: ${entry}`);
}

// Retired slugs only become redirects once this file reaches the build, so it is
// written on every run and committed by CI when it changes.
await mkdir(path.dirname(historyPath), { recursive: true });
await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');

console.log(
  `Notion sync complete: ${writtenFiles.size - previewCount} published, ` +
    `${previewCount} preview, ${removed.length} removed.`
);
