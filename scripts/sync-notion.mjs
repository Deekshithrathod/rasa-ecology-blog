import { Client } from '@notionhq/client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
const publishedStatuses = new Set(['Published', 'Done', 'Complete']);

if (!token || !databaseId) {
  console.log('Skipping Notion sync: NOTION_TOKEN or NOTION_DATABASE_ID is missing.');
  process.exit(0);
}

const notion = new Client({ auth: token });

const resolveDataSourceId = async (id) => {
  const database = await notion.databases.retrieve({ database_id: id });
  return database.data_sources?.[0]?.id ?? id;
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

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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

const blockToMarkdown = async (block, context = {}) => {
  const { listIndex = 1, slug } = context;
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

const pageBodyToMarkdown = async (pageId, slug) => {
  const blocks = await blockChildren(pageId);
  const lines = [];
  const context = { slug, listIndex: 1, imageCount: 0 };

  for (const block of blocks) {
    const line = await blockToMarkdown(block, context);

    if (block.type === 'numbered_list_item') {
      context.listIndex += 1;
    } else {
      context.listIndex = 1;
    }

    if (line) lines.push(line);
  }

  return lines.join('\n\n');
};

const frontmatterForPage = async (page) => {
  const properties = page.properties;
  const title = getTitle(properties);
  const slug = slugify(plainText(properties.Slug) || title);
  const publishedAt = getDate(properties, 'Published Date', new Date().toISOString().slice(0, 10));
  const updatedAt = getDate(properties, 'Updated Date', publishedAt);
  const description = plainText(properties.Description) || `Imported from Notion: ${title}`;
  const author = plainText(properties.Author) || 'Rasa Ecology';
  const notionStatus = plainText(properties.Status) || 'Draft';
  const status = publishedStatuses.has(notionStatus) ? 'Published' : notionStatus;
  const tags = multiSelect(properties.Tags);
  const heroSource = firstFileUrl(properties['Hero Image']) ?? coverImageUrl(page.cover);
  const heroImage = await downloadNotionAsset(heroSource, slug, 'hero');
  const targetKeyword = plainText(properties['Target Keyword']);

  const lines = [
    '---',
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `author: ${yamlString(author)}`,
    `status: ${yamlString(status)}`,
    `tags: ${yamlArray(tags)}`,
    `publishedAt: ${yamlString(publishedAt)}`,
    `updatedAt: ${yamlString(updatedAt)}`,
  ];

  if (heroImage) lines.push(`heroImage: ${yamlString(heroImage)}`);
  if (targetKeyword) lines.push(`targetKeyword: ${yamlString(targetKeyword)}`);

  lines.push('---');

  return { slug, frontmatter: lines.join('\n') };
};

const queryPublishedPages = async () => {
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
      ...response.results.filter((page) => publishedStatuses.has(plainText(page.properties?.Status)))
    );
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
};

await mkdir(outputDir, { recursive: true });

const pages = await queryPublishedPages();

for (const page of pages) {
  const { slug, frontmatter } = await frontmatterForPage(page);
  const body = await pageBodyToMarkdown(page.id, slug);
  const content = `${frontmatter}\n\n${body || '_This post has no body content yet._'}\n`;
  const destination = path.join(outputDir, `${slug}.md`);

  await writeFile(destination, content, 'utf8');
  console.log(`Synced Notion post: ${slug}`);
}

console.log(`Notion sync complete: ${pages.length} published post(s).`);
