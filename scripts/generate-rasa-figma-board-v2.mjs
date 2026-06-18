import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const out = path.join(root, "rasa-figma-board-v2.svg");

const C = {
  bg: "#FBFBF7",
  surface: "#FFFFFF",
  text: "#173126",
  muted: "#617166",
  border: "#DCE3D8",
  accent: "#276749",
  accentStrong: "#1F5139",
  band: "#EDF4E9",
  canvas: "#E5E5E5",
  overlay: "#0D1C1573",
  warning: "#B45309",
};

const css = fs.readFileSync(path.join(root, "src/styles/global.css"), "utf8");

function readImage(relative) {
  const file = path.join(root, "public", relative);
  const ext = path.extname(file).slice(1).toLowerCase().replace("jpg", "jpeg");
  return `data:image/${ext};base64,${fs.readFileSync(file).toString("base64")}`;
}

const assets = {
  logo: readImage("logo/rasa-logo-mark-header-128.png"),
  hero: readImage("notion-assets/first-test-blog-hero.png"),
  inline: readImage("notion-assets/first-test-blog-image-2.png"),
  og: readImage("og-image.png"),
};

function parseMd(file) {
  const raw = fs.readFileSync(path.join(root, "src/content/blog", file), "utf8");
  const [, fmRaw, bodyRaw] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const data = {};
  for (const line of fmRaw.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("[")) value = [...value.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    data[m[1]] = value;
  }
  const blocks = [];
  const lines = bodyRaw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (l.startsWith("## ")) {
      blocks.push({ type: "h2", text: l.slice(3) });
    } else if (l.startsWith("### ")) {
      blocks.push({ type: "h3", text: l.slice(4) });
    } else if (l.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
        while (i < lines.length && !lines[i].trim()) i++;
      }
      i--;
      blocks.push({ type: "ul", items });
    } else if (l.startsWith("![")) {
      const src = l.match(/\(([^)]+)\)/)?.[1] ?? "";
      blocks.push({ type: "image", src });
    } else {
      let para = l;
      while (i + 1 < lines.length && lines[i + 1].trim() && !/^(## |### |- |!\[)/.test(lines[i + 1].trim())) {
        para += ` ${lines[++i].trim()}`;
      }
      blocks.push({ type: "p", text: para });
    }
  }
  return { data, blocks };
}

const posts = {
  living: parseMd("living-soil-basics.md"),
  notion: parseMd("first-test-blog.md"),
};

