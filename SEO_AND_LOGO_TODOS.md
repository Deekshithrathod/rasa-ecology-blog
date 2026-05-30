# SEO and Logo TODOs

## Logo

- [x] Add the correctly oriented Rasa logo asset to `public/`.
- [x] Replace the text-only header brand with the logo plus accessible text.
- [x] Add favicon and app icon variants if the source logo supports it.
- [x] Verify the logo renders correctly on desktop and mobile.

## Open Graph Metadata

- [ ] Add a default site-wide Open Graph image, ideally 1200x630.
- [ ] Add Notion fields for `OG Title`, `OG Description`, `OG Image`, `Canonical URL`, and `Hero Image Alt`.
- [ ] Update `scripts/sync-notion.mjs` to import those Notion fields into blog frontmatter.
- [ ] Ensure every published blog post has `title`, `description`, `canonicalUrl`, and an OG image.
- [ ] Add fallback behavior so posts without `ogImage` use `heroImage`, then the default OG image.
- [ ] Update `BaseLayout.astro` to include complete Twitter card tags.
- [ ] Support `og:type="article"` for blog posts and `og:type="website"` for normal pages.
- [ ] Add article metadata for published time, modified time, author, and tags where available.

## Verification

- [ ] Run the site locally and inspect the generated `<head>` tags on at least one blog post.
- [ ] Test a blog URL with a social preview debugger after deployment.
- [ ] Confirm RSS and canonical URLs still point to the right public domain.
