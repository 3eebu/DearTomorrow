const assert = require('node:assert/strict');
const test = require('node:test');
const { environmentLayers, environmentAnchors, frameEnvironment, hasCompletePainting, isPaintedLayer } =
  require('./load-book-model.cjs')('./memory-tree-environment');

test('partially separated art never composites over the trees or clouds in the master', () => {
  const plates = {};
  const required = environmentLayers.filter(layer => isPaintedLayer(layer.id));
  for (const layer of required) {
    assert.equal(hasCompletePainting(plates), false);
    plates[layer.id] = { src: layer.id + '.webp' };
  }
  assert.equal(hasCompletePainting(plates), true);
  for (const layer of required) {
    const incomplete = { ...plates };
    delete incomplete[layer.id];
    assert.equal(hasCompletePainting(incomplete), false, layer.id);
  }
});

test('the painting can be assembled before birds and memory interactions are supplied', () => {
  const ids = Array.from(environmentLayers, layer => layer.id);
  assert.equal(new Set(ids).size, 17);
  assert.ok(ids.indexOf('clouds-distant') < ids.indexOf('clouds-primary'));
  assert.ok(ids.indexOf('tree-shadow') < ids.indexOf('tree-wood'));
  assert.deepEqual(ids.filter(id => !isPaintedLayer(id)), ['finches', 'memory-markers']);
});

test('vertical artwork expansion preserves the scale and registration of the original world', () => {
  const { aspect, registration } = frameEnvironment({ x: 0, y: -.25, width: 1, height: 1.5 });
  assert.equal(aspect, 1672 / (941 * 1.5));
  assert.equal(registration.width, 1);
  assert.equal(registration.height * 1.5, 1);
  for (const anchor of Object.values(environmentAnchors)) {
    const x = registration.x + anchor.x * registration.width;
    const y = registration.y + anchor.y * registration.height;
    assert.equal(x, anchor.x);
    assert.ok(Math.abs(y * 1.5 - .25 - anchor.y) < 1e-12);
  }
});