const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function wrap(value, maxChars) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const parts = [];
const add = (s) => parts.push(s);
const rect = (x, y, w, h, { fill = "none", stroke = "none", sw = 1, r = 0, opacity = 1, filter = "" } = {}) => {
  add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"${filter ? ` filter="${filter}"` : ""}/>`);
};
const line = (x1, y1, x2, y2, stroke = C.border, sw = 1) => add(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`);
const image = (x, y, w, h, href, clipId = "") => add(`<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" href="${href}"${clipId ? ` clip-path="url(#${clipId})"` : ""}/>`);

function text(x, y, value, o = {}) {
  const {
    size = 16,
    fill = C.text,
    family = "Inter, Arial, sans-serif",
    weight = 400,
    lineHeight = Math.round(size * 1.45),
    max = 0,
    anchor = "start",
    letter = 0,
  } = o;
  const lines = max ? wrap(value, max) : String(value).split("\n");
  add(`<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${letter}">${lines
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${esc(l)}</tspan>`)
    .join("")}</text>`);
  return lines.length * lineHeight;
}

function label(x, y, value) {
  text(x, y - 22, value, { size: 18, weight: 800, fill: C.accentStrong });
}

function header(x, y, w, mobile = false) {
  const h = mobile ? 122 : 72;
  rect(x, y, w, h, { fill: C.bg, stroke: C.border });
  image(x + 56, y + 16, 26, 36, assets.logo);
  text(x + 92, y + 44, "Rasa Ecology", { size: 16, weight: 760 });
  if (mobile) {
    text(x + 56, y + 92, "Tags", { size: 15, weight: 700, fill: C.muted });
    text(x + 122, y + 92, "RSS", { size: 15, weight: 700, fill: C.muted });
  } else {
    text(x + w - 148, y + 44, "Tags", { size: 15, weight: 700, fill: C.muted });
    text(x + w - 84, y + 44, "RSS", { size: 15, weight: 700, fill: C.muted });
  }
}

function footer(x, y, w) {
  line(x + 56, y, x + w - 56, y);
  text(x + 56, y + 44, "Rasa Ecology Blog. Practical writing for living soil and ecological growing.", { size: 15, fill: C.muted });
}

function chip(x, y, value, state = "default") {
  const w = Math.max(72, value.length * 7.2 + 22);
  rect(x, y, w, 29, {
    fill: state === "hover" || state === "active" ? C.band : C.bg,
    stroke: state === "focus" ? C.accent : C.border,
    sw: state === "focus" ? 2 : 1,
    r: 999,
  });
  text(x + w / 2, y + 19, value, { size: 13, fill: C.accentStrong, anchor: "middle" });
  return w;
}

function postCard(x, y, w, post, withImage = false, state = "default") {
  const imageH = Math.round(w * 0.625);
  const h = withImage ? imageH + 205 : 270;
  rect(x, y, w, h, { fill: C.surface, stroke: state === "focus" ? C.accent : C.border, sw: state === "focus" ? 2 : 1, r: 8 });
  let top = y + 22;
  if (withImage) {
    const clip = `clip-${x}-${y}`.replaceAll(".", "");
    add(`<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${imageH}" rx="8"/></clipPath>`);
    image(x, y, w, imageH, assets.hero, clip);
    top = y + imageH + 22;
  }
  text(x + 22, top, `${post.data.publishedAt === "2026-05-30" ? "May 30, 2026" : "May 29, 2026"}     ${post.data.author}`, { size: 14, fill: C.muted });
  text(x + 22, top + 45, post.data.title, { size: 23, family: "Georgia, Times New Roman, serif", weight: 500, lineHeight: 27, max: 24, fill: state === "hover" ? C.accent : C.text });
  text(x + 22, top + (post.data.title.length > 28 ? 102 : 75), post.data.description, { size: 16, fill: C.muted, lineHeight: 25, max: 34 });
  let cx = x + 22;
  const cy = y + h - 50;
  for (const tag of post.data.tags) {
    const tw = chip(cx, cy, tag);
    cx += tw + 8;
  }
  return h;
}

function tocButton(x, y, state = "default") {
  const yy = y + (state === "hover" ? -2 : 0);
  rect(x, yy, 52, 52, { fill: C.accent, r: 999, filter: state === "hover" ? "url(#tocButtonShadowStrong)" : "url(#tocButtonShadow)" });
  line(x + 15, yy + 17, x + 37, yy + 17, "#fff", 2);
  line(x + 15, yy + 26, x + 37, yy + 26, "#fff", 2);
  line(x + 15, yy + 35, x + 37, yy + 35, "#fff", 2);
}

function tocModal(x, y, headings) {
  rect(x, y, 420, 520, { fill: C.overlay, r: 8, opacity: 0.92 });
  rect(x + 16, y + 178, 320, 300, { fill: C.surface, r: 16, filter: "url(#panelShadow)" });
  rect(x + 284, y + 188, 32, 32, { fill: C.band, r: 999 });
  line(x + 294, y + 198, x + 306, y + 210, C.muted, 2);
  line(x + 306, y + 198, x + 294, y + 210, C.muted, 2);
  text(x + 40, y + 224, "ON THIS PAGE", { size: 12, weight: 700, fill: C.accentStrong, letter: 1.2 });
  let ty = y + 258;
  headings.slice(0, 9).forEach((h, i) => {
    if (i === 1) rect(x + 32, ty - 20, 284, 32, { fill: C.band, r: 8 });
    text(x + 42, ty, h, { size: 14, fill: i === 1 ? C.accentStrong : C.text, max: 32, lineHeight: 18 });
    ty += h.length > 34 ? 44 : 34;
  });
}

