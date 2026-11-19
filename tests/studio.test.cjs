const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const crypto = require('node:crypto').webcrypto;
const cache = new Map();
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} }; cache.set(file, mod.exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const requireLocal = name => name.endsWith('.css') ? new Proxy({}, { get: (_target, prop) => prop === '__esModule' ? false : String(prop) }) : name.startsWith('@/') ? load('src/' + name.slice(2) + (name.includes('components/') ? '.tsx' : '.ts')) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + (fs.existsSync(path.resolve(path.dirname(file), name) + '.tsx') ? '.tsx' : '.ts')) : require(name);
  vm.runInNewContext(source, { exports: mod.exports, require: requireLocal, crypto, atob, btoa, console, performance, setTimeout, clearTimeout }); return mod.exports;
}
const model = load('src/lib/memory-books.ts'), geometry = load('src/lib/studio-geometry.ts'), content = load('src/lib/studio-content.ts'), doc = load('src/lib/studio-document.ts'), { StudioHistory } = load('src/lib/studio-history.ts');
const make = () => model.createBook('Anniversary QA', 180, 240, '#643e4a', 'linen', false);
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
const bookmaking = load('src/lib/bookmaking.ts');
const magic = load('src/lib/book-surprises.ts');
const voice = load('src/lib/book-voice.ts');

test('voice recordings survive a backup and reject wrong media, headers, durations, and references', () => {
  const book = make(), page = book.pages[0], card = doc.voiceElement();
  page.elements.push(card);
  const sample = voice.voiceWav(new Float32Array(voice.VOICE_RATE).fill(.02), 'QA audio');
  const recorded = doc.setVoiceAsset(book, page.id, card.id, sample);
  const backup = JSON.stringify(recorded);
  const roundTrip = model.validateBook(JSON.parse(backup));
  assert.equal(JSON.stringify(roundTrip), backup);
  const id = Object.keys(roundTrip.voiceAssets)[0];
  assert.equal(roundTrip.voiceAssets[id].durationMs, 1000);
  for (const invalid of [
    { ...sample, version: 2 },
    { ...sample, data: sample.data.replace('audio/wav', 'audio/webm') },
    { ...sample, data: sample.data.replace('UklG', 'AAAA') },
    { ...sample, data: sample.data.slice(0, -4) },
    { ...sample, durationMs: 60000 },
  ]) assert.throws(() => model.validateBook({ ...recorded, voiceAssets: { [id]: invalid } }), /unsupported format/);
  assert.throws(() => model.validateBook({ ...recorded, voiceAssets: {} }), /unsupported format/);
  assert.throws(() => voice.voiceWav(new Float32Array(voice.VOICE_RATE * 61), 'Too long'), /one minute/);
});

test('removing a voice honours shared copies, cleans the last asset, and remains undoable', () => {
  const b = make(), page = b.pages[0], card = doc.voiceElement();
  page.elements.push(card);
  const recorded = doc.setVoiceAsset(b, page.id, card.id, voice.voiceWav(new Float32Array(320), 'Test'));
  const withRecording = recorded.pages[0].elements.find(element => element.id === card.id);
  const copy = doc.copyObjects([withRecording])[0];
  const shared = { ...recorded, pages: [{ ...recorded.pages[0], elements: [withRecording, copy] }, b.pages[1]] };
  const removedFirst = doc.setVoiceAsset(shared, page.id, card.id);
  assert.ok(removedFirst.voiceAssets[copy.voice.assetId]);
  const removedBoth = doc.setVoiceAsset(removedFirst, page.id, copy.id);
  assert.equal(removedBoth.voiceAssets, undefined);
  const trail = new StudioHistory();
  trail.record(removedFirst, removedBoth);
  const restored = trail.undo(removedBoth);
  assert.equal(restored.voiceAssets[copy.voice.assetId].name, 'Test');
  assert.throws(() => doc.setVoiceAsset(shared, page.id, 'missing', shared.voiceAssets[copy.voice.assetId]), /card changed/);
  model.validateBook(removedBoth);
  model.validateBook(restored);
});

