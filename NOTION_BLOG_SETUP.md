# Notion Blog Setup

The Notion database is named `Rasa Blog Posts` and lives inside the Notion `RASA-Databases` page.

| Thing | Value |
| --- | --- |
| Database URL | `https://app.notion.com/p/100xdevs/370535e3ed4b80c488c0cdbd5863f847?v=370535e3ed4b8043a8a4000c643334ad` |
| Database ID (`NOTION_DATABASE_ID`) | `370535e3ed4b80c488c0cdbd5863f847` |
| Data source ID | `370535e3-ed4b-8011-b47d-000bcc5c8a2d` |
| Parent page | `RASA-Databases` (`370535e3ed4b8079b154d418077936b2`) |

Since Notion API version `2025-09-03` a database is a container for one or more
data sources, and pages are queried per data source. `NOTION_DATABASE_ID` stays
the database ID — `scripts/sync-notion.mjs` resolves the data source itself. The
integration needs access to the data source, not just the database.

## Database Properties

- `Name`: post title
- `Slug`: URL slug, for example `test-blog-from-notion`
- `Status`: set to `Done` for posts that should deploy. The database offers `Not started`, `In progress`, and `Done`; the sync treats `Done`, `Complete`, and `Published` as publishable, `Preview` and `In review` as preview-only, and skips everything else.
- `Author`: post author
- `Description`: short SEO/meta summary
- `Tags`: post tags
- `Published Date`: publish date
- `Updated Date`: optional last updated date
- `Hero Image`: optional cover image file or external media
- `Hero Image Alt`: optional description of the hero image for screen readers and image search
- `SEO Notes`: internal editorial notes
- `Target Keyword`: optional SEO target keyword

Add `Hero Image Alt` as a `Text` property if the database predates it. Every
other field already exists. Nothing else needs to be filled in for the SEO
metadata — structured data, Open Graph tags, dates, sitemap entries, and
`llms.txt` are all derived at build time from the fields above.

## Publishing Behaviour

The sync is the source of truth for every post it owns. Files it generates carry
a `notionId` in their frontmatter; hand-authored files in `src/content/blog/`
have none and are never rewritten or deleted.

- **Publishing.** `Status = Done` makes a post live at the next run. The workflow
  runs hourly and on every push, so expect it live within the hour.
- **Unpublishing.** Moving a post out of `Done` (or deleting it in Notion)
  removes its file, and the post disappears from the site, the sitemap, the feed,
  and `llms.txt` on the next run.
- **Preview.** `Status = Preview` builds the post at its real URL with a preview
  banner and a `noindex` tag. It stays out of the homepage, tag pages, the feed,
  the sitemap, and `llms.txt`, so it can be shared for review without being
  indexed.
- **Renaming.** Changing the `Slug` retires the old URL rather than breaking it.
  `data/slug-history.json` records every slug a page has used and the build turns
  retired ones into redirects to the current URL. That file is committed back by
  CI, so do not edit it by hand.
- **Missing `Description`.** The first ~155 characters of the post body are used
  instead. Writing a real description is still better; the fallback only exists
  so a forgotten field cannot ship as a broken meta description.
- **Duplicate slugs.** Two posts resolving to the same slug would overwrite each
  other, so the second is skipped and the run logs a warning.
- **Failures.** If a sync or build fails, the site keeps serving the last good
  build and the workflow opens a `blog-sync-failure` issue on the repo. Nothing
  new publishes until it is fixed.

## Integration Steps

1. Create or open an internal Notion integration at `https://www.notion.so/my-integrations`.
2. Copy the integration token and keep it private.
3. In Notion, open `Rasa Blog Posts`, choose `•••`, then `Connections`, and add the integration. Do the same on the parent `RASA-Databases` page — a connection added to an ancestor page is inherited by everything under it, which survives moving the database around.
4. Add local env values in `.env`:

```bash
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=370535e3ed4b80c488c0cdbd5863f847
```

5. Run `npm run sync:notion`.
6. Run `npm run build`.

## Friend Access

Invite the friend to the Notion `Rasa Blog Posts` database, or to the parent `RASA-Databases` page temporarily, with `Can edit` access if they should draft and edit posts. Keep integration tokens separate; the friend does not need the token.

## Deployment Secrets

For GitHub Pages deployment, add these repository secrets:

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

The GitHub Action runs `npm run sync:notion` before `npm run build`, so published Notion posts are pulled during deployment.

## Troubleshooting

### `Could not find data_source with ID: 370535e3-ed4b-8011-b47d-000bcc5c8a2d`

The sync prints `Notion database ... is readable, but none of its data sources are`
and the deploy job exits 1.

This is a Notion sharing problem, not a wrong ID: the integration can still read
the database container, but its grant does not reach the data source that holds
the posts. It typically happens after the database is moved to a different
parent page.

Fix it in Notion, not in this repo:

1. Open `Rasa Blog Posts`.
2. `•••` → `Connections` → remove the `RASA-BLog` integration if it is listed, then add it again.
3. Do the same on the parent `RASA-Databases` page.
4. Re-run the `Deploy Astro Blog to GitHub Pages` workflow.

Only change `NOTION_DATABASE_ID` if `databases.retrieve` itself fails with
`object_not_found` — that is the error for an ID that is genuinely wrong or
completely unshared.
