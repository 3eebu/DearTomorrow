const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./load-book-model.cjs');
const { canOpen, createLetter, duplicateLetter, editLetter, importCopies, makeBackup, sealLetter, summarize,
  validateBackup, validateLetter } = load('./letters');
const { countdown, releaseLabel, resolveRelease, wallOptions } = load('./letter-time');
const { voiceWav } = load('./book-voice');
const { formatRange } = load('./studio-content');
const plain = x => JSON.parse(JSON.stringify(x));
const date = Date.UTC(2026, 0, 1);
const fixture = (kind = 'love') => {
  const letter = createLetter(kind, undefined, date, 'UTC');
  letter.title = 'A little note';
  letter.pages[0].text = 'Our little memory.';
  return letter;
};

test('ordinary, keepsake and future-self letters follow intentional draft, sealed and opened transitions', () => {
  for (const kind of ['love','selves','occasion']) {
    const draft = fixture(kind);
    assert.equal(canOpen(draft, date), false);
    assert.throws(() => sealLetter({ ...draft, pages:[{...draft.pages[0],text:''}] }, date), /paper/);
    const sealed = sealLetter(draft, date);
    assert.equal(validateLetter(sealed).state, 'sealed');
    assert.equal(canOpen(sealed, date), true);
    assert.throws(() => sealLetter(sealed,date), /Studio/);
    const reopened = editLetter({ ...sealed,state:'opened' }, date);
    assert.equal(reopened.state,'draft');
    assert.equal(reopened.pages[0].text, 'Our little memory.');
  }
});

test('daylight-saving gaps reject; repeated hours select the earlier or later instant', () => {
  const zone = 'America/New_York';
  assert.equal(wallOptions('2027-03-14T02:30', zone).length,0);
  assert.throws(() => resolveRelease({ wall:'2027-03-14T02:30',zone,occurrence:'earlier' }), /daylight/);
  const wall='2027-11-07T01:30';
  assert.deepEqual(plain(wallOptions(wall,zone)), [Date.UTC(2027,10,7,5,30),Date.UTC(2027,10,7,6,30)]);
  const later=resolveRelease({wall,zone,occurrence:'later'});
  assert.equal(later.instant,Date.UTC(2027,10,7,6,30));
  assert.match(releaseLabel(later),/November 7, 2027 at 01:30 · America\/New York \(UTC−05:00\)/);
});

test('time-zone conversion handles half-hour offsets and calendar boundaries', () => {
  const kathmandu=resolveRelease({wall:'2027-01-01T00:05',zone:'Asia/Kathmandu',occurrence:'earlier'});
  assert.equal(kathmandu.offset,345);
  assert.equal(kathmandu.instant,Date.UTC(2026,11,31,18,20));
  assert.equal(wallOptions('2026-02-29T11:00','UTC').length,0);
  assert.equal(wallOptions('2028-02-29T11:00','UTC').length,1);
  assert.equal(wallOptions('2028-02-29T11:00','Unknown/Zone').length,0);
});

test('scheduled letters become locally readable at the exact resolved time', () => {
  const draft=fixture('tomorrow');
  draft.timing = {wall:'2027-09-18T16:30',zone:'Asia/Karachi',occurrence:'earlier'};
  const sealed = sealLetter(draft, date);
  const instant=Date.UTC(2027,8,18,11,30);
  assert.equal(sealed.state,'scheduled');
  assert.equal(sealed.release.instant, instant);
  assert.equal(canOpen(sealed, instant-1), false);
  assert.equal(canOpen(sealed, instant), true);
  assert.equal(validateLetter(plain(sealed)).release.instant, instant);
  assert.equal(countdown(instant,instant-90_000),'1m 30s');
  assert.equal(countdown(instant,instant+1000),'0m 0s');
  assert.equal(editLetter(sealed,date).release,null);
  assert.throws(() => sealLetter(draft, instant), /future/);
  assert.throws(() => validateLetter({...sealed,release:{...sealed.release,instant:0}}), /kept/);
});

test('a collection of seven custom Open When letters survives backup and imports as independent copies', () => {
  const labels=['you miss me','you feel sad','sleep feels far away','you need a hug','you feel proud','today feels long','you want to remember us'];
  assert.throws(() => sealLetter(fixture('when'),date), /label/);
  const letters=labels.map(label=>sealLetter({...fixture('when'),label,collectionId:'starter'},date));
  const result=validateBackup(plain(makeBackup(letters,[{id:'starter',name:'For the ordinary days'}])));
  assert.deepEqual(plain(result.letters.map(letter=>letter.label)), labels);
  const imported=importCopies(result,[{id:'existing',name:'For the ordinary days'}]);
  assert.equal(imported.collections.length,1);
  assert.ok(imported.letters.every((letter,index)=>letter.collectionId==='existing'&&letter.id!==letters[index].id));
  assert.equal(new Set(imported.letters.map(letter=>letter.id)).size,7);
  assert.throws(()=>validateBackup({...result,collections:[]}),/kept/);
  assert.throws(()=>validateBackup({...result,letters:[letters[0],letters[0]]}),/kept/);
});

test('paper, envelope, strokes, mixed writing and local media round trip together', () => {
  const letter=fixture();
  const [page]=letter.pages;
  page.runs = formatRange(page.text,undefined,4,10,{bold:true,underline:true});
  page.photo={caption:'At the table',polaroid:true,data:'data:image/png;base64,iVBORw0KGgo='};
  page.drawing=[{ink:'#774433',points:[[.1,.2],[.34,.48]]}];
  const second=fixture().pages[0];
  second.signature='Each day, A.';
  second.text='<img src=x onerror=alert(1)> stays plain text.';
  letter.pages.push(second);
  letter.paper={material:'handmade',color:'#ebc2b2',border:true,texture:true,motif:'branch',watermark:'A+M'};
  letter.envelope.back={...letter.envelope.back,emblem:'initials',initials:'A+M',wax:'#36543a'};
  letter.voice=voiceWav(new Float32Array(1600),'Fixture');
  letter.hidden='Under the lilacs.';
  const restored=validateLetter(plain(letter));
  assert.deepEqual(plain(restored),plain(letter));
  assert.ok(!JSON.stringify(summarize(restored)).includes('data:image/'));
  assert.ok(!JSON.stringify(summarize(restored)).includes('data:audio/'));
  const copy=duplicateLetter(sealLetter(restored,date),date+1);
  assert.equal(copy.state,'draft');
  assert.equal(copy.pages[0].text,page.text);
  assert.notEqual(copy.pages[0].id,page.id);
  assert.equal(copy.voice.data,letter.voice.data);
});

test('validation rejects unsafe media, malformed drawings, format desynchronization and invalid document states', () => {
  const letter=fixture();
  for(const invalid of [
    test=>{test.pages[0].photo={caption:'x',polaroid:false,data:'https://example.test/photo.png'};},
    test=>{test.pages[0].photo={caption:'x',polaroid:false,data:'data:image/svg+xml;base64,AAAA'};},
    test=>{test.voice={version:1,data:'data:audio/wav;base64,AAAA',name:'x',durationMs:5};},
    test=>{test.pages[0].drawing=[{ink:'#ffffff',points:[[0,1.1]]}];},
    test=>{test.pages[0].runs=[{text:'Different from the editable page.'}];},
    test=>{test.state='scheduled';},test=>{test.envelope.color='url(https://example.test)';},
    test=>{test.pages.push(test.pages[0]);},test=>{test.timing.wall='2027-02-30T09:00';},
  ]){
    const copy=plain(letter);invalid(copy);assert.throws(()=>validateLetter(copy),/kept/);
  }
});