test('a voice card renders without an audio player or play controls in a moving strip', () => {
  const React = require('react'), render = require('react-dom/server').renderToStaticMarkup;
  const { PageContent } = load('src/components/memory-books/page-content.tsx');
  const { VoicePlayer } = load('src/components/memory-books/voice-memory.tsx');
  const original = make(), page = original.pages[0], card = doc.voiceElement();
  page.elements = [card];
  const b = doc.setVoiceAsset(original, page.id, card.id, voice.voiceWav(new Float32Array(320), 'Short recording'));
  const surface = render(React.createElement(PageContent, { book: b, page: b.pages[0], strip: [40, 44] }));
  assert.match(surface, /A voice to keep/);
  assert.doesNotMatch(surface, /<audio|<button|base64/);
  const resting = render(React.createElement(VoicePlayer, { scope: 'resting' },
    React.createElement(PageContent, { book: b, page: b.pages[0], interactive: true })));
  assert.equal((resting.match(/<audio/g) || []).length, 1);
  assert.match(resting, /Play A voice to keep/);
  assert.doesNotMatch(resting, /autoplay|base64/);
});

test('a new insert uses free paper when a default placement overlaps; example opens as an independent book', () => {
  const first = { ...model.newElement('text'), x: 18, y: 20, width: 45, height: 30 };
  const second = { ...model.newElement('surprise'), x: 18, y: 20, width: 45, height: 30 };
  const inserted = doc.placeNewObject(second, [first]);
  assert.ok(inserted.y >= first.y + first.height || inserted.x >= first.x + first.width);
  assert.equal(second.y, 20);
  const { newShowcase } = require('./load-book-model.cjs')('./book-showcase');
  const example = newShowcase(), another = newShowcase();
  assert.equal(example.title, 'Every Little Thing About Us');
  assert.equal(example.pages.length, 18);
  assert.equal(example.chapters.length, 3);
  assert.notEqual(example.pages[0].id, another.pages[0].id);
  assert.equal(new Set(example.pages.flatMap(page => page.elements.flatMap(e => e.surprise?.type ?? []))).size, 7);
  assert.ok(example.gift && example.cover.design && example.voiceAssets['example-chime']);
});

test('anniversary project backups retain all seven surprises, independent photo faces, and wrapping', () => {
  const { anniversaryBook } = require('./create-magic-fixture.cjs');
  const book = anniversaryBook();
  const backup = JSON.stringify(book);
  const restored = model.validateBook(JSON.parse(backup));
  assert.equal(JSON.stringify(restored), backup);
  assert.deepEqual(restored.pages.flatMap(page => page.elements.flatMap(e => e.surprise?.type ?? [])),
    Array.from(magic.surpriseKinds));
  const photograph = restored.pages[1].elements.find(e => e.kind === 'polaroid');
  assert.equal(photograph.assetId, 'fixture');
  assert.equal(photograph.surprise.message.place, 'The coast');
  assert.equal(restored.gift.tag, 'For our anniversary');
});

test('imports reject unsupported or unsafe surprise data before a project can be saved', () => {
  const { anniversaryBook } = require('./create-magic-fixture.cjs');
  for (const mutate of [
    b => { b.pages[0].elements[1].surprise.version = 2; },
    b => { b.pages[0].elements[1].surprise.seal = 'url(https://example.test/image)'; },
    b => { b.pages[0].elements[1].surprise.opened = true; },
    b => { b.pages[0].elements[1].surprise.message.assetId = 'missing-photo'; },
    b => { b.pages[0].elements[1].surprise.message.words = 'x'.repeat(20001); },
    b => { const p = b.pages[2].elements[2].surprise; p.items[1].id = p.items[0].id; },
    b => { b.pages[0].elements[1].kind = 'photo'; },
    b => { delete b.pages[0].elements[1].surprise; },
    b => { b.gift.pattern = 'remote'; },
    b => { b.gift.version = 9; },
  ]) {
    const book = anniversaryBook();
    mutate(book);
    assert.throws(() => model.validateBook(book), /unsupported format/);
  }
});

