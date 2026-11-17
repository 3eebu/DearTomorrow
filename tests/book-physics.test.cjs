const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/book-physics.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { paperSurface, lastSpread, visiblePages, turnPages, releaseTurn } = context.exports;
test('reduced motion removes both cover and sheet animation duration', () => {
  assert.equal(context.exports.motionDuration(true,1300),0);
  assert.equal(context.exports.motionDuration(true,840),0);
  assert.equal(context.exports.motionDuration(false,840),840);
});
test('sheet endpoints are flat, with continuous, fixed-length segments and a pinned binding', () => {
  for (const count of [20,32]) for (const back of [false,true]) for (const p of [0,.1,.35,.5,.7,.99,1]) {
    const parts = paperSurface(p,count,.8,back);
    if (!back) { assert.equal(parts[0].x,0); assert.equal(parts[0].z,0); }
    for(let i=0;i<count-1;i++) {
      const a=parts[i],b=parts[i+1];
      assert.ok(Math.abs(Math.hypot(b.x-a.x,b.z-a.z)-1/count)<1e-9);
      assert.ok(Number.isFinite(a.angle+a.twist+a.shade));
      if(p===0||p===1) assert.ok(Math.abs(a.z)<1e-9);
    }
  }
});
test('every document page is visible once in resting spreads, including even and odd final pages', () => {
  for(const pages of [1,2,3,20,21,100,200]) for(const single of [false,true]) {
    const seen=[];for(let i=0;i<=lastSpread(pages,single);i+=single?1:2) seen.push(...visiblePages(i,pages,single));
    assert.deepEqual(seen,Array.from({length:pages},(_,i)=>i));
  }
});
test('forward and backward sheets carry the same physical front and reverse in spreads', () => {
  for(let cursor=0;cursor<20;cursor+=2) {
    const f=turnPages(cursor,1,false),b=turnPages(cursor+2,-1,false);
    assert.equal(f.front,b.front);assert.equal(f.back,b.back);
  }
  assert.equal(turnPages(4,-1,true).under,3);
  assert.equal(turnPages(4,1,true).under,5);
});
test('short drags cancel, fresh forward momentum completes, stale flicks and explicit cancellation do not', () => {
  assert.equal(releaseTurn(.15,0,5,false),false);
  assert.equal(releaseTurn(.15,.8,30,false),true);
  assert.equal(releaseTurn(.15,.8,250,false),false);
  assert.equal(releaseTurn(.8,.8,5,true),false);
  assert.equal(releaseTurn(.6,-.2,10,false),true);
});
