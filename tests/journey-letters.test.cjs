const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./load-book-model.cjs');
const journeys = load('./journey-letters');
const { journeyRoute } = load('./journey-route');
const { sealLetter, createLetter, makeBackup, validateBackup } = load('./letters');
const { resolveRelease } = load('./letter-time');

const timing = (wall, zone, occurrence = 'earlier') => ({ wall, zone, occurrence });
const from = { name:'Lahore', point:{ lat:31.558, lon:74.35071 } };
const to = { name:'London', point:{ lat:51.50853, lon:-.12574 } };
const input = {
  name:'The long way home', from, to, dedication:'',
  departure:timing('2026-11-22T23:00','Asia/Karachi'),
  arrival:timing('2026-11-23T03:00','Europe/London'),
};
function example(update = {}, now = Date.parse('2026-11-19T00:00Z')) {
  return journeys.createJourney(journeys.resolveJourneyPlan({...input,...update}),now);
}

test('a new journey has its own six stable, empty envelopes and UTC opening times across midnight', () => {
  const journey = example();
  assert.equal(journeys.validateJourney(journey),journey);
  assert.equal(journey.checkpoints.length,6);
  assert.equal(new Set(journey.checkpoints.map(stop=>stop.id)).size,6);
  assert.equal(journey.checkpoints.filter(stop=>stop.letter===null).length,6);
  assert.equal(journey.checkpoints.map(stop=>stop.label).join('|'),journeys.checkpointNames.join('|'));
  const times = Array.from(journeys.checkpointTimes(journey), instant=>new Date(instant).toISOString().slice(11,16));
  assert.deepEqual(times,['17:00','18:00','19:48','22:30','01:39','03:00']);
  assert.equal(journeys.journeyProgress(journey,Date.parse('2026-11-22T22:30Z')),.5);
  assert.equal(journeys.journeyPhase(journey,journey.arrival.instant),'Arrived');
});

test('manual cities may have no map point, invalid coordinates or backwards flight times fail', () => {
  const journey=example({name:' Manual route ',from:{name:'A city not in the directory',point:null},
    departure:timing('2026-11-22T19:30','Asia/Kathmandu')});
  assert.equal(journey.name,'Manual route');
  assert.equal(journey.from.point,null);
  assert.equal(journey.departure.instant,Date.parse('2026-11-22T13:45Z'));
  assert.throws(()=>example({from:{name:'Out of bounds',point:{lat:91,lon:0}}}),/coordinates/);
  assert.throws(()=>example({arrival:timing('2026-11-22T17:01','UTC')}),/Arrival must occur after departure/);
  assert.throws(()=>example({arrival:timing('2026-11-23T03:00','Unknown/City')}),/valid arrival/);
});

test('civil times reject spring gaps and distinguish the first and second occurrence of repeated hours', () => {
  assert.throws(()=>example({departure:timing('2027-03-14T02:15','America/New_York'),
    arrival:timing('2027-03-14T18:00','UTC')}),/valid departure/);
  const arrival=timing('2027-11-07T21:00','Europe/London');
  const first=example({departure:timing('2027-11-07T01:30','America/New_York'),arrival});
  const second=example({departure:timing('2027-11-07T01:30','America/New_York','later'),arrival});
  assert.equal(second.departure.instant-first.departure.instant,3_600_000);
  assert.equal(second.checkpoints.length,6);
});

test('edited flight times move the defaults while custom instants remain fixed and ordered', () => {
  const original=example();
  original.checkpoints[0].label='At the front door';
  original.checkpoints[0].custom=resolveRelease(timing('2026-11-22T22:15','Asia/Karachi'));
  const old = journeys.checkpointTimes(original);
  const changed={...original,...journeys.resolveJourneyPlan({...input,departure:timing('2026-11-22T23:45','Asia/Karachi')},original)};
  assert.equal(journeys.validateJourney(changed),changed);
  const next=journeys.checkpointTimes(changed);
  assert.equal(next[0],old[0]);
  assert.ok(next[1]>old[1] && next[4]>old[4]);
  for(const [index,stop] of changed.checkpoints.entries())assert.equal(stop.id,original.checkpoints[index].id);
  assert.throws(()=>journeys.validateJourney({...changed,checkpoints:changed.checkpoints.map((stop,index)=>index===2?{...stop,custom:original.checkpoints[0].custom}:stop)}),/order/);
});

