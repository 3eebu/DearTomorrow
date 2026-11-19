const assert = require('node:assert/strict');
const { test } = require('node:test');
const { performance } = require('node:perf_hooks');
const load = require('./load-book-model.cjs');
const { activeSeason, findMemories, initialSettings, localDay, newTree, nextAnniversary, putMemory,
  removeChapter, stage, validDay, validateGrove, validateTree } = load('./memory-tree');
const { BRANCH, STRIDE, buildTree, leafColor } = load('./memory-tree-geometry');
const today = '2026-11-19';
const fixture = count => {
  const tree = newTree({ ...initialSettings, name: 'Synthetic orchard', season: 'spring' }, 'test-tree', 881134);
  tree.memories = Array.from({ length: count }, (_, slot) => ({
    id: 'memory-' + slot, slot, title: 'Shared afternoon ' + slot, story: 'By the old orchard',
    date: localDay(new Date(2020 + slot % 6, 4, 1 + slot % 28, 12)),
    time: '', location: 'Station', chapterId: 'branch-' + slot % 6, favorite: slot % 3 === 0,
    milestone: slot % 7 === 0, annual: slot % 4 === 0, tags: ['walk'], photos: [],
  }));
  return { ...tree, nextLeaf: count };
};
const plain = data => JSON.parse(JSON.stringify(data));

test('growth stages include the empty seed and first true leaf', () => {
  const model = buildTree(fixture(0), today);
  assert.equal(model.leaves.size, 0);
  assert.equal(stage(0), 'Seed');
  assert.equal(stage(1), 'Sprout');
  assert.equal(stage(3), 'Sapling');
  assert.equal(stage(12), 'Young tree');
  assert.equal(stage(32), 'Growing tree');
  assert.equal(stage(120), 'Mature tree');
  assert.equal(stage(1000), 'Flourishing tree');
});

for (const count of [1, 10, 50, 100, 500, 1000]) {
  test('one independently identified leaf per memory at ' + count, t => {
    const tree = fixture(count);
    const started = performance.now();
    const model = buildTree(tree, today);
    const elapsed = performance.now() - started;
    const ids = new Set();
    assert.equal(model.leaves.size, count);
    for (let i = 0; i < model.vertices.length; i += STRIDE) {
      const pick = model.vertices[i + 14];
      if (model.vertices[i + 15] === 1) ids.add(pick);
      if (pick >= BRANCH) assert.ok(model.branches.has(pick));
    }
    assert.equal(ids.size, count);
    for (const m of tree.memories) {
      assert.equal(model.leaves.get(m.slot + 1).id, m.id);
      assert.ok(ids.has(m.slot + 1));
    }
    t.diagnostic(elapsed.toFixed(1) + ' ms CPU mesh generation, ' + model.vertices.length / STRIDE / 3 + ' triangles');
  });
}

test('other leaves keep their positions through edits, additions, deletion and chapter reorder', () => {
  const tree = fixture(100);
  const base = buildTree(tree, today);
  const input = { ...tree.memories[99], title: 'A new memory', date: '2026-11-16' };
  const added = putMemory(tree, input);
  assert.equal(added.memories.at(-1).slot, 100);
  const edited = putMemory(added, { ...tree.memories[5], title: 'A different title' }, tree.memories[5].id);
  assert.equal(edited.memories[5].slot, 5);
  const changed = { ...edited, memories: edited.memories.filter(m => m.slot !== 15), chapters: [...tree.chapters].reverse() };
  const next = buildTree(changed, today);
  for (const [id, site] of base.leaves) if (id !== 16) assert.deepEqual(next.leaves.get(id), site);
  assert.equal(next.leaves.size, 100);
  assert.equal(next.leaves.get(16), undefined);
  assert.deepEqual(buildTree(validateTree(plain(tree)), today).vertices, base.vertices);
});

test('species alter geometry, seasons alter color, and mature memory colors use the actual date', () => {
  const tree = fixture(10);
  const variant = settings => buildTree({ ...tree, settings: { ...tree.settings, ...settings } }, today);
  const cherry = variant({});
  for (const species of ['oak', 'willow']) assert.notDeepEqual(variant({ species }).leaves.get(8).tip, cherry.leaves.get(8).tip);
  assert.deepEqual(variant({ season: 'winter' }).leaves.get(8), cherry.leaves.get(8));
  assert.notDeepEqual(variant({ season: 'winter' }).vertices, cherry.vertices);
  assert.ok(leafColor('2026-11-19', today, 'summer', 'oak')[1] > leafColor('2016-11-19', today, 'summer', 'oak')[1]);
  assert.equal(activeSeason({ ...initialSettings, south: true }, '2026-12-01'), 'summer');
});

test('local date and anniversary math handles boundaries and leap day', () => {
  assert.equal(localDay(new Date(2026, 10, 19, 0, 5)), today);
  assert.ok(validDay('2000-02-29'));
  assert.ok(!validDay('2100-02-29'));
  assert.equal(nextAnniversary('2020-02-29', '2026-01-01'), '2026-02-28');
  assert.equal(nextAnniversary('2020-02-29', '2027-12-31'), '2028-02-29');
});

test('chapter removal preserves memories and filtered views do not mutate the tree', () => {
  const original = fixture(40), before = plain(original);
  const trimmed = removeChapter(original, 'branch-0');
  assert.equal(trimmed.memories.length, original.memories.length);
  assert.equal(findMemories(trimmed, 'walk', 'unassigned', true, false).length, 7);
  assert.ok(findMemories(original, 'our firsts', '', true, false).length);
  assert.deepEqual(plain(original), before);
});

test('validates backup identities, metadata, date-only values and image input', () => {
  const tree = fixture(4);
  const allowable = plain(tree);
  allowable.extra = 'ignored';
  allowable.memories[0].photos = [{ id: 'photo-1', name: 'test.png', data: 'data:image/png;base64,iVBORw0KGgo=' }];
  assert.equal(validateTree(allowable).extra, undefined);
  for (const damage of [
    t => {t.memories[1].slot=t.memories[0].slot;},
    t => {t.memories[0].date='2026-02-29';},
    t => {t.memories[0].chapterId='other-tree';},
    t => {t.memories[0].photos[0].data='data:image/svg+xml;base64,AAAA';},
  ]) {
    const bad = plain(allowable);
    damage(bad);
    assert.throws(() => validateTree(bad), /backup/);
  }
  assert.throws(() => validateGrove({version:1,activeId:'unknown',trees:[tree]}), /kept/);
  assert.equal(validateGrove({version:1,activeId:tree.id,trees:[tree]}).activeId, tree.id);
});
