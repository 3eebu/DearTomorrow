const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { chromium } = require(process.env.MEMORY_TREE_PLAYWRIGHT || 'playwright');
const load = require('./load-book-model.cjs');
const { initialSettings, newTree } = load('./memory-tree');
const base = process.env.MEMORY_TREE_URL || 'http://127.0.0.1:3002';
const shots = process.env.MEMORY_TREE_SCREENSHOTS;

const btn = (where,name) => where.getByRole('button',{name,exact:true});
const painting = page => page.getByRole('group',{name:'Illustrated Memory Tree'});
const leaves = page => page.locator('.mt-ink-leaf');
const detail = page => page.locator('#mt-selected-title');
const leafAt = (page,slot) => page.locator('.mt-ink-leaf[data-slot="'+slot+'"]');

async function shot(page,name,selector) {
  if (!shots) return;
  await fs.mkdir(shots,{recursive:true});
  const options = {path:path.join(shots,name+'.png')};
  if (selector) await page.locator(selector).screenshot(options);
  else await page.screenshot(options);
}

async function openOptions(page) {
  const summary = page.locator('summary').filter({hasText:'Tree options'});
  if (!await summary.evaluate(el=>el.parentElement.open)) await summary.click();
}

async function importBackup(page,tree) {
  await page.getByLabel('Import Memory Tree backup').setInputFiles({
    name:'orchard.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(tree)),
  });
  await page.getByRole('heading',{name:tree.settings.name,exact:true}).waitFor();
}

function sample(count) {
  const tree = newTree({...initialSettings,name:'Illustrated orchard '+count,season:'spring'},'performance',524289);
  tree.nextLeaf=count;
  tree.memories=Array.from({length:count},(_,slot)=>({
    id:'leaf-'+slot,slot,title:'Synthetic memory '+slot,date:new Date(Date.UTC(2020,0,1)+
      Math.floor(2420-((count-slot)/count)**2*2380)*86_400_000).toISOString().slice(0,10),
    time:'',location:'',story:'A walk near the river.',chapterId:'branch-'+slot%6,tags:[],photos:[],
    favorite:false,milestone:slot%11===0,annual:false,
  }));
  return tree;
}