function articleBody(x, y, w, blocks, maxBlocks = Infinity) {
  let cy = y;
  for (const block of blocks.slice(0, maxBlocks)) {
    if (block.type === "h2") {
      cy += 42;
      text(x, cy, block.text, { size: 25, weight: 700, lineHeight: 30, max: Math.floor(w / 12) });
      cy += 28;
    } else if (block.type === "h3") {
      cy += 34;
      text(x, cy, block.text, { size: 20, weight: 700, lineHeight: 25, max: Math.floor(w / 11) });
      cy += 24;
    } else if (block.type === "p") {
      const used = text(x, cy, block.text, { size: 19, family: "Georgia, Times New Roman, serif", lineHeight: 33, max: Math.floor(w / 9.8) });
      cy += used + 16;
    } else if (block.type === "ul") {
      for (const item of block.items) {
        const used = text(x + 24, cy, `• ${item}`, { size: 19, family: "Georgia, Times New Roman, serif", lineHeight: 33, max: Math.floor((w - 24) / 9.8) });
        cy += used + 8;
      }
      cy += 10;
    } else if (block.type === "image") {
      const clip = `inline-${x}-${cy}`.replaceAll(".", "");
      add(`<clipPath id="${clip}"><rect x="${x}" y="${cy}" width="${w}" height="${Math.round(w * 0.56)}" rx="8"/></clipPath>`);
      image(x, cy, w, Math.round(w * 0.56), block.src.endsWith(".gif") ? assets.hero : assets.inline, clip);
      cy += Math.round(w * 0.56) + 24;
    }
  }
  return cy - y;
}

function measureArticleBody(w, blocks, maxBlocks = Infinity) {
  let h = 0;
  for (const block of blocks.slice(0, maxBlocks)) {
    if (block.type === "h2") {
      h += 42 + 28 + 30;
    } else if (block.type === "h3") {
      h += 34 + 24 + 25;
    } else if (block.type === "p") {
      h += wrap(block.text, Math.floor(w / 9.8)).length * 33 + 16;
    } else if (block.type === "ul") {
      for (const item of block.items) {
        h += wrap(`• ${item}`, Math.floor((w - 24) / 9.8)).length * 33 + 8;
      }
      h += 10;
    } else if (block.type === "image") {
      h += Math.round(w * 0.56) + 24;
    }
  }
  return h;
}

function homeDesktop(x, y) {
  const w = 1440, h = 1180;
  label(x, y, "CLONE / Home desktop 1440");
  rect(x, y, w, h, { fill: C.bg });
  header(x, y, w);
  text(x + 56, y + 230, "Practical ecology\nfor living soil.", { size: 96, family: "Georgia, Times New Roman, serif", weight: 500, lineHeight: 92 });
  text(x + 850, y + 320, "Field notes and clear guides on compost, soil biology, biodiversity, and regenerative growing for people building healthier landscapes.", { size: 17, fill: C.muted, lineHeight: 28, max: 47 });
  text(x + 56, y + 535, "Latest writing", { size: 51, family: "Georgia, Times New Roman, serif", weight: 500 });
  postCard(x + 56, y + 585, 355, posts.living, false);
  postCard(x + 435, y + 585, 355, posts.notion, true);
  rect(x + 814, y + 585, 355, 270, { fill: C.bg, stroke: C.border, r: 8, opacity: 0.45 });
  text(x + 836, y + 705, "Empty grid slot", { size: 18, fill: C.muted });
  text(x + 836, y + 735, "The CSS grid supports 3 columns even though only two posts exist today.", { size: 14, fill: C.muted, lineHeight: 21, max: 36 });
  footer(x, y + 1080, w);
}

function homeMobile(x, y) {
  const w = 390, h = 1320;
  label(x, y, "CLONE / Home mobile 390");
  rect(x, y, w, h, { fill: C.bg });
  header(x, y, w, true);
  text(x + 14, y + 220, "Practical ecology\nfor living soil.", { size: 48, family: "Georgia, Times New Roman, serif", weight: 500, lineHeight: 46 });
  text(x + 14, y + 335, "Field notes and clear guides on compost, soil biology, biodiversity, and regenerative growing for people building healthier landscapes.", { size: 17, fill: C.muted, lineHeight: 27, max: 33 });
  text(x + 14, y + 505, "Latest writing", { size: 34, family: "Georgia, Times New Roman, serif", weight: 500 });
  postCard(x + 14, y + 545, 362, posts.living, false);
  postCard(x + 14, y + 850, 362, posts.notion, true);
  line(x + 14, y + 1262, x + 376, y + 1262);
  text(x + 14, y + 1294, "Rasa Ecology Blog. Practical writing for living soil and ecological growing.", { size: 14, fill: C.muted, max: 43 });
}