test('the existing Letter model seals a journey draft and the journey records an opening only when available', () => {
  const journey=example(), checkpoint=journey.checkpoints[0];
  const draft=journeys.createCheckpointLetter(journey,0,journey.createdAt);
  assert.equal(draft.pages[0].text,'');
  assert.throws(()=>sealLetter(draft,journey.createdAt),/Add something/);
  draft.pages[0].text='I’ll be thinking of you.';
  const writing=journeys.putCheckpointLetter(journey,checkpoint.id,draft,journey.createdAt);
  const release=journeys.checkpointTimes(journey)[0];
  assert.equal(journeys.checkpointStatus(writing.checkpoints[0],release,release),'Draft');
  const sealed=journeys.putCheckpointLetter(writing,checkpoint.id,sealLetter(draft,journey.createdAt),journey.createdAt);
  assert.equal(journeys.checkpointStatus(sealed.checkpoints[0],release,release-1),'Waiting for opening');
  assert.equal(journeys.checkpointStatus(sealed.checkpoints[0],release,release-1,true),'Sealed');
  assert.equal(journeys.checkpointStatus(sealed.checkpoints[0],release,release),'Ready to open');
  assert.throws(()=>journeys.openCheckpoint(sealed,0,release-1),/waiting/);
  const opened=journeys.openCheckpoint(sealed,0,release);
  assert.equal(journeys.checkpointStatus(opened.checkpoints[0],release,release),'Opened');
  assert.equal(journeys.openCheckpoint(opened,0,release),opened);
  assert.equal(journeys.summarizeJourney(opened).opened,1);
  assert.throws(()=>journeys.putCheckpointLetter(sealed,checkpoint.id,createLetter()),/changed/);
});

test('backups validate version and identity, import preserves states, and duplicates get independent drafts', () => {
  const journey=example(), draft=journeys.createCheckpointLetter(journey,1,journey.createdAt);
  draft.pages[0].text='Take this with you';
  const sealed=journeys.putCheckpointLetter(journey,journey.checkpoints[1].id,sealLetter(draft,journey.createdAt),journey.createdAt);
  const restored=journeys.validateJourneyBackup(JSON.parse(JSON.stringify(journeys.makeJourneyBackup(sealed))));
  const imported=journeys.copyJourney(restored,false,restored.updatedAt+10);
  const duplicate=journeys.copyJourney(restored,true,restored.updatedAt+15);
  assert.notEqual(imported.id,sealed.id);
  assert.notEqual(imported.checkpoints[1].id,sealed.checkpoints[1].id);
  assert.notEqual(imported.checkpoints[1].letter.pages[0].id,draft.pages[0].id);
  assert.equal(imported.checkpoints[1].letter.state,'sealed');
  assert.equal(duplicate.checkpoints[1].letter.state,'draft');
  assert.equal(duplicate.checkpoints[1].letter.pages[0].text,draft.pages[0].text);
  const bad=JSON.parse(JSON.stringify(journeys.makeJourneyBackup(duplicate)));
  bad.journey.checkpoints[2].id=bad.journey.checkpoints[1].id;
  assert.throws(()=>journeys.validateJourneyBackup(bad),/could not be read/);
  assert.throws(()=>journeys.validateJourneyBackup(makeBackup([draft],[])),/could not be read/);
  assert.equal(validateBackup(makeBackup([draft],[])).letters[0].id,draft.id);
});

test('short and long routes follow a curved path, wrap the antimeridian, and have a city-name fallback', () => {
  for(const [a,b] of [[from.point,to.point],[{lat:48.85341,lon:2.3488},to.point],[{lat:40,lon:-170},{lat:36,lon:178}],[null,to.point]]) {
    const route=journeyRoute(a,b);
    assert.ok(route.path.includes(' Q '));
    assert.ok(Math.abs(route.at(0).x-route.a.x)<.001);
    assert.ok(Math.abs(route.at(1).x-route.b.x)<.001);
    assert.notEqual(route.at(.2).heading,route.at(.8).heading);
    assert.ok(route.at(.5).y>0 && route.at(.5).y<route.height);
    assert.equal(route.geographic,!!a);
  }
});
