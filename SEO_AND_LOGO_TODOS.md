# SEO and Logo TODOs

## Logo

- [x] Add the correctly oriented Rasa logo asset to `public/`.
- [x] Replace the text-only header brand with the logo plus accessible text.
- [x] Add favicon and app icon variants if the source logo supports it.
- [x] Verify the logo renders correctly on desktop and mobile.

## Open Graph Metadata

- [x] Add a default site-wide Open Graph image, ideally 1200x630.
- [x] Add a Notion field for `Hero Image Alt`. `OG Title`, `OG Description`, and
      `Canonical URL` were deliberately skipped: the frontmatter supports them
      for hand-authored posts, but the fallbacks are good and every extra Notion
      field is friction for the author.
- [x] Update `scripts/sync-notion.mjs` to import `Hero Image Alt`.
- [x] Ensure every published post has `title`, `description`, canonical, and an
      OG image. `description` falls back to a body excerpt, canonical is derived
      from the slug, and the OG image falls back through `ogImage` → `heroImage`
      → the site default.
- [x] Add fallback behavior so posts without `ogImage` use `heroImage`, then the
      default OG image.
- [x] Update `BaseLayout.astro` to include complete Twitter card tags.
- [x] Support `og:type="article"` for blog posts and `og:type="website"` for
      normal pages.
- [x] Add article metadata for published time, modified time, author, and tags.

## Structured Data and Machine Readability

- [x] `Organization` and `WebSite` JSON-LD on every page, cross-referenced by `@id`.
- [x] `BlogPosting` + `BreadcrumbList` on posts, `Blog` on the homepage,
      `CollectionPage` + `ItemList` on tag pages, `ProfilePage` + `Person` on
      author pages.
- [x] Machine-readable `<time datetime>` for published and updated dates.
- [x] `lastmod` in the sitemap, driven by `updatedAt`.
- [x] `robots.txt` with a `Sitemap:` directive and explicit allows for search and
      AI crawlers.
- [x] `llms.txt` (site map for assistants) and `llms-full.txt` (full text of every
      published post), both generated at build time.
- [x] Full-text RSS via `content:encoded` with absolute URLs.
- [x] `404.astro`, excluded from indexing.
- [x] Intrinsic `width`/`height` on body images so inline images do not shift
      layout. Hero and card images were already sized by `aspect-ratio`.

## Verification

- [x] Inspect the generated `<head>` tags on a blog post.
- [x] Confirm preview posts carry `noindex` and stay out of the sitemap, feed,
      listings, and `llms.txt`.
- [x] Confirm retired slugs generate redirects and are excluded from the sitemap.
- [ ] Verify the domain in Google Search Console and submit `sitemap-index.xml`.
- [ ] Verify in Bing Webmaster Tools as well — ChatGPT's search grounding leans
      on Bing's index.
- [ ] Run the deployed post URL through the Rich Results Test.
- [ ] Test a blog URL with a social preview debugger after deployment.
- [ ] Run PageSpeed Insights on a post and confirm Core Web Vitals.

## Content

The technical work is done; visibility now depends on content. Four posts is not
enough to rank or be cited, and one of them is a test post.

- [ ] Rewrite or unpublish `first-test-blog` — the body is genuinely good, but
      the title ("Test Blog from Notion"), description ("temp description"), and
      target keyword are placeholders.
- [ ] Expand `living-soil-basics` beyond 213 words.
- [ ] Publish steadily against specific long-tail questions. See
      `WRITING_GUIDE.md`.