function articleDesktop(x, y, post, slug, withHero = false, full = true) {
  const w = 980;
  const bodyMaxBlocks = full ? Infinity : 8;
  const bodyHeight = measureArticleBody(760, post.blocks, bodyMaxBlocks);
  const h = Math.max(withHero ? 2300 : 1450, 410 + (withHero ? 462 : 0) + bodyHeight + 160);
  label(x, y, `CLONE / Article desktop / ${slug}`);
  rect(x, y, w, h, { fill: C.bg });
  header(x, y, w);
  const ax = x + 120;
  text(ax, y + 180, post.data.title, { size: 72, family: "Georgia, Times New Roman, serif", weight: 500, lineHeight: 72, max: 24 });
  text(ax, y + (post.data.title.length > 32 ? 345 : 270), `by ${post.data.author}  |  ${post.data.publishedAt === "2026-05-30" ? "May 30, 2026" : "May 29, 2026"}`, { size: 14, fill: C.muted });
  let by = y + (post.data.title.length > 32 ? 430 : 330);
  if (withHero) {
    const clip = `hero-${x}-${y}`;
    add(`<clipPath id="${clip}"><rect x="${ax}" y="${by}" width="760" height="428" rx="8"/></clipPath>`);
    image(ax, by, 760, 428, assets.hero, clip);
    by += 520;
  }
  articleBody(ax, by, 760, post.blocks, bodyMaxBlocks);
  const headings = post.blocks.filter((b) => b.type === "h2" || b.type === "h3").map((b) => b.text);
  tocButton(x + 34, y + h - 118);
  if (withHero) tocModal(x + 30, y + h - 690, headings);
  footer(x, y + h - 80, w);
  return h;
}

function listingPage(x, y, title, cards) {
  const w = 980, h = 900;
  label(x, y, `CLONE / ${title}`);
  rect(x, y, w, h, { fill: C.bg });
  header(x, y, w);
  text(x + 56, y + 190, title, { size: 50, family: "Georgia, Times New Roman, serif", weight: 500 });
  let cy = y + 260;
  for (const card of cards) {
    line(x + 56, cy + 130, x + 876, cy + 130);
    text(x + 56, cy, card.title, { size: 30, family: "Georgia, Times New Roman, serif", weight: 500, max: 42 });
    text(x + 56, cy + 46, card.date, { size: 14, fill: C.muted });
    text(x + 56, cy + 78, card.description, { size: 16, fill: C.muted, max: 82 });
    cy += 165;
  }
  footer(x, y + h - 80, w);
}

function tagsPage(x, y) {
  const w = 980, h = 640;
  label(x, y, "CLONE / Tags index");
  rect(x, y, w, h, { fill: C.bg });
  header(x, y, w);
  text(x + 56, y + 190, "Tags", { size: 50, family: "Georgia, Times New Roman, serif", weight: 500 });
  let cx = x + 56;
  for (const tag of ["beginner", "regenerative growing", "soil ecology"]) {
    cx += chip(cx, y + 240, tag) + 8;
  }
  footer(x, y + h - 80, w);
}

