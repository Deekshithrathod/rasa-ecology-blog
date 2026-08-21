import { readFileSync } from 'node:fs';
import path from 'node:path';
import { imageSize } from './image-size.mjs';

const publicDir = path.resolve('public');
const cache = new Map();

const sizeForSrc = (src) => {
  if (cache.has(src)) return cache.get(src);

  let size;

  try {
    size = imageSize(readFileSync(path.join(publicDir, src)));
  } catch {
    size = undefined;
  }

  cache.set(src, size);
  return size;
};

const visit = (node, onImage) => {
  if (node.type === 'element' && node.tagName === 'img') onImage(node);
  for (const child of node.children ?? []) visit(child, onImage);
};

// Body images come from markdown, so they arrive with nothing but src and alt.
// Intrinsic width/height let the browser reserve the box before the file lands,
// which is what keeps inline images out of the page's CLS score.
export const rehypeImageAttrs = () => (tree) => {
  visit(tree, (node) => {
    const properties = node.properties ?? (node.properties = {});
    const src = typeof properties.src === 'string' ? properties.src : undefined;

    properties.loading ??= 'lazy';
    properties.decoding ??= 'async';

    if (!src?.startsWith('/') || properties.width || properties.height) return;

    const size = sizeForSrc(src.split(/[?#]/)[0]);
    if (!size) return;

    properties.width = size.width;
    properties.height = size.height;
  });
};
