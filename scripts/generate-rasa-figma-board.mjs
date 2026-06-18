import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const out = path.join(root, "rasa-figma-board.svg");

const colors = {
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
};

const img = (relative) => {
  const file = path.join(root, "public", relative);
  const ext = path.extname(file).slice(1).toLowerCase().replace("jpg", "jpeg");
  const data = fs.readFileSync(file).toString("base64");
  return `data:image/${ext};base64,${data}`;
};

const logo = img("logo/rasa-logo-mark-header-128.png");
const hero = img("notion-assets/first-test-blog-hero.png");

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function wrap(text, maxChars) {
  const words = text.split(/\s+/);
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
const text = (x, y, value, opts = {}) => {
  const {
    size = 16,
    fill = colors.text,
    family = "Inter, Arial, sans-serif",
    weight = 400,
    line = Math.round(size * 1.4),
    max = 0,
    anchor = "start",
    transform = "",
    letter = 0,
  } = opts;
  const lines = max ? wrap(value, max) : String(value).split("\n");
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${family}"`,
    `font-size="${size}"`,
    `font-weight="${weight}"`,
    `fill="${fill}"`,
    `text-anchor="${anchor}"`,
    `letter-spacing="${letter}"`,
    transform ? `transform="${transform}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  add(`<text ${attrs}>${lines.map((lineText, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : line}">${esc(lineText)}</tspan>`).join("")}</text>`);
  return lines.length * line;
};

const rect = (x, y, w, h, opts = {}) => {
  const { fill = "none", stroke = "none", sw = 1, r = 0, opacity = 1, filter = "" } = opts;
  add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}" ${filter ? `filter="${filter}"` : ""}/>`);
};

const line = (x1, y1, x2, y2, stroke = colors.border, sw = 1) =>
  add(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`);

const image = (x, y, w, h, href, opts = {}) => {
  const clip = opts.clip ? `clip-path="url(#${opts.clip})"` : "";
  add(`<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" href="${href}" ${clip}/>`);
};

const chip = (x, y, label, state = "default") => {
  const w = Math.max(72, label.length * 7.2 + 22);
  rect(x, y, w, 29, { fill: state === "hover" ? colors.band : colors.bg, stroke: state === "focus" ? colors.accent : colors.border, sw: state === "focus" ? 2 : 1, r: 999 });
  text(x + w / 2, y + 19, label, { size: 13, fill: colors.accentStrong, anchor: "middle" });
  return w;
};

function header(x, y, w) {
  rect(x, y, w, 72, { fill: colors.bg, stroke: colors.border });
  image(x + 56, y + 16, 26, 36, logo);
  text(x + 92, y + 44, "Rasa Ecology", { size: 16, weight: 760 });
  text(x + w - 148, y + 44, "Tags", { size: 15, weight: 700, fill: colors.muted });
  text(x + w - 84, y + 44, "RSS", { size: 15, weight: 700, fill: colors.muted });
}

function footer(x, y, w) {
  line(x + 56, y, x + w - 56, y);
  text(x + 56, y + 44, "Rasa Ecology Blog. Practical writing for living soil and ecological growing.", { size: 15, fill: colors.muted });
}

function postCard(x, y, w, withImage = false) {
  const h = withImage ? 390 : 250;
  rect(x, y, w, h, { fill: colors.surface, stroke: colors.border, r: 8 });
  let top = y + 22;
  if (withImage) {
    add(`<clipPath id="cardHero${x}${y}"><rect x="${x}" y="${y}" width="${w}" height="${Math.round(w * 0.625)}" rx="8"/></clipPath>`);
    image(x, y, w, Math.round(w * 0.625), hero, { clip: `cardHero${x}${y}` });
    top = y + Math.round(w * 0.625) + 22;
  }
  text(x + 22, top + 2, withImage ? "May 29, 2026     Deekshith" : "May 30, 2026     Edwin", { size: 14, fill: colors.muted });
  text(x + 22, top + 46, withImage ? "Test Blog from Notion" : "What Living Soil Means for Regenerative Growing", {
    size: 23,
    family: "Georgia, Times New Roman, serif",
    weight: 500,
    line: 27,
    max: withImage ? 24 : 25,
  });
  const descY = withImage ? top + 102 : top + 112;
  text(x + 22, descY, withImage ? "temp description" : "A practical introduction to living soil, soil organisms, and why soil ecology matters for resilient gardens and farms.", {
    size: 16,
    fill: colors.muted,
    line: 25,
    max: 33,
  });
  const cy = y + h - 50;
  if (withImage) {
    chip(x + 22, cy, "beginner");
  } else {
    const a = chip(x + 22, cy, "soil ecology");
    chip(x + 32 + a, cy, "regenerative growing");
  }
}

function frameLabel(x, y, label) {
  text(x, y - 18, label, { size: 18, weight: 700, fill: colors.text });
}

function homeFrame(x, y) {
  const w = 1440, h = 1150;
  frameLabel(x, y, "Website clone / Home desktop");
  rect(x, y, w, h, { fill: colors.bg });
  header(x, y, w);
  text(x + 56, y + 230, "Practical ecology\nfor living soil.", { size: 92, family: "Georgia, Times New Roman, serif", weight: 500, line: 88 });
  text(x + 850, y + 320, "Field notes and clear guides on compost, soil biology, biodiversity, and regenerative growing for people building healthier landscapes.", {
    size: 17,
    fill: colors.muted,
    line: 28,
    max: 47,
  });
  text(x + 56, y + 535, "Latest writing", { size: 50, family: "Georgia, Times New Roman, serif", weight: 500 });
  postCard(x + 56, y + 585, 355, false);
  postCard(x + 435, y + 585, 355, true);
  footer(x, y + 1060, w);
}

function articleFrame(x, y, mode = "short") {
  const w = 980, h = mode === "short" ? 1340 : 1600;
  frameLabel(x, y, mode === "short" ? "Website clone / Article page" : "Website clone / Notion article with image");
  rect(x, y, w, h, { fill: colors.bg });
  header(x, y, w);
  const ax = x + 120;
  const title = mode === "short" ? "What Living Soil Means for Regenerative Growing" : "Test Blog from Notion";
  text(ax, y + 180, title, { size: mode === "short" ? 72 : 78, family: "Georgia, Times New Roman, serif", weight: 500, line: 74, max: 24 });
  text(ax, y + (mode === "short" ? 345 : 270), mode === "short" ? "by Edwin  |  May 30, 2026" : "by Deekshith  |  May 29, 2026", { size: 14, fill: colors.muted });
  let bodyY = y + (mode === "short" ? 430 : 650);
  if (mode !== "short") {
    add(`<clipPath id="articleHero${x}${y}"><rect x="${ax}" y="${y + 330}" width="760" height="428" rx="8"/></clipPath>`);
    image(ax, y + 330, 760, 428, hero, { clip: `articleHero${x}${y}` });
    bodyY = y + 850;
  }
  const paras =
    mode === "short"
      ? [
          ["p", "Living soil is not just dirt with nutrients added to it. It is a working ecosystem where minerals, organic matter, water, air, roots, fungi, bacteria, and small soil animals interact."],
          ["p", "For a gardener or farmer, the practical value is simple: living soil tends to hold water better, cycle nutrients more steadily, and support plants through stress."],
          ["h2", "Soil Is a Habitat"],
          ["p", "Every handful of healthy soil contains pores, roots, residues, and organisms. Those spaces decide whether water drains or stays available, whether roots can breathe, and whether microbes can break down organic material."],
          ["h2", "Organic Matter Feeds the System"],
          ["p", "Compost, leaf litter, crop residues, and root exudates all feed soil life. As organisms digest that material, they help build stable soil structure and release nutrients in plant-available forms."],
          ["h2", "The Practical Takeaway"],
          ["p", "Treat soil as a living system before treating it as a container for fertilizer. Add organic matter, avoid unnecessary disturbance, keep roots in the ground where possible, and protect the surface with mulch or plant cover."],
        ]
      : [
          ["h2", "Why We Started Rasa Ecology"],
          ["p", "We started Rasa Ecology because both of us have always been deeply interested in technology, systems, and the way small changes can create large outcomes."],
          ["h2", "What Should Technology Actually Help Us Restore?"],
          ["p", "Technology is powerful. It can make things faster, cheaper, more connected, and more efficient. But efficiency alone is not enough."],
          ["list", "Healthier soil|Better use of organic waste|More resilient farms and gardens|Practical ecological education|Tools that make sustainable choices easier"],
          ["h2", "Our View of Technology"],
          ["p", "We believe technology should make ecological work easier to understand, easier to adopt, and easier to improve."],
          ["h2", "Why Soil Is Our Starting Point"],
          ["p", "Healthy soil is not just a container for roots. It is full of relationships: minerals, organic matter, bacteria, fungi, roots, insects, air pockets, water channels, and nutrients moving through biological processes."],
        ];
  for (const [kind, value] of paras) {
    if (kind === "h2") {
      bodyY += 40;
      text(ax, bodyY, value, { size: 25, weight: 700 });
      bodyY += 36;
    } else if (kind === "list") {
      for (const item of value.split("|")) {
        text(ax + 22, bodyY, `• ${item}`, { size: 19, family: "Georgia, Times New Roman, serif", line: 31, max: 62 });
        bodyY += 34;
      }
      bodyY += 12;
    } else {
      const used = text(ax, bodyY, value, { size: 19, family: "Georgia, Times New Roman, serif", line: 33, max: 74 });
      bodyY += used + 20;
    }
  }
  rect(x + 34, y + h - 118, 52, 52, { fill: colors.accent, r: 999, filter: "url(#tocButtonShadow)" });
  line(x + 49, y + h - 101, x + 71, y + h - 101, "#FFFFFF", 2);
  line(x + 49, y + h - 92, x + 71, y + h - 92, "#FFFFFF", 2);
  line(x + 49, y + h - 83, x + 71, y + h - 83, "#FFFFFF", 2);
  footer(x, y + h - 80, w);
}

function tagsFrame(x, y) {
  const w = 980, h = 620;
  frameLabel(x, y, "Website clone / Tags");
  rect(x, y, w, h, { fill: colors.bg });
  header(x, y, w);
  text(x + 56, y + 190, "Tags", { size: 50, family: "Georgia, Times New Roman, serif", weight: 500 });
  let cx = x + 56;
  for (const tag of ["beginner", "regenerative growing", "soil ecology"]) {
    const width = chip(cx, y + 240, tag);
    cx += width + 8;
  }
  footer(x, y + 530, w);
}

function foundations(x, y) {
  const w = 1560, h = 1640;
  frameLabel(x, y, "Design system / Foundations");
  rect(x, y, w, h, { fill: colors.surface, stroke: colors.border, r: 8 });
  text(x + 56, y + 90, "Rasa Ecology Blog Design System", { size: 56, family: "Georgia, Times New Roman, serif", weight: 500 });
  text(x + 56, y + 132, "Extracted from blog.rasaecology.com: color, type, spacing, radii, shadows, and reusable editorial components.", { size: 17, fill: colors.muted });
  text(x + 56, y + 210, "Color tokens", { size: 32, family: "Georgia, Times New Roman, serif", weight: 500 });
  const colorRows = [
    ["bg", colors.bg, "Page background"],
    ["surface", colors.surface, "Cards and modal panels"],
    ["text", colors.text, "Primary editorial text"],
    ["muted", colors.muted, "Metadata and secondary copy"],
    ["border", colors.border, "Dividers and card strokes"],
    ["accent", colors.accent, "Links and floating TOC"],
    ["accent.strong", colors.accentStrong, "Tags and active text"],
    ["band", colors.band, "Hover fills and image placeholders"],
  ];
  colorRows.forEach(([name, hex, usage], i) => {
    const cx = x + 56 + (i % 4) * 350;
    const cy = y + 245 + Math.floor(i / 4) * 135;
    rect(cx, cy, 84, 84, { fill: hex, stroke: colors.border, r: 8 });
    text(cx + 104, cy + 30, `color.${name}`, { size: 16, weight: 700 });
    text(cx + 104, cy + 54, hex, { size: 14, fill: colors.muted });
    text(cx + 104, cy + 78, usage, { size: 13, fill: colors.muted, max: 25 });
  });
  text(x + 56, y + 560, "Typography", { size: 32, family: "Georgia, Times New Roman, serif", weight: 500 });
  const typeRows = [
    ["display.hero", "Georgia 96 / 92, 500", "Practical ecology for living soil.", 60, "Georgia, Times New Roman, serif"],
    ["display.article", "Georgia 72 / 72, 500", "What Living Soil Means", 46, "Georgia, Times New Roman, serif"],
    ["heading.section", "Georgia 48 / 50, 500", "Latest writing", 38, "Georgia, Times New Roman, serif"],
    ["heading.article.h2", "Inter 25 / 30, 700", "Organic Matter Feeds the System", 25, "Inter, Arial, sans-serif"],
    ["body.article", "Georgia 19 / 33, 400", "Article prose uses a calm serif rhythm for long-form reading.", 19, "Georgia, Times New Roman, serif"],
    ["meta", "Inter 14 / 22, 400", "May 30, 2026     Edwin", 14, "Inter, Arial, sans-serif"],
  ];
  typeRows.forEach(([name, spec, sample, size, family], i) => {
    const ty = y + 610 + i * 105;
    text(x + 56, ty, name, { size: 14, weight: 700, fill: colors.accentStrong });
    text(x + 56, ty + 24, spec, { size: 13, fill: colors.muted });
    text(x + 360, ty + 30, sample, { size, family, weight: family.startsWith("Georgia") ? 500 : i === 3 ? 700 : 400, fill: colors.text, max: 38, line: Math.round(size * 1.15) });
    line(x + 56, ty + 76, x + 1480, ty + 76);
  });
  text(x + 56, y + 1290, "Spacing and radius", { size: 32, family: "Georgia, Times New Roman, serif", weight: 500 });
  [4, 8, 10, 14, 18, 20, 22, 24, 28, 32, 36, 48, 56, 64, 80].forEach((s, i) => {
    const sx = x + 56 + i * 94;
    rect(sx, y + 1340, s, 40, { fill: colors.accent, r: 2 });
    text(sx, y + 1408, `${s}px`, { size: 12, fill: colors.muted });
  });
  [[8, "card/image"], [16, "modal"], [999, "pill/circle"]].forEach(([r, label], i) => {
    const rx = x + 56 + i * 210;
    rect(rx, y + 1480, 120, 72, { fill: colors.band, stroke: colors.border, r: Math.min(r, 36) });
    text(rx, y + 1580, `radius.${i === 0 ? "sm" : i === 1 ? "md" : "full"} ${r}px`, { size: 14, weight: 700 });
    text(rx, y + 1602, label, { size: 13, fill: colors.muted });
  });
}

function components(x, y) {
  const w = 1560, h = 1640;
  frameLabel(x, y, "Design system / Components and states");
  rect(x, y, w, h, { fill: colors.surface, stroke: colors.border, r: 8 });
  text(x + 56, y + 90, "Components", { size: 52, family: "Georgia, Times New Roman, serif", weight: 500 });
  text(x + 56, y + 132, "Reusable pieces observed on the live blog. CTA buttons are intentionally not invented because none exist on the current site.", { size: 17, fill: colors.muted });
  text(x + 56, y + 220, "Header / desktop", { size: 24, weight: 700 });
  header(x + 56, y + 245, 840);
  text(x + 56, y + 390, "Post card variants", { size: 24, weight: 700 });
  postCard(x + 56, y + 420, 355, false);
  postCard(x + 435, y + 420, 355, true);
  text(x + 900, y + 390, "Tag chip states", { size: 24, weight: 700 });
  chip(x + 900, y + 425, "soil ecology", "default");
  chip(x + 900, y + 480, "soil ecology", "hover");
  chip(x + 900, y + 535, "soil ecology", "focus");
  text(x + 1070, y + 444, "Default", { size: 14, fill: colors.muted });
  text(x + 1070, y + 499, "Hover", { size: 14, fill: colors.muted });
  text(x + 1070, y + 554, "Focus", { size: 14, fill: colors.muted });
  text(x + 900, y + 650, "Floating TOC icon button", { size: 24, weight: 700 });
  [["Default", 0, 0], ["Hover", 120, -2], ["Active", 240, 0]].forEach(([label, dx, dy]) => {
    rect(x + 900 + dx, y + 690 + dy, 52, 52, { fill: colors.accent, r: 999, filter: "url(#tocButtonShadow)" });
    line(x + 915 + dx, y + 707 + dy, x + 937 + dx, y + 707 + dy, "#fff", 2);
    line(x + 915 + dx, y + 716 + dy, x + 937 + dx, y + 716 + dy, "#fff", 2);
    line(x + 915 + dx, y + 725 + dy, x + 937 + dx, y + 725 + dy, "#fff", 2);
    text(x + 900 + dx, y + 775, label, { size: 14, fill: colors.muted });
  });
  text(x + 56, y + 860, "Article body components", { size: 24, weight: 700 });
  text(x + 56, y + 908, "Article H2 heading", { size: 25, weight: 700 });
  text(x + 56, y + 960, "Article prose uses Georgia at 19px with generous 1.75 line-height for relaxed long-form reading. Links use the green accent with underline offset.", { size: 19, family: "Georgia, Times New Roman, serif", line: 33, max: 70 });
  rect(x + 56, y + 1065, 4, 96, { fill: colors.accent });
  text(x + 78, y + 1100, "Blockquote treatment uses a 4px accent rule and accent-strong text.", { size: 19, family: "Georgia, Times New Roman, serif", fill: colors.accentStrong, line: 33, max: 55 });
  text(x + 900, y + 860, "TOC modal / open", { size: 24, weight: 700 });
  rect(x + 900, y + 895, 360, 420, { fill: colors.overlay, r: 8, opacity: 0.85 });
  rect(x + 920, y + 975, 320, 260, { fill: colors.surface, r: 16, filter: "url(#panelShadow)" });
  text(x + 944, y + 1020, "ON THIS PAGE", { size: 12, weight: 700, fill: colors.accentStrong, letter: 1.2 });
  ["Soil Is a Habitat", "Organic Matter Feeds the System", "The Practical Takeaway"].forEach((item, i) => {
    if (i === 1) rect(x + 936, y + 1042 + i * 42, 268, 32, { fill: colors.band, r: 8 });
    text(x + 946, y + 1063 + i * 42, item, { size: 15, fill: i === 1 ? colors.accentStrong : colors.text });
  });
  rect(x + 1192, y + 987, 32, 32, { fill: colors.band, r: 999 });
  line(x + 1202, y + 997, x + 1214, y + 1009, colors.muted, 2);
  line(x + 1214, y + 997, x + 1202, y + 1009, colors.muted, 2);
  text(x + 56, y + 1285, "Footer", { size: 24, weight: 700 });
  footer(x + 56, y + 1320, 840);
}

add(`<svg xmlns="http://www.w3.org/2000/svg" width="6940" height="3560" viewBox="0 0 6940 3560">`);
add(`<defs>
  <filter id="tocButtonShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#173126" flood-opacity=".28"/></filter>
  <filter id="panelShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#0D1C15" flood-opacity=".40"/></filter>
</defs>`);
rect(0, 0, 6940, 3560, { fill: colors.canvas });
text(80, 90, "Rasa Ecology Blog", { size: 48, family: "Georgia, Times New Roman, serif", weight: 500 });
text(80, 126, "Website recreation and extracted design system from blog.rasaecology.com", { size: 17, fill: colors.muted });
homeFrame(80, 200);
articleFrame(1580, 200, "short");
articleFrame(2620, 200, "long");
tagsFrame(1580, 1600);
foundations(3660, 200);
components(5300, 200);
add(`</svg>`);

fs.writeFileSync(out, parts.join("\n"));
console.log(out);