function foundations(x, y) {
  const w = 1720, h = 2350;
  label(x, y, "DESIGN SYSTEM / Foundations extracted from CSS");
  rect(x, y, w, h, { fill: C.surface, stroke: C.border, r: 8 });
  text(x + 56, y + 88, "Foundations", { size: 56, family: "Georgia, Times New Roman, serif", weight: 500 });
  text(x + 56, y + 130, "Every value below is pulled from src/styles/global.css and live page markup.", { size: 17, fill: C.muted });

  text(x + 56, y + 220, "Color variables", { size: 32, family: "Georgia, Times New Roman, serif", weight: 500 });
  const colors = [
    ["--color-bg", C.bg, "Page canvas and tag chip fill"],
    ["--color-surface", C.surface, "Cards and modal panel"],
    ["--color-text", C.text, "Primary text and brand"],
    ["--color-muted", C.muted, "Metadata, descriptions, secondary nav"],
    ["--color-border", C.border, "Header/footer/card/tag borders"],
    ["--color-accent", C.accent, "Links, TOC FAB, blockquote border"],
    ["--color-accent-strong", C.accentStrong, "Tag text, active TOC text"],
    ["--color-band", C.band, "Placeholder and hover fill"],
  ];
  colors.forEach(([name, hex, usage], i) => {
    const px = x + 56 + (i % 4) * 405;
    const py = y + 260 + Math.floor(i / 4) * 142;
    rect(px, py, 96, 96, { fill: hex, stroke: C.border, r: 8 });
    text(px + 118, py + 30, name, { size: 16, weight: 800 });
    text(px + 118, py + 56, hex.toUpperCase(), { size: 14, fill: C.muted });
    text(px + 118, py + 82, usage, { size: 13, fill: C.muted, max: 32 });
  });

  text(x + 56, y + 590, "Type styles", { size: 32, family: "Georgia, Times New Roman, serif", weight: 500 });
  const types = [
    ["Hero display", "Georgia 104px max / line 0.96 / weight 500", "Practical ecology for living soil.", 68, "Georgia, Times New Roman, serif"],
    ["Article title", "Georgia 80px max / line 1 / weight 500", "What Living Soil Means", 54, "Georgia, Times New Roman, serif"],
    ["Section heading", "Georgia 51px max / line 1.05 / weight 500", "Latest writing", 44, "Georgia, Times New Roman, serif"],
    ["Card heading", "Georgia 23px / line 1.18 / weight 500", "Test Blog from Notion", 23, "Georgia, Times New Roman, serif"],
    ["Article H2", "Inter 24.8px / line 1.2 / bold", "Organic Matter Feeds the System", 25, "Inter, Arial, sans-serif"],
    ["Article body", "Georgia 18.9px / line 1.75", "Living soil is not just dirt with nutrients added to it.", 19, "Georgia, Times New Roman, serif"],
    ["Meta", "Inter 14.4px / muted", "May 30, 2026     Edwin", 14, "Inter, Arial, sans-serif"],
    ["Chip", "Inter 13.4px", "soil ecology", 13, "Inter, Arial, sans-serif"],
  ];
  types.forEach(([name, spec, sample, size, fam], i) => {
    const ty = y + 650 + i * 118;
    text(x + 56, ty, name, { size: 15, weight: 800, fill: C.accentStrong });
    text(x + 56, ty + 25, spec, { size: 13, fill: C.muted, max: 38 });
    text(x + 440, ty + 34, sample, { size, family: fam, weight: fam.startsWith("Georgia") ? 500 : i === 4 ? 700 : 400, max: 42, lineHeight: Math.round(size * 1.15) });
    line(x + 56, ty + 86, x + 1650, ty + 86);
  });

  text(x + 56, y + 1640, "Layout constants", { size: 32, family: "Georgia, Times New Roman, serif", weight: 500 });
  const constants = [
    ["body padding", "32px desktop"],
    ["site container", "min(1120px, 100% - 40px)"],
    ["article container", "760px max"],
    ["header height", "72px desktop / stacked mobile"],
    ["main padding", "64px top / 80px bottom"],
    ["grid", "3 columns, 24px gap"],
    ["card padding", "22px"],
    ["card radius", "8px"],
    ["article hero", "16:9, radius 8px, margin 34px"],
    ["TOC panel", "320px max, radius 16px"],
    ["breakpoint", "820px grid and hero collapse"],
    ["mobile gutter", "14px at <=540px"],
  ];
  constants.forEach(([k, v], i) => {
    const px = x + 56 + (i % 3) * 520;
    const py = y + 1690 + Math.floor(i / 3) * 82;
    rect(px, py, 460, 58, { fill: C.bg, stroke: C.border, r: 8 });
    text(px + 18, py + 24, k, { size: 14, weight: 800 });
    text(px + 178, py + 24, v, { size: 14, fill: C.muted });
  });

  text(x + 56, y + 2050, "CSS source selectors covered", { size: 32, family: "Georgia, Times New Roman, serif", weight: 500 });
  text(x + 56, y + 2090, [".site-header", ".site-nav", ".brand", ".nav-links", ".hero", ".section-heading", ".post-grid", ".post-card", ".meta", ".tag-list", ".article", ".article-header", ".article-hero", ".article-body", ".listing", ".toc-fab", ".toc-modal", ".toc-list"].join("  /  "), { size: 15, fill: C.muted, lineHeight: 26, max: 150 });
}

