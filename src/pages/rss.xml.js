import rss from '@astrojs/rss';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { render } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';
import { getPostUrl, getPublishedPosts } from '../utils';

// Feed readers and ingestion pipelines resolve nothing relative to the site, so
// every in-content URL has to be absolute by the time it leaves here.
const absolutize = (html) =>
  html
    .replaceAll('src="/', `src="${SITE_URL}/`)
    .replaceAll('href="/', `href="${SITE_URL}/`);

export async function GET(context) {
  const posts = await getPublishedPosts();
  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);

      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.publishedAt,
        link: getPostUrl(post),
        author: post.data.author,
        categories: post.data.tags,
        // Full text, so the feed works as a complete source rather than a teaser.
        content: absolutize(await container.renderToString(Content)),
      };
    }),
  );

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items,
    customData: '<language>en-us</language>',
  });
}
