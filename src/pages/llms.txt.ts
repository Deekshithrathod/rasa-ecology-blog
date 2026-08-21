import { ORGANIZATION_NAME, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';
import { getPostUrl, getPublishedPosts, isoDate } from '../utils';

// llms.txt is the agent-facing map of the site: one plain-text file an assistant
// can read in a single fetch to learn what is here and where to go next.
export async function GET() {
  const posts = await getPublishedPosts();
  const tags = Array.from(new Set(posts.flatMap((post) => post.data.tags))).sort((a, b) =>
    a.localeCompare(b),
  );

  const lines = [
    `# ${SITE_TITLE}`,
    '',
    `> ${SITE_DESCRIPTION} Published by ${ORGANIZATION_NAME}.`,
    '',
    'All content is written by named authors and reviewed before publishing. Dates below',
    'are the last modified date for each post. The full text of every post is available at',
    `${SITE_URL}/llms-full.txt, and as a feed at ${SITE_URL}/rss.xml.`,
    '',
    '## Posts',
    '',
  ];

  for (const post of posts) {
    const url = new URL(getPostUrl(post), SITE_URL).toString();
    const updated = isoDate(post.data.updatedAt ?? post.data.publishedAt);
    lines.push(
      `- [${post.data.title}](${url}): ${post.data.description} ` +
        `(by ${post.data.author}, updated ${updated})`,
    );
  }

  if (tags.length > 0) {
    lines.push('', '## Topics', '');

    for (const tag of tags) {
      const url = new URL(`/tags/${tag.toLowerCase().replaceAll(' ', '-')}/`, SITE_URL).toString();
      lines.push(`- [${tag}](${url})`);
    }
  }

  lines.push('', '## Optional', '', `- [RSS feed](${SITE_URL}/rss.xml)`, `- [Sitemap](${SITE_URL}/sitemap-index.xml)`, '');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
