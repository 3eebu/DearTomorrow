const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto').webcrypto;
const source = fs.readFileSync('src/lib/memory-books.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = { exports: {}, crypto };
vm.runInNewContext(compiled, sandbox);
const { createBook, validateBook, blankPage, newElement } = sandbox.exports;
const { shouldCompleteTurn } = sandbox.exports;
const make = () => createBook('Our First Year', 203.2, 203.2, '#643e4a', 'linen', false);
test('book creation produces independent, serializable documents', () => {
  const a = make(), b = make();
  assert.notEqual(a.id, b.id); assert.notEqual(a.pages[0].id, b.pages[0].id);
  assert.equal(validateBook(JSON.parse(JSON.stringify(a))).title, 'Our First Year');
});
test('square, landscape and portrait dimensions survive a backup round trip', () => {
  for (const [w,h] of [[203.2,203.2],[254,203.2],[148,210]]) {
    const b = make(); b.widthMm = w; b.heightMm = h;
    const restored = validateBook(JSON.parse(JSON.stringify(b)));
    assert.equal(restored.widthMm / restored.heightMm, w / h);
  }
});
test('all 20, 50 and 100 pages and object order survive serialization', () => {
  for (const count of [20,50,100]) {
    const b = make(); b.pages = Array.from({length:count}, (_,i) => { const p = blankPage(); p.elements = [{...newElement('text'), text:`Page ${i+1}`}]; return p; });
    const result = validateBook(JSON.parse(JSON.stringify(b)));
    assert.equal(result.pages.length,count); assert.equal(result.pages[count-1].elements[0].text,`Page ${count}`);
  }
});
test('positions, rotation, typography and embedded photo bytes survive export', () => {
  const b=make(); b.assets.test={name:'fixture.png',data:'data:image/png;base64,aGVsbG8='};
  b.pages[0].elements=[{...newElement('polaroid'),x:30,y:28,width:38,height:44,rotation:12,assetId:'test'}];
  const e=validateBook(JSON.parse(JSON.stringify(b))).pages[0].elements[0];
  assert.equal(e.rotation,12);assert.equal(e.x,30);assert.equal(e.assetId,'test');
});
test('invalid version, missing assets, duplicate pages and off-page geometry are rejected', () => {
  for (const mutate of [b=>b.version=2,b=>b.pages.push(b.pages[0]),b=>b.pages[0].elements[0].x=101,b=>b.pages[0].elements[0].assetId='missing',b=>b.widthMm=0,b=>b.pages[0].elements[0].rotation=NaN]) {
    const b=make();mutate(b);assert.throws(()=>validateBook(b));
  }
});
test('executable and external image sources are rejected without mutating input', () => {
  for (const data of ['javascript:alert(1)','https://example.com/private.jpg','data:image/svg+xml;base64,AAA=']) {
    const b=make();b.assets.test={name:'bad',data};const original=JSON.stringify(b);assert.throws(()=>validateBook(b));assert.equal(JSON.stringify(b),original);
  }
});
test('a slow short drag cancels, a long drag completes, and fresh flicks work in both directions', () => {
  assert.equal(shouldCompleteTurn(1,.2,0,10),false);
  assert.equal(shouldCompleteTurn(1,.7,0,10),true);
  assert.equal(shouldCompleteTurn(-1,.8,0,10),false);
  assert.equal(shouldCompleteTurn(-1,.2,0,10),true);
  assert.equal(shouldCompleteTurn(1,.15,-.8,10),true);
  assert.equal(shouldCompleteTurn(1,.15,-.8,300),false);
  assert.equal(shouldCompleteTurn(-1,.85,.8,10),true);
  assert.equal(shouldCompleteTurn(1,.8,-.8,10,true),false);
  assert.equal(shouldCompleteTurn(1,.1,.8,10),false);
});

// A transactional IndexedDB double checks commit/abort semantics, not UI state.
function storageHarness(failWrites = false) {
  let store = new Map();
  const database = { close() {}, transaction() {
    const staged = new Map(store); let pending = 0, aborted = false, timer;
    const tx = { objectStore: () => ({ get(key) { const request = {}; pending++; queueMicrotask(() => { request.result = staged.get(key); request.onsuccess?.(); done(); }); return request; }, put(value,key) { pending++; queueMicrotask(() => { if(failWrites){tx.abort();}else staged.set(key,value);done(); }); } }), abort() { aborted = true; clearTimeout(timer); queueMicrotask(() => tx.onabort?.()); } };
    function done() { pending--; clearTimeout(timer); if(!pending&&!aborted) timer=setTimeout(()=>{if(!aborted){store=staged;tx.oncomplete?.();}},0); }
    return tx;
  } };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync('src/lib/memory-book-storage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(output,{exports:module.exports,require:()=>sandbox.exports,indexedDB:{open(){const request={};queueMicrotask(()=>{request.result=database;request.onsuccess();});return request;}},setTimeout,clearTimeout,console});
  return { api:module.exports, get:(key)=>store.get(key), externalRevision:()=>store.set('revision',(store.get('revision')||0)+1) };
}
test('local saving completes only after the transaction commits and reload restores the document',async()=>{
  const h=storageHarness();assert.equal((await h.api.loadLibrary()).length,0);
  const book=make();await h.api.saveLibrary([book]);assert.equal(h.get('books')[0].id,book.id);
  const restored=await h.api.loadLibrary();assert.equal(restored[0].title,book.title);
});
test('an aborted storage transaction rejects without claiming or storing a save',async()=>{
  const h=storageHarness(true);await h.api.loadLibrary();await assert.rejects(h.api.saveLibrary([make()]),/Unable to save/);assert.equal(h.get('books'),undefined);
});
test('another tab changing the library prevents stale data from overwriting it',async()=>{
  const h=storageHarness();await h.api.loadLibrary();const book=make();await h.api.saveLibrary([book]);h.externalRevision();await assert.rejects(h.api.saveLibrary([]),/Another tab/);assert.equal(h.get('books')[0].id,book.id);
});
