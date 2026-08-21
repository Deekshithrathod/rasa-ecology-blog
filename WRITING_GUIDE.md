# Writing and Publishing Guide

Everything happens in Notion. You never need to touch code, GitHub, or a
terminal.

## Publishing a post

1. Open the `Rasa Blog Posts` database in Notion and create a new page.
2. Write the post in the page body. Headings, bold, italics, links, quotes,
   bullet and numbered lists, code blocks, dividers, and images all carry over.
3. Fill in the properties on the right (see below).
4. Set **Status** to **Done**.

The site rebuilds every hour, so the post is live within the hour at
`https://blog.rasaecology.com/your-slug/`.

## The properties, and which ones matter

| Property | Fill it in? | What it does |
| --- | --- | --- |
| **Name** | Always | The post title. Shows as the headline and the browser tab. |
| **Slug** | Always | The URL. Use lowercase words with hyphens: `living-soil-basics`. |
| **Status** | Always | `Done` publishes. `Preview` shares privately. Anything else stays hidden. |
| **Description** | Always | The one-sentence summary Google and social previews show. Aim for 120–155 characters. |
| **Author** | Always | Your name. Gets its own page listing everything you have written. |
| **Published Date** | Always | The date shown on the post. |
| **Tags** | Recommended | Groups posts by topic and creates topic pages. |
| **Hero Image** | Recommended | The image at the top of the post, also used in social previews. |
| **Hero Image Alt** | If you add a hero | One sentence describing the image, for screen readers and image search. |
| **Updated Date** | When you revise | Shows "updated" on the post and tells search engines the post is current. |
| **Target Keyword** | Optional | Your own note about what the post should rank for. Not shown on the site. |
| **SEO Notes** | Optional | Internal notes. Never published. |

Everything else a search engine or AI assistant needs is generated
automatically. There is no separate SEO checklist to work through.

## Checking a post before it goes public

Set **Status** to **Preview** instead of `Done`. Within the hour the post is
live at its real URL with a "Preview" banner, hidden from the homepage, the
feed, and search engines. Share the link, get feedback, then switch to `Done`.

## Editing a post that is already live

Edit it in Notion and, if the change is meaningful, set **Updated Date** to
today. The live post updates on the next run.

## Taking a post down

Change **Status** away from `Done`. The post is removed from the site, the
sitemap, and the feed on the next run.

## Changing a post's URL

Edit the **Slug**. The old URL keeps working and forwards to the new one
automatically, so links people have already shared do not break. Still, avoid
changing slugs on posts that have been live a while — the redirect works, but a
stable URL is always better.

## Things worth knowing

- **Two posts cannot share a slug.** If they do, the second one is skipped.
  Give each post a unique slug.
- **Forgetting Description is survivable.** The opening lines of the post are
  used instead. It is worth writing a real one.
- **Images are copied into the site.** Notion image links expire, so each image
  is downloaded at publish time. Large images are fine.
- **If a post does not appear within about 90 minutes**, something failed.
  Check with whoever maintains the repo — a failed publish opens an issue on
  GitHub automatically, and the site keeps serving the previous version in the
  meantime.

## Writing for search and AI assistants

The technical work is handled. What still depends on you:

- **Answer a specific question.** "What living soil means for regenerative
  growing" gets found. "Thoughts on soil" does not.
- **Put the answer near the top.** State the conclusion in the first paragraph,
  then explain it. This is what gets quoted in AI answers and featured snippets.
- **Use headings as questions** where it reads naturally. Assistants pull
  answers section by section.
- **Be concrete.** Numbers, methods, and specifics get cited; general
  encouragement does not.
- **Publish steadily.** Volume and consistency matter more than any single
  post's optimization.
