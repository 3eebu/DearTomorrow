const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.JOURNEY_PLAYWRIGHT || 'playwright');
const load = require('./load-book-model.cjs');
const { createJourney, resolveJourneyPlan, createCheckpointLetter, putCheckpointLetter, openCheckpoint, makeJourneyBackup } = load('./journey-letters');
const { sealLetter } = load('./letters');
const base = process.env.JOURNEY_URL || 'http://127.0.0.1:3002';
const shots = process.env.JOURNEY_SHOTS;
const beforeFlight = new Date('2026-11-22T15:00:00Z');
const sentence = 'I left this here for the quiet part of your flight.';
const button = (page,name) => page.getByRole('button',{name,exact:typeof name === 'string'});
const envelope = (page,index) => button(page,new RegExp('^Envelope '+index+','));
const heading = (page,name) => page.getByRole('heading',{name,exact:true});
const writing = page => page.getByRole('textbox',{name:'Write on the letter'});
const choices = {
  long:{ name:'A long way home', depart:'1172451', arrive:'2643743', leave:'2026-11-22T23:00', land:'2026-11-23T03:00' },
  short:{ name:'A little Paris weekend', depart:'2643743', arrive:'2988507', leave:'2026-11-22T16:30', land:'2026-11-22T19:00' },
};

async function shot(page,name,selector) {
  if (!shots) return;
  await fs.mkdir(shots,{recursive:true});
  const file = path.join(shots,name+'.png');
  await page.evaluate(()=>document.fonts.ready);
  if(selector)await page.locator(selector).screenshot({path:file});
  else await page.screenshot({path:file,fullPage:true});
}
async function openWorkspace(page) {
  assert.equal((await page.goto(base+'/journey-letters')).status(),200);
  await heading(page,'Until We Meet Again.').waitFor();
  await page.waitForFunction(()=>!document.querySelector('.jl-hero-copy button').disabled);
}
async function summary(page,input) {
  await button(page,'Create a journey').click();
  await page.getByLabel('Journey name').fill(input.name);
  await page.getByLabel('Departure city',{exact:true}).selectOption(input.depart);
  await page.getByLabel('Arrival city',{exact:true}).selectOption(input.arrive);
  await page.getByLabel('Departure time',{exact:true}).fill(input.leave);
  await page.getByLabel('Arrival time',{exact:true}).fill(input.land);
  await page.getByLabel('Dedication (optional)').fill('For the miles between us.');
  if (input===choices.long) await shot(page,'journey-setup');
  await button(page,'Review journey').click();
  await heading(page,input.name).waitFor();
}
async function saveJourney(page) {
  await button(page,'Save journey').click();
  await heading(page,'Six envelopes, one journey.').waitFor();
  assert.equal(await page.locator('.jl-envelope-list button').count(),6);
}
async function selectJourney(page,name) {
  await button(page,'Open journey '+name).click();
  await heading(page,'Six envelopes, one journey.').waitFor();
}
function completedFixture() {
  const now = Date.parse('2026-11-20T03:00Z');
  const plan = resolveJourneyPlan({
    name:'Across the Pacific', dedication:'For our long way home.',
    from:{name:'Tokyo, Japan',point:{lat:35.6895,lon:139.6917}}, to:{name:'San Francisco, United States',point:{lat:37.7749,lon:-122.4194}},
    departure:{wall:'2026-11-19T20:00',zone:'Asia/Tokyo',occurrence:'earlier'},
    arrival:{wall:'2026-11-19T14:00',zone:'America/Los_Angeles',occurrence:'earlier'},
  });
  let journey = createJourney(plan,now);
  for(let index=0;index<6;index++){
    const letter=createCheckpointLetter(journey,index,now);
    letter.pages[0].text='I thought of you at every turn.';
    journey=putCheckpointLetter(journey,journey.checkpoints[index].id,sealLetter(letter,now),now);
    journey=openCheckpoint(journey,index,now);
  }
  return makeJourneyBackup(journey);
}
async function upload(page,backup) {
  await page.getByLabel('Import Journey Letters backup').setInputFiles({
    name:'fictional-journey.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup)),
  });
}

