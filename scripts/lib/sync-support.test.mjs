import assert from 'node:assert/strict';
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { excerptFromMarkdown, recordSlug, removeStalePosts, slugify } from './sync-support.mjs';

test('slugify produces url-safe slugs', () => {
  assert.equal(slugify('What Living Soil Means'), 'what-living-soil-means');
  assert.equal(slugify("  Don't  Till!  "), 'dont-till');
  assert.equal(slugify('---'), '');
});

test('excerpt skips headings, images and list syntax', () => {
  const markdown = [
    '## A Heading',
    '',
    '![hero](/notion-assets/x.png)',
    '',
    'Living soil is a working ecosystem where minerals and organisms interact.',
    '',
    '- a bullet',
  ].join('\n');

  assert.equal(
    excerptFromMarkdown(markdown),
    'Living soil is a working ecosystem where minerals and organisms interact.',
  );
});

test('excerpt strips inline markdown and truncates on a word boundary', () => {
  const markdown = `A **bold** claim about [living soil](https://example.com) that ${'runs on '.repeat(30)}forever.`;
  const excerpt = excerptFromMarkdown(markdown);

  assert.ok(excerpt.length <= 156, `too long: ${excerpt.length}`);
  assert.ok(excerpt.endsWith('…'));
  assert.ok(!excerpt.includes('**'));
  assert.ok(!excerpt.includes('https://'));
  assert.ok(excerpt.startsWith('A bold claim about living soil'));
});

test('excerpt returns empty string when there is no prose', () => {
  assert.equal(excerptFromMarkdown('## Only a heading'), '');
  assert.equal(excerptFromMarkdown(''), '');
  assert.equal(excerptFromMarkdown(undefined), '');
});

test('recordSlug registers a new page without marking a change', () => {
  const changes = [];
  const history = recordSlug({}, 'page-1', 'living-soil', (...args) => changes.push(args));

  assert.deepEqual(history['page-1'], { current: 'living-soil', previous: [] });
  assert.equal(changes.length, 0);
});

test('recordSlug retires the old slug when it changes', () => {
  const history = { 'page-1': { current: 'old-slug', previous: [] } };
  const changes = [];

  recordSlug(history, 'page-1', 'new-slug', (...args) => changes.push(args));

  assert.deepEqual(history['page-1'], { current: 'new-slug', previous: ['old-slug'] });
  assert.deepEqual(changes, [['old-slug', 'new-slug']]);
});

test('recordSlug drops a reused slug from the retired list', () => {
  const history = { 'page-1': { current: 'b', previous: ['a'] } };

  recordSlug(history, 'page-1', 'a');

  // Moving back to "a" must not leave "a" redirecting to itself.
  assert.deepEqual(history['page-1'], { current: 'a', previous: ['b'] });
});

test('recordSlug is a no-op when the slug is unchanged', () => {
  const history = { 'page-1': { current: 'same', previous: ['old'] } };
  const changes = [];

  recordSlug(history, 'page-1', 'same', (...args) => changes.push(args));

  assert.deepEqual(history['page-1'], { current: 'same', previous: ['old'] });
  assert.equal(changes.length, 0);
});

const seedPosts = async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'blog-sync-'));

  await writeFile(path.join(dir, 'kept.md'), '---\nnotionId: "a"\ntitle: "Kept"\n---\n');
  await writeFile(path.join(dir, 'stale.md'), '---\nnotionId: "b"\ntitle: "Stale"\n---\n');
  await writeFile(path.join(dir, 'hand-written.md'), '---\ntitle: "Hand written"\n---\n');
  await writeFile(path.join(dir, 'notes.txt'), 'not a post');

  return dir;
};

test('removeStalePosts deletes only sync-owned posts that were not rewritten', async () => {
  const dir = await seedPosts();

  const removed = await removeStalePosts(dir, new Set(['kept.md']));

  assert.deepEqual(removed, ['stale.md']);
  assert.deepEqual((await readdir(dir)).sort(), ['hand-written.md', 'kept.md', 'notes.txt']);
});

test('removeStalePosts never touches hand-authored posts, even with nothing written', async () => {
  const dir = await seedPosts();

  const removed = await removeStalePosts(dir, new Set());

  assert.deepEqual(removed.sort(), ['kept.md', 'stale.md']);
  assert.deepEqual((await readdir(dir)).sort(), ['hand-written.md', 'notes.txt']);
});

test('removeStalePosts tolerates a missing directory', async () => {
  assert.deepEqual(await removeStalePosts(path.join(tmpdir(), 'no-such-dir-xyz'), new Set()), []);
});