function components(x, y) {
  const w = 1720, h = 2600;
  label(x, y, "DESIGN SYSTEM / Components, variants, states");
  rect(x, y, w, h, { fill: C.surface, stroke: C.border, r: 8 });
  text(x + 56, y + 88, "Components", { size: 56, family: "Georgia, Times New Roman, serif", weight: 500 });
  text(x + 56, y + 132, "Observed components only. No fabricated CTA button because the current blog does not have one.", { size: 17, fill: C.muted });
  text(x + 56, y + 220, "Header states", { size: 28, weight: 800 });
  header(x + 56, y + 250, 900);
  text(x + 1010, y + 296, "Desktop default: translucent bg, bottom border, brand left, nav right.", { size: 15, fill: C.muted });
  header(x + 56, y + 360, 390, true);
  text(x + 500, y + 430, "Mobile: stacked nav, 18px vertical padding, links left aligned with 28px gap.", { size: 15, fill: C.muted, max: 66 });

  text(x + 56, y + 560, "Post card variants and interaction states", { size: 28, weight: 800 });
  postCard(x + 56, y + 610, 355, posts.living, false);
  text(x + 56, y + 910, "Image=false", { size: 14, fill: C.muted });
  postCard(x + 435, y + 610, 355, posts.notion, true);
  text(x + 435, y + 1035, "Image=true", { size: 14, fill: C.muted });
  postCard(x + 814, y + 610, 355, posts.living, false, "hover");
  text(x + 814, y + 910, "Hover: title/link accent", { size: 14, fill: C.muted });
  postCard(x + 1193, y + 610, 355, posts.living, false, "focus");
  text(x + 1193, y + 910, "Focus: accent outline", { size: 14, fill: C.muted });

  text(x + 56, y + 1120, "Tag chip states", { size: 28, weight: 800 });
  let cx = x + 56;
  for (const state of ["default", "hover", "focus", "active"]) {
    chip(cx, y + 1160, "regenerative growing", state);
    text(cx, y + 1215, state, { size: 13, fill: C.muted });
    cx += 190;
  }

  text(x + 56, y + 1330, "Article primitives", { size: 28, weight: 800 });
  text(x + 56, y + 1384, "Article H2 heading", { size: 25, weight: 700 });
  text(x + 56, y + 1432, "Article prose uses Georgia at 18.9px with line-height 1.75. This sample is editable text imported from SVG, so spacing can be tuned in Figma.", { size: 19, family: "Georgia, Times New Roman, serif", lineHeight: 33, max: 76 });
  text(x + 80, y + 1538, "• List item spacing follows the markdown source, including blank-line rhythm.", { size: 19, family: "Georgia, Times New Roman, serif" });
  rect(x + 56, y + 1580, 4, 92, { fill: C.accent });
  text(x + 78, y + 1616, "Blockquote: 4px accent rule, 1.2em left padding, accent-strong text.", { size: 19, family: "Georgia, Times New Roman, serif", fill: C.accentStrong, max: 55 });

  text(x + 900, y + 1330, "Floating TOC button states", { size: 28, weight: 800 });
  [["default", 0], ["hover", 110], ["active", 220], ["focus", 330]].forEach(([state, dx]) => {
    if (state === "focus") rect(x + 895 + dx, y + 1365, 62, 62, { fill: "none", stroke: C.text, sw: 2, r: 999 });
    tocButton(x + 900 + dx, y + 1370, state);
    text(x + 900 + dx, y + 1455, state, { size: 13, fill: C.muted });
  });
  text(x + 900, y + 1530, "TOC modal open state", { size: 28, weight: 800 });
  tocModal(x + 900, y + 1565, posts.notion.blocks.filter((b) => b.type === "h2").map((b) => b.text));

  text(x + 56, y + 1850, "Content model", { size: 28, weight: 800 });
  const model = [
    ["Post", "title, description, author, status, tags[], publishedAt, updatedAt, heroImage?, targetKeyword"],
    ["Homepage card", "date + author + title + excerpt + tags + optional 16:10 hero"],
    ["Article", "H1 + meta + optional hero + markdown body + generated TOC"],
    ["Listing", "Tag pages and author pages reuse title/date/description rows"],
  ];
  model.forEach(([k, v], i) => {
    rect(x + 56, y + 1890 + i * 76, 1450, 54, { fill: C.bg, stroke: C.border, r: 8 });
    text(x + 76, y + 1924 + i * 76, k, { size: 15, weight: 800 });
    text(x + 230, y + 1924 + i * 76, v, { size: 15, fill: C.muted, max: 120 });
  });

  text(x + 56, y + 2250, "Implementation notes for Figma", { size: 28, weight: 800 });
  text(x + 56, y + 2290, "Convert these imported groups into native components in this order: Header, Brand, Tag Chip, Post Card, Article Header, Article Body styles, TOC Button, TOC Modal, Footer. Bind colors to variables named exactly like the CSS custom properties.", { size: 16, fill: C.muted, lineHeight: 26, max: 150 });
}