async function run() {
  const browser = await chromium.launch({executablePath:process.env.JOURNEY_CHROMIUM});
  const errors=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'America/Los_Angeles',acceptDownloads:true});
    const page=await context.newPage();
    page.setDefaultTimeout(11000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.clock.setFixedTime(beforeFlight);
    await openWorkspace(page);
    await page.waitForFunction(()=>!document.querySelector('.jl-map svg').hasAttribute('data-intro'));
    await shot(page,'journey-empty');
    await summary(page,choices.long);
    await saveJourney(page);
    assert.match(await page.locator('.jl-progress').innerText(),/Before departure · 0%/);
    const plane=page.locator('.jl-plane'), map=page.locator('.jl-map svg[role="img"]');
    await map.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!!document.querySelector('.jl-map svg[data-intro="true"]'));
    const at=await plane.getAttribute('transform');
    await page.waitForFunction(at=>document.querySelector('.jl-plane').getAttribute('transform')!==at,at);
    await page.waitForFunction(()=>!document.querySelector('.jl-map svg').hasAttribute('data-intro'));
    const resting=await plane.getAttribute('transform');
    await button(page,'Replay route').click();
    await page.waitForFunction(()=>!!document.querySelector('.jl-map svg[data-intro="true"]'));
    await page.waitForFunction(at=>document.querySelector('.jl-plane').getAttribute('transform')!==at,resting);
    await page.waitForFunction(()=>!document.querySelector('.jl-map svg').hasAttribute('data-intro'));
    assert.equal(await plane.getAttribute('transform'),resting);
    await shot(page,'journey-long-route','.jl-atlas');
    await shot(page,'journey-six-envelopes');

    await button(page,'Edit checkpoints and opening times').click();
    const first=page.getByRole('group',{name:'Envelope 1',exact:true});
    await first.getByLabel('Checkpoint name').fill('On the doorstep');
    await first.getByLabel('Set a custom opening time').check();
    await first.getByLabel('Opening time',{exact:true}).fill('2026-11-22T22:15');
    await button(page,'Save opening times').click();
    await envelope(page,1).waitFor();
    assert.match(await envelope(page,1).getAttribute('aria-label'),/On the doorstep, Not written/);

    await envelope(page,1).focus();
    await page.keyboard.press('Enter');
    await writing(page).fill(sentence);
    await button(page,'Bold').click();
    await button(page,'Add page').click();
    await writing(page).fill('A second page to fold away.');
    await button(page,'Paper').click();
    await page.getByLabel('Stationery').selectOption('handmade');
    await button(page,'Envelope').click();
    await page.getByLabel(/^Material/).selectOption('linen');
    await button(page,'Writing').click();
    await shot(page,'journey-letter-studio','.jl-letter-stage');
    await button(page,'Save and return to journey').click();
    assert.match(await envelope(page,1).getAttribute('aria-label'),/Draft/);
    assert.equal(await envelope(page,1).evaluate(element=>document.activeElement===element),true);
    await page.reload();
    await selectJourney(page,choices.long.name);
    await envelope(page,1).click();
    assert.equal(await writing(page).inputValue(),sentence);
    await button(page,'Seal letter').click();
    await button(page,'Skip animation').click();
    assert.equal(await button(page,'Waiting for its day').isDisabled(),true);
    assert.match(await page.locator('[data-countdown]').innerText(),/2h 15m/);
    assert.equal(await page.getByText(sentence,{exact:true}).count(),0);
    await shot(page,'journey-locked-envelope','.jl-letter-stage');
    await page.clock.setFixedTime(new Date('2026-11-22T17:16:00Z'));
    await button(page,'Release the seal').click();
    await page.getByRole('status').filter({hasText:'Unfolding the letter'}).waitFor();
    await page.getByText(sentence,{exact:true}).waitFor();
    await shot(page,'journey-opened-letter','.jl-letter-stage');
    await button(page,'Next page →').click();
    await page.getByText('A second page to fold away.',{exact:true}).waitFor();
    await button(page,'← Back to journey').click();
    assert.match(await envelope(page,1).getAttribute('aria-label'),/Opened/);
    await page.clock.setFixedTime(new Date('2026-11-22T22:30:00Z'));
    await page.waitForFunction(()=>document.querySelector('#jl-progress').value===50);
    await button(page,'Prepare letters').click();
    const download=page.waitForEvent('download');
    await button(page,'Export journey').click();
    const backup=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));
    assert.equal(backup.journey.checkpoints[0].letter.state,'opened');
    await button(page,'Duplicate as drafts').click();
    await page.getByText(choices.long.name+' (copy)',{exact:true}).waitFor();
    assert.match(await envelope(page,1).getAttribute('aria-label'),/Draft/);
    await button(page,'Delete journey').click();
    await page.getByRole('dialog').getByText(/separate Letter Box/).waitFor();
    await button(page,'Keep journey').click();
    await button(page,'Delete journey').click();
    await button(page,'Delete journey and its letters').click();
    await button(page,'Open journey '+choices.long.name).waitFor();
    assert.equal(await button(page,'Open journey '+choices.long.name+' (copy)').count(),0);
    await upload(page,backup);
    await envelope(page,1).waitFor();
    assert.match(await envelope(page,1).getAttribute('aria-label'),/Opened/);
    await button(page,'← Your journeys').click();
    await summary(page,choices.short);
    await saveJourney(page);
    await page.locator('.jl-map svg').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!!document.querySelector('.jl-map svg[data-intro="true"]'));
    await page.waitForFunction(()=>!document.querySelector('.jl-map svg').hasAttribute('data-intro'));
    await shot(page,'journey-short-route','.jl-atlas');

    const stale=await context.newPage();
    await stale.clock.setFixedTime(beforeFlight);
    await openWorkspace(stale);
    await selectJourney(stale,choices.short.name);
    await button(stale,'Edit journey details').click();
    await stale.getByLabel('Journey name').fill('Stale tab copy');
    await button(stale,'Review journey').click();
    await button(page,'Edit journey details').click();
    await page.getByLabel('Journey name').fill('Paris saved from another tab');
    await button(page,'Review journey').click();
    await button(page,'Save journey details').click();
    await envelope(page,1).waitFor();
    await button(stale,'Save journey details').click();
    await stale.getByRole('alert').filter({hasText:'Another tab changed this journey'}).waitFor();
    await stale.close();

    await page.evaluate(()=>{
      const original=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){
        if(this.name==='catalog')throw new DOMException('Fictional quota failure','QuotaExceededError');
        return original.apply(this,args);
      };
    });
    await button(page,'Edit journey details').click();
    await page.getByLabel('Journey name').fill('This write should roll back');
    await button(page,'Review journey').click();
    await button(page,'Save journey details').click();
    await page.getByRole('alert').filter({hasText:'last saved journey is intact'}).waitFor();
    await page.reload();
    await selectJourney(page,'Paris saved from another tab');

    await page.goto(base+'/letters');
    await button(page,'Write a letter').click();
    await writing(page).fill('Standalone Letter Box writing.');
    await button(page,'Save and return to box').click();
    await page.getByRole('link',{name:'Explore Journey Letters'}).click();
    await button(page,'Open journey Paris saved from another tab').click();
    await button(page,'Delete journey').click();
    await button(page,'Delete journey and its letters').click();
    await page.getByRole('link',{name:'← Back to Letters'}).click();
    await button(page,'Lift the lid').click();
    await page.locator('.lt-letter-grid li > button:first-child').first().click();
    assert.equal(await writing(page).inputValue(),'Standalone Letter Box writing.');
    await context.close();
    console.log('Desktop: two routes, opening times, Studio, sealing and opening, storage, backups, rollback and stale tabs, and Letter Box isolation.');

    for (const [width,height] of [[820,1180],[390,844],[320,760]]) {
      const device=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce',timezoneId:'Asia/Karachi'});
      const mobile=await device.newPage();
      mobile.on('pageerror',error=>errors.push(error.message));
      await mobile.clock.setFixedTime(beforeFlight);
      await openWorkspace(mobile);
      await upload(mobile,completedFixture());
      await envelope(mobile,1).waitFor();
      assert.equal(await mobile.locator('.jl-map svg').getAttribute('data-intro'),null);
      assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth),width);
      assert.match(await mobile.locator('.jl-progress').innerText(),/Arrived · 100%/);
      await mobile.getByText('All six letters have found their way to you.').waitFor();
      if(width===820)await shot(mobile,'journey-completed');
      if(width===390)await shot(mobile,'journey-mobile');
      await button(mobile,'Opening view').click();
      if(width<600)await envelope(mobile,6).tap();else await envelope(mobile,6).click();
      await button(mobile,'Release the seal').click();
      await mobile.getByText('I thought of you at every turn.',{exact:true}).waitFor();
      assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth),width);
      await device.close();
    }
    const offline=await browser.newContext({reducedMotion:'reduce'});
    const manual=await offline.newPage();
    await openWorkspace(manual);
    await offline.setOffline(true);
    await button(manual,'Create a journey').click();
    await manual.getByLabel('Journey name').fill('A manual journey');
    await manual.getByLabel('Departure city name').fill('Tiny Harbor');
    await manual.getByLabel('Arrival city name').fill('Hill Town');
    await manual.getByLabel('Departure time zone').fill('Asia/Kathmandu');
    await manual.getByLabel('Arrival time zone').fill('Asia/Karachi');
    await manual.getByLabel('Departure time',{exact:true}).fill('2026-11-22T18:00');
    await manual.getByLabel('Arrival time',{exact:true}).fill('2026-11-22T16:00');
    await button(manual,'Review journey').click();
    await manual.getByRole('alert').filter({hasText:'Arrival must occur after departure'}).waitFor();
    await manual.getByLabel('Arrival time',{exact:true}).fill('2026-11-22T20:00');
    await button(manual,'Review journey').click();
    await saveJourney(manual);
    await manual.getByText('Schematic route · locations shown as text').waitFor();
    await offline.close();
    assert.deepEqual(errors,[]);
    console.log('Tablet and phones: 820, 390, and 320 px without overflow, correct completed states in another time zone, touch, and reduced motion. Manual journey saved offline.');
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
