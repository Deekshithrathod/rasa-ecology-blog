import { Client } from '@notionhq/client';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
const outputDir = path.resolve('src/content/blog');

if (!token || !databaseId) {
  console.log('Skipping Notion sync: NOTION_TOKEN or NOTION_DATABASE_ID is missing.');
  process.exit(0);
}

const notion = new Client({ auth: token });

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

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const yamlString = (value) => JSON.stringify(value ?? '');

const yamlArray = (values) => `[${values.map((value) => yamlString(value)).join(', ')}]`;

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

const blockToMarkdown = async (block, listIndex = 1) => {
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
      const url = value.type === 'external' ? value.external.url : value.file.url;
      const caption = richTextToMarkdown(value.caption) || 'Notion image';
      return `![${caption}](${url})`;
    }
    case 'divider':
      return '---';
    default:
      return '';
  }
};

const pageBodyToMarkdown = async (pageId) => {
  const blocks = await blockChildren(pageId);
  const lines = [];
  let numberedIndex = 1;

  for (const block of blocks) {
    const line = await blockToMarkdown(block, numberedIndex);

    if (block.type === 'numbered_list_item') {
      numberedIndex += 1;
    } else {
      numberedIndex = 1;
    }

    if (line) lines.push(line);
  }

  return lines.join('\n\n');
};

const frontmatterForPage = (page) => {
  const properties = page.properties;
  const title = getTitle(properties);
  const slug = slugify(plainText(properties.Slug) || title);
  const publishedAt = getDate(properties, 'Published Date', new Date().toISOString().slice(0, 10));
  const updatedAt = getDate(properties, 'Updated Date', publishedAt);
  const description = plainText(properties.Description) || `Imported from Notion: ${title}`;
  const author = plainText(properties.Author) || 'Rasa Ecology';
  const status = plainText(properties.Status) || 'Draft';
  const tags = multiSelect(properties.Tags);
  const heroImage = firstFileUrl(properties['Hero Image']);
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

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      filter: {
        property: 'Status',
        status: {
          equals: 'Published',
        },
      },
      sorts: [
        {
          property: 'Published Date',
          direction: 'descending',
        },
      ],
    });

    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
};

await mkdir(outputDir, { recursive: true });

const pages = await queryPublishedPages();

for (const page of pages) {
  const { slug, frontmatter } = frontmatterForPage(page);
  const body = await pageBodyToMarkdown(page.id);
  const content = `${frontmatter}\n\n${body || '_This post has no body content yet._'}\n`;
  const destination = path.join(outputDir, `${slug}.md`);

  await writeFile(destination, content, 'utf8');
  console.log(`Synced Notion post: ${slug}`);
}

console.log(`Notion sync complete: ${pages.length} published post(s).`);