function sourceMap(x, y) {
  const w = 1720, h = 860;
  label(x, y, "SOURCE MAP / What was inspected");
  rect(x, y, w, h, { fill: C.surface, stroke: C.border, r: 8 });
  text(x + 56, y + 84, "Coverage map", { size: 52, family: "Georgia, Times New Roman, serif", weight: 500 });
  const rows = [
    ["Homepage", "blog.rasaecology.com/", "Hero, latest writing grid, two post-card variants, tags, footer"],
    ["Article", "/living-soil-basics/", "No hero image, short body, generated 3-item TOC"],
    ["Notion article", "/first-test-blog/", "Hero image, long markdown body, inline image, generated 12-item TOC"],
    ["Tags", "/tags/", "Tag chip list"],
    ["Tag listings", "/tags/beginner/, /tags/soil-ecology/, /tags/regenerative-growing/", "Listing rows with article title/date/description"],
    ["Author listings", "/authors/edwin/, /authors/deekshith/", "Same listing pattern grouped by author"],
    ["CSS", "src/styles/global.css", "All variables, spacing, type, components, breakpoints, TOC states"],
  ];
  rows.forEach(([area, src, detail], i) => {
    const yy = y + 150 + i * 82;
    rect(x + 56, yy, 1560, 58, { fill: i % 2 ? C.bg : "#FFFFFF", stroke: C.border, r: 6 });
    text(x + 76, yy + 24, area, { size: 15, weight: 800 });
    text(x + 285, yy + 24, src, { size: 14, fill: C.accentStrong });
    text(x + 700, yy + 24, detail, { size: 14, fill: C.muted, max: 78 });
  });
  text(x + 56, y + 770, "Important caveat: this is an SVG import because Figma MCP writes are rate-limited. Layers are editable text/vector groups, but not pre-bound native variables/components.", { size: 16, fill: C.warning, max: 145 });
}

add(`<svg xmlns="http://www.w3.org/2000/svg" width="10500" height="10600" viewBox="0 0 10500 10600">`);
add(`<defs>
  <filter id="tocButtonShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#173126" flood-opacity=".28"/></filter>
  <filter id="tocButtonShadowStrong" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="15" flood-color="#173126" flood-opacity=".34"/></filter>
  <filter id="panelShadow" x="-35%" y="-35%" width="180%" height="180%"><feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#0D1C15" flood-opacity=".40"/></filter>
</defs>`);
rect(0, 0, 10500, 10600, { fill: C.canvas });
text(80, 92, "Rasa Ecology Blog", { size: 58, family: "Georgia, Times New Roman, serif", weight: 500 });
text(80, 132, "Fuller website clone and design system extraction from source files and live routes", { size: 18, fill: C.muted });
text(80, 166, `Generated from ${new Date().toISOString().slice(0, 10)} source inspection: ${css.match(/--color-bg:\s*(#[a-f0-9]+)/i)?.[1] ?? "CSS variables loaded"}`, { size: 13, fill: C.muted });

homeDesktop(80, 260);
homeMobile(1580, 260);
articleDesktop(2050, 260, posts.living, "living-soil-basics", false, true);
const longH = articleDesktop(3150, 260, posts.notion, "first-test-blog", true, true);
tagsPage(80, 1600);
listingPage(1150, 1600, "Posts tagged beginner", [{ title: posts.notion.data.title, date: "May 29, 2026", description: posts.notion.data.description }]);
listingPage(2220, 1600, "Posts by Edwin", [{ title: posts.living.data.title, date: "May 30, 2026", description: posts.living.data.description }]);
foundations(80, 2600);
components(1880, 2600);
sourceMap(3680, Math.max(2600, 260 + longH + 120));
add(`</svg>`);

fs.writeFileSync(out, parts.join("\n"));
console.log(out);