async function run() {
  const browser=await chromium.launch({ executablePath:process.env.MEMORY_TREE_CHROMIUM, args:['--disable-webgl'] });
  const errors=[];
  async function session(options={}) {
    const page=await browser.newPage({ viewport:{width:1440,height:1030}, ...options });
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push(error.message));
    assert.equal((await page.goto(base+'/memory-tree')).status(),200);
    await page.evaluate(()=>document.fonts.ready);
    return page;
  }
  try {
    const page=await session();
    const dialogue=page.getByRole('dialog');
    await btn(page,'Plant a tree').waitFor();
    await page.getByRole('heading',{name:'Every story begins somewhere.'}).waitFor();
    assert.equal(await leaves(page).count(),0);
    await shot(page,'empty-desktop');
    await btn(page,'Plant a tree').click();
    await dialogue.getByLabel('Tree name').fill('Isolated orchard');
    await dialogue.getByLabel('When your story began').fill('2020-02-29');
    await btn(dialogue,'Plant this tree').click();
    const seed=page.locator('.mt-ink-seed [data-growing=true]');
    await seed.waitFor();
    assert.ok(await seed.evaluate(el=>el.getAnimations().length>0));
    await seed.waitFor({state:'hidden'});
    await btn(page,'Replay planting').waitFor();
    await shot(page,'seed-desktop');

    async function add(title,date,photo=false) {
      await btn(page,'Add a memory').click();
      await dialogue.getByLabel('Title',{exact:true}).fill(title);
      await dialogue.getByLabel('Date',{exact:true}).fill(date);
      await dialogue.getByLabel('Story',{exact:true}).fill('A small moment worth keeping.');
      await dialogue.getByLabel(/^Chapter/).selectOption('branch-0');
      if(photo){
        await dialogue.locator('summary').click();
        await dialogue.getByLabel('Special milestone').check();
        await dialogue.getByLabel('Repeat annually').check();
        await dialogue.getByLabel('Photographs').setInputFiles(path.join(__dirname,'fixtures','book-photo.png'));
        await dialogue.locator('img').waitFor();
      }
      await btn(dialogue,'Save memory').click();
      await detail(page).filter({hasText:title}).waitFor();
    }
    await add('Leap day picnic','2020-02-29',true);
    await leafAt(page,0).locator('[data-growing=true]').waitFor();
    assert.ok(await leafAt(page,0).locator('[data-growing=true]').evaluate(el=>el.getAnimations().length>0));
    await btn(page,'Skip growth').click();
    assert.equal(await leaves(page).count(),1);
    await shot(page,'first-leaf','.mt-stage');
    await add('Another cup of tea','2020-02-29');
    await btn(page,'Skip growth').click();
    assert.equal(await leaves(page).count(),2);
    await leafAt(page,0).locator('.mt-leaf-pigment').click();
    assert.equal(await leafAt(page,0).getAttribute('aria-pressed'),'true');
    assert.equal(await detail(page).textContent(),'Leap day picnic');
    await page.waitForFunction(()=>document.activeElement?.id==='mt-selected-title');
    await page.locator('.mt-keepsake img').waitFor();

    await btn(page,'Calendar').click();
    assert.equal(await btn(page,'February 29, 2020, 2 memories').getAttribute('aria-pressed'),'true');
    await page.getByRole('region',{name:'Calendar and day memories'}).getByRole('button',{name:/Another cup of tea/}).click();
    const keepsake=page.locator('.mt-keepsake');
    await btn(keepsake,'Find this leaf ↗').click();
    await painting(page).waitFor();
    assert.equal(await leafAt(page,1).getAttribute('aria-pressed'),'true');
    assert.equal(await leafAt(page,1).evaluate(el=>el===document.activeElement),true);
    await leafAt(page,1).press('ArrowLeft');
    assert.equal(await leafAt(page,0).evaluate(el=>el===document.activeElement),true);
    await leafAt(page,0).press('Enter');
    assert.equal(await detail(page).textContent(),'Leap day picnic');

    await btn(page,'Calendar').click();
    await page.locator('.mt-calendar').getByLabel('Year').selectOption('2026');
    await btn(page,'February 28, 2026, 1 memory').click();
    assert.equal(await detail(page).textContent(),'Leap day picnic');
    await btn(page,'Timeline').click();
    await page.locator('.mt-timeline-memory').getByRole('button',{name:'Find this leaf ↗',exact:true}).first().click();
    await painting(page).waitFor();
    assert.equal(await leafAt(page,0).getAttribute('aria-pressed'),'true');

    await btn(page,'Edit').click();
    await dialogue.getByLabel('Title',{exact:true}).fill('Renamed picnic');
    await btn(dialogue,'Save memory').click();
    await detail(page).filter({hasText:'Renamed picnic'}).waitFor();
    await btn(page,'Duplicate').click();
    await btn(dialogue,'Save memory').click();
    await detail(page).filter({hasText:'Renamed picnic (copy)'}).waitFor();
    await btn(page,'Skip growth').click();
    await btn(page,'Delete').click();
    await btn(dialogue,'Delete memory').click();
    await dialogue.waitFor({state:'hidden'});
    assert.equal(await leaves(page).count(),2);

    await openOptions(page);
    await btn(page,'Chapters').click();
    await dialogue.getByLabel('Chapter 1 name').fill('The beginnings');
    await btn(dialogue,'Move The beginnings down').click();
    await btn(dialogue,'Add a chapter').click();
    await btn(dialogue,'Save chapters').click();
    await dialogue.waitFor({state:'hidden'});
    await openOptions(page);
    await btn(page,'Appearance').click();
    await dialogue.getByLabel('Tree species').selectOption('willow');
    await dialogue.getByLabel('Season').selectOption('winter');
    await btn(dialogue,'Save appearance').click();
    await page.getByText('Sapling · Weeping willow').waitFor();
    await btn(page,'Pause motion').click();
    await btn(page,'Resume motion').waitFor();
    await page.reload();
    await btn(page,'Resume motion').waitFor();
    assert.equal(await leaves(page).count(),2);
    await detail(page).filter({hasText:'Renamed picnic'}).waitFor();

    await openOptions(page);
    const pending=page.waitForEvent('download');
    await btn(page,'Export tree').click();
    const backup=JSON.parse(await fs.readFile(await (await pending).path(),'utf8'));
    assert.equal(backup.memories.length,2);
    assert.equal(backup.memories.find(m=>m.title==='Renamed picnic').photos.length,1);
    assert.equal(backup.settings.species,'willow');
    assert.equal(backup.settings.season,'winter');
    assert.equal(backup.settings.paused,true);
    await importBackup(page,{...backup,settings:{...backup.settings,garden:'rain',name:'Imported orchard'}});
    await openOptions(page);
    assert.equal(await page.getByLabel('Choose a saved tree').locator('option').count(),2);
    const legacy=page.waitForEvent('download');
    await btn(page,'Export tree').click();
    assert.equal(JSON.parse(await fs.readFile(await (await legacy).path(),'utf8')).settings.garden,'rain');
    await btn(page,'Explore the example').click();
    await page.getByRole('heading',{name:'The Orchard Years'}).waitFor();
    assert.equal(await leaves(page).count(),32);
    const search=page.locator('.mt-filters input[type=search]');
    await search.fill('The long way home');
    assert.equal(await page.locator('.mt-ink-leaf[data-muted=true]').count(),31);
    await search.clear();
    assert.equal(await page.locator('.mt-ink-leaf[data-muted=true]').count(),0);
    assert.equal(await painting(page).locator('canvas').count(),0);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await shot(page,'example-desktop');
    console.log('Planting, leaf growth, pointer and keyboard selection, calendar, timeline, photos, edit, delete, chapters, appearance, reload, and backup verified.');

    for(const [width,height] of [[820,1180],[390,844],[320,760]]) {
      const device=await session({viewport:{width,height},hasTouch:width<600,isMobile:width<600,reducedMotion:'reduce'});
      await btn(device,'Explore the example').click();
      await painting(device).waitFor();
      assert.equal(await device.evaluate(()=>document.documentElement.scrollWidth),width);
      assert.equal(await device.locator('.mt-stage').getAttribute('data-motion'),'false');
      assert.equal(await painting(device).evaluate(el=>el.getAnimations({subtree:true}).length),0);
      await shot(device,'example-'+width);
      if(width<600) {
        const target=leafAt(device,29);
        const title=await target.locator('title').textContent();
        await target.locator('.mt-leaf-pigment').tap();
        await detail(device).filter({hasText:title}).waitFor();
      }
      await btn(device,'Calendar').click();
      assert.equal(await device.evaluate(()=>document.documentElement.scrollWidth),width);
      await device.close();
    }
    console.log('Tablet, 390 and 320 px phone layouts, touch selection, and reduced motion verified without WebGL.');

    const profile=await session({viewport:{width:1440,height:1030},reducedMotion:'reduce'});
    for(const count of [1,5,20,100,500,1000,2400]) {
      const start=performance.now();
      await importBackup(profile,sample(count));
      await profile.waitForFunction(total=>document.querySelectorAll('.mt-ink-leaf').length===total,count);
      await profile.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const time=Math.round(performance.now()-start);
      console.log(count+' memories: '+time+' ms from backup selection to SVG paint.');
      if([1,5,20,100,1000].includes(count)) await shot(profile,'stage-'+count,'.mt-stage');
      if(count===2400) {
        const zoom=btn(profile,'Zoom canopy');
        await zoom.click();
        const pane=profile.getByRole('region',{name:'Zoomed tree. Scroll to explore the canopy.'});
        await pane.waitFor();
        assert.ok(await pane.evaluate(el=>el.scrollWidth>=el.querySelector('svg').getBoundingClientRect().width&&el.scrollHeight>el.clientHeight));
        const selectedInPane=()=>{
          const pane=document.querySelector('.mt-specimen').getBoundingClientRect();
          const leaf=document.querySelector('.mt-ink-leaf[aria-pressed=true]').getBoundingClientRect();
          return leaf.left>=pane.left && leaf.top>=pane.top && leaf.right<=pane.right && leaf.bottom<=pane.bottom;
        };
        await profile.waitForFunction(selectedInPane);
        await profile.locator('.mt-filters input[type=search]').fill('Synthetic memory 2399');
        await profile.locator('.mt-rows').getByRole('button',{name:/Synthetic memory 2399/}).click();
        await btn(profile.locator('.mt-keepsake'),'Find this leaf ↗').click();
        assert.equal(await leafAt(profile,2399).getAttribute('aria-pressed'),'true');
        assert.equal(await leafAt(profile,2399).evaluate(el=>el===document.activeElement),true);
        await profile.waitForFunction(selectedInPane);
        await zoom.click();
        assert.equal(await zoom.getAttribute('aria-pressed'),'false');
      }
    }
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
