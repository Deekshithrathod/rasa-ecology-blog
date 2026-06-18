# Rasa Ecology Blog Design System Brief

Source: https://blog.rasaecology.com
Captured pages: home, tags, living soil article, first test blog article.
Figma file created: https://www.figma.com/design/f3k5xMffsm6bnTJIn91GLo

## Observed Product Structure

- Homepage with header, editorial hero, latest writing grid, post cards, tag chips, footer.
- Article pages with shared header/footer, article title/meta, optional hero image, serif article body, floating table-of-contents button, modal table of contents.
- Tags page with section heading and tag chip list.

## Foundations

### Color Tokens

| Token | Hex | Usage |
|---|---:|---|
| `color.bg` | `#FBFBF7` | Page background, tag chip background |
| `color.surface` | `#FFFFFF` | Cards, modal panel |
| `color.text` | `#173126` | Primary text, brand, active nav |
| `color.muted` | `#617166` | Body summaries, metadata, secondary nav |
| `color.border` | `#DCE3D8` | Header/footer dividers, card borders, tag borders |
| `color.accent` | `#276749` | Links, floating TOC button, blockquote border |
| `color.accent.strong` | `#1F5139` | Tag text, TOC active text, blockquote text |
| `color.band` | `#EDF4E9` | Image placeholder, hover fills |
| `color.overlay` | `#0D1C1573` | TOC modal backdrop |
| `shadow.toc.button` | `#17312647` | TOC floating button shadow |
| `shadow.toc.panel` | `#0D1C1566` | TOC modal panel shadow |

### Typography

| Style | Family | Size | Line | Weight | Usage |
|---|---|---:|---:|---:|---|
| `display.hero` | Georgia | 96px desktop, clamp 48-104px | 0.96 | 500 | Homepage hero |
| `display.article` | Georgia | 72px desktop, clamp 44-80px | 1.0 | 500 | Article title |
| `heading.section` | Georgia | 48px desktop, clamp 32-51px | 1.05 | 500 | Section and Tags page headings |
| `heading.card` | Georgia | 23px | 1.18 | 500 | Post-card title |
| `heading.article.h2` | Inter | 25px | 1.2 | 700 | Article H2 |
| `heading.article.h3` | Inter | 20px | 1.2 | 700 | Article H3 |
| `body.ui` | Inter | 16px | 1.6 | 400 | General UI text |
| `body.article` | Georgia | 19px | 1.75 | 400 | Article prose |
| `body.lead` | Inter | 17-19px | 1.6 | 400 | Hero and article descriptions |
| `meta` | Inter | 14px | 1.6 | 400 | Dates, authors |
| `nav` | Inter | 15px | 1.6 | 700 | Header links |
| `chip` | Inter | 13px | 1.6 | 400 | Tag chips |
| `overline` | Inter | 12px | 1.2 | 700 | TOC modal title |

### Spacing And Layout

| Token | Value | Usage |
|---|---:|---|
| `space.1` | 4px | Chip vertical padding |
| `space.2` | 8px | Card meta gap, chip gap |
| `space.3` | 10px | Brand gap, chip horizontal padding |
| `space.4` | 14px | Mobile page gutter |
| `space.5` | 18px | Nav gap, listing gap |
| `space.6` | 20px | Modal padding, inner width subtraction |
| `space.7` | 22px | Card body padding |
| `space.8` | 24px | Grid gap, modal padding |
| `space.9` | 28px | Footer padding |
| `space.10` | 32px | Body horizontal page padding |
| `space.11` | 36px | Article header margin |
| `space.12` | 48px | Hero column gap |
| `space.13` | 56px | Hero bottom padding |
| `space.14` | 64px | Desktop main top padding |
| `space.15` | 80px | Desktop main bottom padding |

### Radius

| Token | Value | Usage |
|---|---:|---|
| `radius.sm` | 8px | Cards, images, TOC links |
| `radius.md` | 16px | TOC modal panel |
| `radius.full` | 999px | Tags, floating TOC button, close button |

### Widths

| Token | Value | Usage |
|---|---:|---|
| `container.site` | 1120px max | Header, main, footer |
| `container.article` | 760px max | Article content |
| `container.listing` | 820px max | Tag/category listings |
| `modal.toc.width` | 320px max | TOC modal |
| `breakpoint.tablet` | 820px | Hero and grid collapse |
| `breakpoint.mobile` | 540px | Narrow gutters and nav alignment |

## Components To Build In Figma

### Header / Site Navigation

States:
- Default: off-white background, bottom border, brand left, links right.
- Mobile: stacked brand and nav links, left aligned.
- Nav link default: muted green, no underline.
- Nav link hover/active: primary text.

### Brand Lockup

Elements:
- Rasa logo mark at 34px height.
- Text label "Rasa Ecology" in Inter bold, primary text.

### Post Card

Variants:
- `Image=false`: text-only card.
- `Image=true`: 16:10 image header with object-cover.

States:
- Default: white surface, 1px border, 8px radius.
- Link hover: accent title/link color with underline behavior inherited from anchor.

Anatomy:
- Optional image.
- Meta row: date and author.
- Title.
- Excerpt.
- Tag chip list.

### Tag Chip

States:
- Default: off-white fill, border, accent-strong text.
- Hover: subtle band fill, accent-strong text.
- Focus: visible accent outline.

### Article Header

Anatomy:
- H1 editorial title.
- Meta row with author link and date.
- Optional article description.
- Optional 16:9 hero image.

### Article Body

Elements:
- Paragraphs.
- H2 and H3 headings.
- Bulleted lists.
- Inline image with 8px radius.
- Blockquote with 4px accent border.
- Links using accent color and underline offset.

### Floating TOC Button

States:
- Default: circular 52px accent fill, white icon, soft green shadow.
- Hover: translate up 2px and stronger shadow.
- Active: returns to baseline.
- Focus: visible outline.

### TOC Modal

States:
- Closed: hidden, opacity 0.
- Open: visible, bottom-left placement, blurred dark green overlay.

Anatomy:
- Backdrop.
- White panel, 16px radius, 24px/20px/28px padding.
- Close icon button.
- Overline title: "On this page".
- TOC list items with active/hover band fill.
- Nested H3 rows use 22px left padding and muted text.

### Footer

Anatomy:
- Top border.
- Muted descriptive text.
- 28px vertical padding.

## Recreated Screens To Build

1. `Home / Desktop`
   - Header, two-column hero, latest writing section, two post cards, footer.
2. `Article / Living Soil`
   - Header, article title/meta, body sections, floating TOC button, footer.
3. `Article / Notion Post`
   - Header, title/meta, 16:9 hero image, long body with lists and inline image treatment, floating TOC.
4. `Tags / Desktop`
   - Header, section heading, tag chip list, footer.
5. `Components / Library`
   - Header, post-card variants, tag chip states, TOC button states, TOC modal open state, footer.
6. `Foundations / Style Guide`
   - Color swatches, typography specimens, spacing scale, radius scale, shadows.

## Source Notes

- No primary CTA button appears on the current site. The button system should therefore be limited to observed icon buttons and link/chip components unless a future product surface adds CTAs.
- The site uses CSS custom properties directly, making these token names a faithful basis for Figma variables.
- The blog currently has two homepage post cards and three tags: beginner, regenerative growing, soil ecology.