test('hidden photo upload preserves front and newer copy; removed keepsake aborts without allocating an asset', () => {
  const book = make(), page = book.pages[0];
  const reversible = doc.surpriseElement('reverse');
  const pocket = doc.surpriseElement('pocket');
  book.assets.front = { name: 'Front', data: 'data:image/png;base64,aGVsbG8=' };
  reversible.assetId = 'front';
  reversible.surprise.message.words = 'Newer writing on the back';
  page.elements.push(reversible, pocket);
  const before = JSON.stringify(book);
  const changed = doc.insertPhoto(book, page.id, book.assets.front.data, 'Back', reversible.id, { type: 'reverse' });
  const next = changed.pages[0].elements.find(e => e.id === reversible.id);
  assert.equal(next.assetId, 'front');
  assert.notEqual(next.surprise.message.assetId, 'front');
  assert.equal(next.surprise.message.words, 'Newer writing on the back');
  assert.throws(() => doc.insertPhoto(book, page.id, book.assets.front.data, 'Pocket', pocket.id,
    { type: 'pocket', itemId: 'removed' }), /destination changed/);
  assert.equal(JSON.stringify(book), before);
  model.validateBook(changed);
});

test('reader interaction keys stay isolated per page and curved strips never render duplicate controls', () => {
  const React = require('react'), render = require('react-dom/server').renderToStaticMarkup;
  const { PageContent } = load('src/components/memory-books/page-content.tsx');
  const { ReadingInteractions } = load('src/components/memory-books/paper-surprise.tsx');
  const book = make(), [first, second] = book.pages;
  const element = doc.surpriseElement('envelope');
  first.elements = [element]; second.elements = [{ ...element }];
  const key = magic.interactionKey(first.id, element.id);
  assert.notEqual(key, magic.interactionKey(second.id, element.id));
  assert.notEqual(magic.interactionKey('a:b', 'c'), magic.interactionKey('a', 'b:c'));
  const renderPage = (page, props = {}) => render(React.createElement(ReadingInteractions.Provider,
    { value: { states: new Map([[key, { opened: true }]]), update() {} } },
    React.createElement(PageContent, { page, book, ...props })));
  assert.match(renderPage(first, { interactive: true }), /Return letter/);
  assert.match(renderPage(second, { interactive: true }), /Open envelope/);
  const strip = renderPage(first, { strip: [36, 40] });
  assert.match(strip, /data-open="true"/);
  assert.doesNotMatch(strip, /<button|tabindex/);
  assert.doesNotMatch(renderPage(first, { strip: [0, 2] }), /data-surprise=/);
  const copy = doc.copyObjects([element])[0];
  assert.notEqual(copy.id, element.id);
  assert.equal(JSON.stringify(copy.surprise), JSON.stringify(element.surprise));
  assert.ok(magic.surpriseOverlapsStrip({ x: 38, width: 8, height: 35, rotation: 90 }, .75, 62, 67));
});

test('bookmaking metadata and independent cover canvases survive a backup round trip', () => {
  const book = make();
  const orderedIds = Array.from(book.pages, page => page.id);
  const cover = bookmaking.coverDesign(book);
  const front = model.blankPage();
  front.elements.push({...model.newElement('text'), text: 'S & H'});
  book.cover.design = {...cover, fabric: 'velvet', lettering: 'gold', ribbon: '#b98583', surfaces: {front}};
  book.bookmaking = {version: 1, collection: 'Our story', series: 'First years', volume: 2, contents: true};
  const copy = model.validateBook(JSON.parse(JSON.stringify(book)));
  assert.deepEqual(Array.from(copy.pages, page => page.id), orderedIds);
  assert.equal(JSON.stringify(copy), JSON.stringify(book));
  for (const change of [
    b => { b.cover.design.version = 2; },
    b => { b.cover.design.ribbon = 'url(https://example.com)'; },
    b => { b.cover.design.surfaces.front.chapterId = b.chapters[0].id; },
    b => { b.bookmaking.volume = 1.5; },
    b => { b.chapters[0].color = 'invalid'; },
  ]) {
    const broken = structuredClone(book);
    change(broken);
    assert.throws(() => model.validateBook(broken), /unsupported format/);
  }
});

