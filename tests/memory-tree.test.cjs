const assert = require('node:assert/strict');
const { test } = require('node:test');
const { performance } = require('node:perf_hooks');
const load = require('./load-book-model.cjs');
const { activeSeason, findMemories, initialSettings, localDay, newTree, nextAnniversary, putMemory,
  removeChapter, stage, validDay, validateGrove, validateTree } = load('./memory-tree');
const { buildPaintedTree, leafPalette } = load('./memory-tree-illustration');
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

test('growth moves from bare earth to a sprout and extends into a mature crown', () => {
  const empty = buildPaintedTree(fixture(0), today);
  assert.equal(empty.leaves.length, 0);
  assert.equal(empty.trunk.length, 0);
  const stages = [[0, 'Seed'], [1, 'Sprout'], [3, 'Sapling'], [12, 'Young tree'],
    [32, 'Growing tree'], [120, 'Mature tree'], [1000, 'Flourishing tree']];
  for (const [count, name] of stages) assert.equal(stage(count), name);
  const [first, sapling, growing, mature] = [1, 5, 20, 100].map(count => buildPaintedTree(fixture(count), today));
  assert.equal(first.leaves.length, 1);
  assert.ok(first.size < sapling.size && sapling.size < growing.size && growing.size < mature.size);
  assert.equal(first.boughs.length, 0);
  assert.ok(sapling.boughs.length < growing.boughs.length);
  const [left, right] = mature.leaves.reduce(([min,max], leaf) => [Math.min(min, leaf.x), Math.max(max, leaf.x)], [420,420]);
  assert.ok(right-left > 540);
});

for (const count of [1, 5, 20, 100, 500, 1000, 2400]) {
  test('one independently identified painted leaf per memory at ' + count, t => {
    const tree = fixture(count);
    const started = performance.now();
    const model = buildPaintedTree(tree, today);
    const elapsed = performance.now() - started;
    assert.equal(model.leaves.length, count);
    assert.deepEqual(Array.from(model.leaves, leaf => leaf.id), tree.memories.map(memory => memory.id));
    for (const leaf of model.leaves) {
      assert.ok(Number.isFinite(leaf.x) && Number.isFinite(leaf.y) && leaf.size > 0);
      assert.ok(leaf.x > 35 && leaf.x < 805 && leaf.y > 10 && leaf.y < 520);
    }
    t.diagnostic(elapsed.toFixed(1) + ' ms for ' + count + ' painted leaf positions');
  });
}

test('leaf positions follow saved slots and do not jump on edits or additions', () => {
  const tree = fixture(100);
  const base = buildPaintedTree(tree, today);
  const input = { ...tree.memories[99], title: 'A new memory', date: '2026-11-16' };
  const added = putMemory(tree, input);
  assert.equal(added.memories.at(-1).slot, 100);
  const edited = putMemory(added, { ...tree.memories[5], title: 'A different title' }, tree.memories[5].id);
  const coordinates = leaves => leaves.map(({id,x,y,angle}) => ({id,x,y,angle}));
  assert.deepEqual(coordinates(buildPaintedTree(edited,today).leaves.slice(0,100)), coordinates(base.leaves));
  assert.deepEqual(buildPaintedTree(validateTree(plain(tree)), today), base);
  const removed = buildPaintedTree({...edited, memories: edited.memories.filter(m => m.slot!==15)}, today);
  assert.equal(removed.leaves.length,100);
  assert.ok(!removed.leaves.some(leaf => leaf.slot===15));
});

test('species change the shapes and colors follow seasons and memory dates', () => {
  const tree = fixture(10);
  const variant = settings => buildPaintedTree({ ...tree, settings: { ...tree.settings, ...settings } }, today);
  const cherry = variant({});
  for (const species of ['oak', 'willow']) assert.notDeepEqual(variant({ species }).leaves, cherry.leaves);
  assert.deepEqual(variant({ season: 'winter' }).leaves, cherry.leaves);
  assert.notDeepEqual(leafPalette({ ...tree.settings, season: 'winter' }, today), leafPalette(tree.settings, today));
  assert.deepEqual(variant({ garden: 'rain' }), cherry);
  const recolored = buildPaintedTree({...tree, memories: tree.memories.map(m=>({...m,date:today}))},today);
  assert.equal(recolored.leaves[0].palette, 0);
  assert.ok(cherry.leaves[0].palette > 0);
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
