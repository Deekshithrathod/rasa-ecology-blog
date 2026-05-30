# Notion Blog Setup

The Notion database is named `Rasa Blog Posts` and currently lives inside the Notion `Inbox` page.

## Database Properties

- `Name`: post title
- `Slug`: URL slug, for example `test-blog-from-notion`
- `Status`: use `Published` for posts that should deploy
- `Author`: post author
- `Description`: short SEO/meta summary
- `Tags`: post tags
- `Published Date`: publish date
- `Updated Date`: optional last updated date
- `Hero Image`: optional cover image file or external media
- `SEO Notes`: internal editorial notes
- `Target Keyword`: optional SEO target keyword

## Integration Steps

1. Create or open an internal Notion integration at `https://www.notion.so/my-integrations`.
2. Copy the integration token and keep it private.
3. In Notion, open `Rasa Blog Posts`, choose `...`, then `Connections`, and add the integration.
4. Add local env values in `.env`:

```bash
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=370535e3ed4b80c488c0cdbd5863f847
```

5. Run `npm run sync:notion`.
6. Run `npm run build`.

## Friend Access

Invite the friend to the Notion `Rasa Blog Posts` database, or to the parent `Inbox` page temporarily, with `Can edit` access if they should draft and edit posts. Keep integration tokens separate; the friend does not need the token.

## Deployment Secrets

For GitHub Pages deployment, add these repository secrets:

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

The GitHub Action runs `npm run sync:notion` before `npm run build`, so published Notion posts are pulled during deployment.