test('explicit chapter moves preserve every page and keep contents numbering in sync', () => {
  const book = make();
  const first = book.chapters[0].id;
  const second = model.uid();
  const [a, b] = book.pages;
  const c = bookmaking.divider(second, 'Little adventures', 'botanical');
  const unassigned = model.blankPage();
  book.chapters.push({id: second, title: 'Little adventures'});
  book.pages = [a, c, b, unassigned];
  const order = value => Array.from(value.pages, p => p.id);
  assert.deepEqual(order(model.validateBook(book)), order(book));
  const reordered = bookmaking.reorderChapter(book, second, -1);
  assert.deepEqual(order(reordered), [c.id, a.id, b.id, unassigned.id]);
  assert.deepEqual(Array.from(bookmaking.contents(reordered), item => item.page), [1, 2]);
  const moved = bookmaking.movePages(reordered, [a.id, unassigned.id], second);
  assert.deepEqual(order(moved), order(reordered));
  const duplicate = bookmaking.duplicateChapter(moved, second);
  const copiedChapter = duplicate.chapters[1].id;
  const copied = duplicate.pages.filter(page => page.chapterId === copiedChapter);
  assert.equal(copied.length, 3);
  assert.notEqual(copied[0].elements[0].id, c.elements[0].id);
  assert.equal(copied[0].elements[0].text, c.elements[0].text);
  assert.equal(new Set(order(duplicate)).size, 7);
  assert.equal(book.pages[0].chapterId, first);
  model.validateBook(duplicate);
});
test('version 1 upgrades in memory with stable IDs, photo bytes and object geometry, without mutating the input', () => {
  const b = make(); b.version = 1; const original = JSON.stringify(b), result = model.validateBook(b);
  assert.equal(JSON.stringify(b), original); assert.equal(result.version,2); assert.equal(result.id,b.id); assert.equal(result.pages[0].elements[1].id,b.pages[0].elements[1].id);
  assert.equal(JSON.stringify({...result,version:1}), original);
});
test('new properties, vector strokes, mixed writing and bleed survive a project round trip', () => {
  const b=make(), e=b.pages[0].elements[0]; e.x=-4;e.rotation=21;e.runs=[{text:e.text.slice(0,4),bold:true},{text:e.text.slice(4),italic:true,color:'#643e4a'}];
  b.pages[0].elements.push({...model.newElement('drawing'),strokes:[{id:'stroke',tool:'pen',color:'#643e4a',width:.5,opacity:.8,points:[[1,2,.5],[40,50,.8]]}]}, {...model.newElement('sticker'),sticker:'tape'});
  const restored=model.validateBook(JSON.parse(JSON.stringify(b)));
  assert.equal(JSON.stringify(restored),JSON.stringify(b)); assert.equal(restored.pages[0].elements[0].x,-4);
});
test('unsafe markup sources and invalid new property values are rejected before rendering', () => {
  for(const mutate of [b=>b.pages[0].elements[0].runs=[null],b=>b.pages[0].elements[0].runs=[{text:'different'}],b=>b.pages[0].elements[0].imageZoom=Infinity,b=>b.pages[0].elements[0].sticker='<svg onload=evil()>',b=>b.pages[0].gradient='url(https://external)',b=>b.pages[0].elements.push({...model.newElement('drawing'),strokes:[{id:'bad',tool:'pen',color:'#643e4a',width:1,opacity:1,points:[[NaN,3,.5]]}]})]) {
    const b=make();mutate(b);assert.throws(()=>model.validateBook(b),/unsupported format/);
  }
});
test('eight resize handles preserve the opposite physical anchor for rotated portrait and landscape objects at every zoom', () => {
  for(const [pw,ph] of [[180,240],[254,203.2]]) for(const zoom of [.5,1,2.5]) for(const angle of [-137,-30,0,45,110]) for(const handle of ['nw','n','ne','e','se','s','sw','w']) {
    const e={...model.newElement('photo'),x:25,y:20,width:30,height:38,rotation:angle},page={width:pw*zoom,height:ph*zoom};
    const sx=handle.includes('w')?-1:handle.includes('e')?1:0,sy=handle.includes('n')?-1:handle.includes('s')?1:0;
    const anchor = v => {const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=-sx*v.width/100*page.width/2,y=-sy*v.height/100*page.height/2;return [(v.x+v.width/2)/100*page.width+x*c-y*s,(v.y+v.height/2)/100*page.height+x*s+y*c];};
    const result=geometry.resizeObject(e,3*zoom,2*zoom,handle,page,false);const a=anchor(e),b=anchor(result);near(a[0],b[0]);near(a[1],b[1]);
    const unzoomed=geometry.resizeObject(e,3,2,handle,{width:pw,height:ph},false);near(result.x,unzoomed.x);near(result.width,unzoomed.width);
  }
});
test('aspect locking preserves physical proportions and rotated clipping is detected', () => {
  const e={...model.newElement('photo'),width:30,height:40,rotation:40};const p={width:180,height:240};
  const r=geometry.resizeObject(e,30,20,'se',p,true);near(r.width/r.height,e.width/e.height);
  assert.equal(geometry.outside({...e,x:-10},p),true);
});
test('multi-object distribution preserves order and locked objects; snapping reports useful guides', () => {
  const items=[0,20,70].map(x=>({...model.newElement('text'),x,width:10}));const ids=new Set(items.map(e=>e.id));
  const aligned=geometry.alignObjects(items,ids,'x','distribute');near(aligned[1].x,35);
  const locked=[{...items[0],locked:true},...items.slice(1)];assert.equal(geometry.alignObjects(locked,ids,'x','end')[0].x,0);
  const snapped=geometry.snapPosition({...items[0],x:44.8},[],1);near(snapped.element.x,45);assert.equal(snapped.guides.x,50);
});
test('copying a group remaps IDs once and moving pages preserves object content without mutating either page', () => {
  const b=make(); b.pages[0].elements.forEach(e=>e.groupId='original');const copied=doc.copyObjects(b.pages[0].elements);
  assert.equal(copied[0].groupId,copied[1].groupId);assert.notEqual(copied[0].groupId,'original');assert.notEqual(copied[0].id,b.pages[0].elements[0].id);
  const before=JSON.stringify(b), ids=new Set(b.pages[0].elements.map(e=>e.id)),result=doc.moveObjects(b,b.pages[0].id,b.pages[1].id,ids);
  assert.equal(result.pages[0].elements.length,0);assert.equal(result.pages[1].elements[0].id,b.pages[0].elements[0].id);assert.equal(JSON.stringify(b),before);
});
test('late photo replacement keeps newer text and geometry, while removed or locked targets reject safely', () => {
  const b=make(),p=b.pages[0],target=p.elements[1];target.rotation=17;target.cropX=23;p.elements[0].text='A newer edit';
  const next=doc.insertPhoto(b,p.id,'data:image/png;base64,aGVsbG8=','QA.png',target.id);
  assert.equal(next.pages[0].elements[0].text,'A newer edit');assert.equal(next.pages[0].elements[1].rotation,17);assert.equal(next.pages[0].elements[1].cropX,23);
  assert.throws(()=>doc.insertPhoto(b,p.id,'data:image/png;base64,aGVsbG8=','QA.png','removed'),/destination changed/);
  target.locked=true;assert.throws(()=>doc.insertPhoto(b,p.id,'data:image/png;base64,aGVsbG8=','QA.png',target.id),/destination changed/);
});
test('history groups typing, bounds snapshots, shares image strings and restores edits across page switches', () => {
  const h=new StudioHistory(),a=make();a.assets.qa={name:'QA',data:'data:image/png;base64,aGVsbG8='};
  const b={...a,title:'A'},c={...b,title:'AB'};h.record(a,b,'typing',0);h.record(b,c,'typing',100);
  assert.equal(h.past.length,1);assert.equal(h.past[0].assets,a.assets);assert.equal(h.undo(c).title,a.title);assert.equal(h.redo(a).title,'AB');
  let current=c;for(let i=0;i<90;i++){const next={...current,subtitle:String(i)};h.record(current,next);current=next;}assert.equal(h.past.length,60);
});
test('curated and personal layouts retain editable objects and independent IDs', () => {
  for(const name of content.templateNames){const b=make(),p=content.templatePage(name,b.chapters[0].id);b.pages.push(p);model.validateBook(b);const copy=content.clonePage(p);assert.notEqual(copy.id,p.id);if(p.elements[0])assert.notEqual(copy.elements[0].id,p.elements[0].id);}
});
test('selected-word formatting preserves all characters and safely limits styles to the chosen range', () => {
  const runs=content.formatRange('Always yours',undefined,7,12,{bold:true});assert.equal(runs.map(r=>r.text).join(''),'Always yours');assert.equal(runs[0].bold,undefined);assert.equal(runs[1].text,'yours');assert.equal(runs[1].bold,true);
});
test('editing inside mixed writing preserves unaffected formatting and UTF-8 project budgets count emoji correctly', () => {
  const runs=[{text:'Always ',italic:true},{text:'yours',bold:true}], next=content.editText('Always yours','Always really yours',runs);
  assert.equal(next.map(r=>r.text).join(''),'Always really yours');assert.equal(next[next.length-1].bold,true);
  const b=make();b.title='For you ❤️ 🌿';assert.equal(model.projectBytes(b),Buffer.byteLength(JSON.stringify(b),'utf8'));
});
test('group transformations rotate in physical page space and preserve relative scale', () => {
  const items=[{...model.newElement('shape'),x:15,y:20,width:10,height:10},{...model.newElement('shape'),x:60,y:50,width:20,height:10}], p={width:180,height:240};
  const result=geometry.transformSelection(items,p,1.2,90);
  const distance = values => Math.hypot((values[0].x+values[0].width/2-values[1].x-values[1].width/2)*p.width,(values[0].y+values[0].height/2-values[1].y-values[1].height/2)*p.height);
  near(distance(result),distance(items)*1.2);near(result[0].width,items[0].width*1.2);assert.equal(result[0].rotation,90);
});
test('the vector eraser hits the middle of sparse segments after rotation, while distant strokes remain untouched',()=>{
  const e={...model.newElement('drawing'),x:10,y:20,width:40,height:30,rotation:0};
  const stroke={id:'s',tool:'pen',color:'#643e4a',width:1,opacity:1,points:[[0,0,.5],[100,100,.5]]};
  assert.equal(geometry.strokeHit(e,stroke,[30,35,.5],{width:180,height:240}),true);
  assert.equal(geometry.strokeHit({...e,rotation:90},stroke,[30,35,.5],{width:180,height:240}),true);
  assert.equal(geometry.strokeHit(e,stroke,[90,90,.5],{width:180,height:240}),false);
});
test('20, 50 and 100 object compositions in 20 and 100 page books validate, export and render within the supported budget', () => {
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{PageContent}=load('src/components/memory-books/page-content.tsx'),{anniversary}=require('./create-studio-fixture.cjs');
  for(const pages of [20,100])for(const count of [20,50,100]){
    const b=anniversary(count,pages),samples=[];let html='';
    for(let i=0;i<12;i++){const start=performance.now();const restored=model.validateBook(JSON.parse(JSON.stringify(b)));html=renderToStaticMarkup(React.createElement(PageContent,{book:restored,page:restored.pages[0]}));if(i>=2)samples.push(performance.now()-start);}
    samples.sort((a,b)=>a-b);assert.ok(html.includes('Drawn')||html.includes('Personal drawing'));assert.equal(b.pages[0].elements.length,count);assert.ok(model.projectBytes(b)<model.LIMITS.projectBytes);
    console.log(`Studio Node validation + round trip + shared SSR: ${pages} pages / ${count} objects: median ${samples[5].toFixed(2)}ms, max ${samples[9].toFixed(2)}ms; ${model.projectBytes(b)} bytes. Not a browser frame measurement.`);
  }
});
test('shared renderer includes every creative object and escapes writing rather than accepting HTML', () => {
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{PageContent}=load('src/components/memory-books/page-content.tsx');
  const b=make();b.pages[0].elements.push({...model.newElement('shape'),shape:'heart'}, {...model.newElement('sticker'),sticker:'daisy'}, {...model.newElement('drawing'),strokes:[{id:'s',tool:'pen',color:'#643e4a',width:.5,opacity:1,points:[[2,3,.5],[4,5,.5]]}]});b.pages[0].elements[0].text='<script>alert(1)</script>';
  const html=renderToStaticMarkup(React.createElement(PageContent,{book:b,page:b.pages[0]}));assert.ok(html.includes('Personal drawing'));assert.ok(html.includes('daisy'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
