import { ORGANIZATION_NAME, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';
import { getPostUrl, getPublishedPosts, isoDate } from '../utils';

// The companion to llms.txt: every published post as clean markdown in one
// fetch, so an assistant can answer from the source text instead of scraping
// each page and stripping the site chrome back out.
export async function GET() {
  const posts = await getPublishedPosts();

  const sections = posts.map((post) => {
    const url = new URL(getPostUrl(post), SITE_URL).toString();
    const updated = isoDate(post.data.updatedAt ?? post.data.publishedAt);

    return [
      `# ${post.data.title}`,
      '',
      `URL: ${url}`,
      `Author: ${post.data.author}`,
      `Published: ${isoDate(post.data.publishedAt)}`,
      `Updated: ${updated}`,
      ...(post.data.tags.length > 0 ? [`Tags: ${post.data.tags.join(', ')}`] : []),
      '',
      post.data.description,
      '',
      '---',
      '',
      post.body?.trim() ?? '',
    ].join('\n');
  });

  const body = [
    `# ${SITE_TITLE}`,
    '',
    `> ${SITE_DESCRIPTION} Published by ${ORGANIZATION_NAME}.`,
    '',
    `Full text of ${posts.length} published post(s). Source: ${SITE_URL}/`,
    '',
    ...sections.flatMap((section) => [section, '']),
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
