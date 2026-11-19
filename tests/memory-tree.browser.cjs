const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { chromium } = require(process.env.MEMORY_TREE_PLAYWRIGHT || 'playwright');
const load = require('./load-book-model.cjs');
const { initialSettings, newTree } = load('./memory-tree');
const base = process.env.MEMORY_TREE_URL || 'http://127.0.0.1:3002';

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.MEMORY_TREE_CHROMIUM,
    args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox'],
  });
  const errors = [];
  try {
    async function session(options = {}, disableGraphics = false) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
      await context.addInitScript(() => {
        const prototype = WebGLRenderingContext.prototype;
        const read = prototype.readPixels;
        const draw = prototype.drawArrays;
        window.gardenPicks = [];
        window.gardenFrames = [];
        prototype.readPixels = function (...args) {
          read.apply(this, args);
          const bytes = args.at(-1);
          window.gardenPicks.push(bytes[0] + 256 * bytes[1] + 65536 * bytes[2]);
        };
        prototype.drawArrays = function (...args) {
          draw.apply(this, args);
          if (!this.getParameter(this.FRAMEBUFFER_BINDING)) window.gardenFrames.push(performance.now());
        };
      });
      const page = await context.newPage();
      if (disableGraphics) await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === 'webgl' ? null : getContext.call(this, type, ...args);
        };
      });
      page.setDefaultTimeout(8000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && /webgl|hydration/i.test(message.text())) errors.push(message.text());
      });
      const response = await page.goto(base + '/memory-tree');
      assert.equal(response.status(), 200);
      return page;
    }

    const page = await session();
    const btn = (name, scope = page) => scope.getByRole('button', { name, exact: true });
    const dialog = page.getByRole('dialog');
    const heading = page.locator('#mt-selected-title');
    const canvas = page.locator('.mt-stage canvas');
    async function openMenu(name) {
      const summary = page.locator('summary').filter({hasText:name});
      if (!await summary.evaluate(el => el.parentElement.open)) await summary.click();
    }
    async function centeredLeaf(expected, via) {
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      const rect = await canvas.boundingBox();
      const picks = [];
      // The live blade sways by a few pixels even while its attachment remains centered.
      for (const [x,y] of [[0,0],[8,0],[-8,0],[0,8],[0,-8],[8,8],[-8,-8],[8,-8],[-8,8]]) {
        await page.evaluate(() => {window.gardenPicks.length=0;});
        await canvas.dispatchEvent('pointermove', {pointerType:'mouse',clientX:rect.x+rect.width/2+x,clientY:rect.y+rect.height/2+y});
        picks.push(await page.evaluate(() => window.gardenPicks.at(-1)));
        if (picks.at(-1)===expected) return;
        await page.waitForTimeout(118);
      }
      if (process.env.MEMORY_TREE_SCREENSHOTS) await canvas.screenshot({path:path.join(process.env.MEMORY_TREE_SCREENSHOTS,'studio-focus-'+via+'.png')});
      assert.fail(via+' should move the selected leaf to the center of the rendered view. Picks: '+picks.join(', '));
    }
    const waitView = async name => {
      await btn(name).click();
      await page.waitForFunction(name => document.querySelector('.mt-toolbar [aria-pressed=true]')?.textContent === name, name);
      await page.waitForFunction(() => !document.querySelector('.mt-toolbar button:disabled'));
    };
    await btn('Plant a tree').click();
    await dialog.getByLabel('Tree name').fill('Isolated orchard');
    await dialog.getByLabel('When your story began').fill('2020-02-29');
    await btn('Plant this tree', dialog).click();
    await btn('Replay planting').waitFor();
    await page.getByText('Seed · Flowering cherry').waitFor();
    await btn('Skip growth').click();

    async function add(title, date, withPhoto = false) {
      await btn('Add a memory').click();
      await dialog.getByLabel('Title', { exact: true }).fill(title);
      await dialog.getByLabel('Date', { exact: true }).fill(date);
      await dialog.getByLabel('Story', { exact: true }).fill('A synthetic memory for the garden.');
      await dialog.getByLabel(/^Chapter/).selectOption('branch-0');
      if (withPhoto) {
        await dialog.locator('summary').click();
        await dialog.getByLabel('Special milestone').check();
        await dialog.getByLabel('Repeat annually').check();
        await dialog.getByLabel('Photographs').setInputFiles(path.join(__dirname, 'fixtures', 'book-photo.png'));
        await dialog.locator('img').waitFor();
      }
      await btn('Save memory', dialog).click();
      await heading.and(page.getByRole('heading', { name:title,exact:true })).waitFor();
    }
    await add('Leap day picnic', '2020-02-29', true);
    await page.getByText('Sprout · Flowering cherry').waitFor();
    await btn('Skip growth').click();
    await add('Another cup of tea', '2020-02-29');
    await btn('Skip growth').click();
    await waitView('Calendar');
    assert.equal(await page.getByRole('button', { name: 'February 29, 2020, 2 memories' }).getAttribute('aria-pressed'), 'true');
    const calendarList = page.getByRole('region', { name: 'Calendar and day memories' });
    await calendarList.getByRole('button', { name: /Leap day picnic/ }).click();
    await heading.filter({hasText:'Leap day picnic'}).waitFor();
    await page.locator('.mt-keepsake img').waitFor();
    await calendarList.getByRole('button', { name: /Another cup of tea/ }).click();
    await page.locator('.mt-keepsake').getByRole('button', { name:'Find this leaf ↗', exact:true }).click();
    await centeredLeaf(2,'Calendar');
    await waitView('Calendar');
    await page.locator('.mt-calendar').getByLabel('Year').selectOption('2026');
    await page.getByRole('button', { name: 'February 28, 2026, 1 memory' }).click();
    assert.equal(await page.getByRole('button', { name: 'February 28, 2026, 1 memory' }).getAttribute('aria-pressed'), 'true');
    await waitView('Timeline');
    await page.locator('.mt-timeline-memory').getByRole('button', { name: 'Find this leaf ↗', exact: true }).first().click();
    await btn('Zoom in').waitFor();
    await centeredLeaf(1,'Timeline');
    await btn('Edit').click();
    await dialog.getByLabel('Title', { exact: true }).fill('Renamed picnic');
    await btn('Save memory', dialog).click();
    await heading.filter({hasText:'Renamed picnic'}).waitFor();
    await btn('Duplicate').click();
    await btn('Save memory', dialog).click();
    await heading.filter({hasText:'Renamed picnic (copy)'}).waitFor();
    await btn('Skip growth').click();
    await btn('Delete').click();
    await btn('Delete memory', dialog).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.mt-rows').getByText('Renamed picnic (copy)', { exact: true }).count(), 0);

    await openMenu('Tree options');
    await btn('Chapters').click();
    await dialog.getByLabel('Chapter 1 name').fill('The beginnings');
    await btn('Move The beginnings down', dialog).click();
    await btn('Add a chapter', dialog).click();
    await btn('Save chapters', dialog).click();
    await dialog.waitFor({ state: 'hidden' });
    await openMenu('Tree options');
    await btn('Appearance').click();
    await dialog.getByLabel('Tree species').selectOption('willow');
    await dialog.getByLabel('Season').selectOption('winter');
    assert.equal(await dialog.getByLabel('Garden', {exact:true}).count(),0);
    await btn('Save appearance', dialog).click();
    await page.getByText('Sapling · Weeping willow').waitFor();
    await openMenu('View options');
    await btn('Pause motion').click();
    await btn('Resume motion').waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Isolated orchard' }).waitFor();
    await openMenu('View options');
    await btn('Resume motion').waitFor();
    await page.locator('.mt-rows').getByText('Renamed picnic').waitFor();
    assert.equal(await page.locator('.mt-rows li').count(), 2);
    assert.equal(await page.locator('.mt-filters select option').filter({hasText:'The beginnings'}).count(), 1);
    await openMenu('Tree options');
    const pending = page.waitForEvent('download');
    await btn('Export tree').click();
    const download = await pending;
    const backup = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.equal(backup.memories.length, 2);
    assert.equal(backup.memories.find(m => m.title === 'Renamed picnic').photos.length, 1);
    assert.equal(backup.settings.species, 'willow');
    assert.equal(backup.settings.season, 'winter');
    assert.equal(backup.settings.paused, true);
    await page.getByLabel('Import Memory Tree backup').setInputFiles({
      name: 'garden.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({...backup,
        settings:{...backup.settings,garden:'rain',name:'Imported orchard'}})),
    });
    await page.getByRole('heading', { name: 'Imported orchard' }).waitFor();
    assert.equal(await page.getByLabel('Choose a saved tree').locator('option').count(), 2);
    await page.locator('.mt-specimen canvas').waitFor();
    assert.equal(await page.locator('.mt-rain,.mt-stars,.mt-sky').count(),0);
    await openMenu('Tree options');
    const legacy = page.waitForEvent('download');
    await btn('Export tree').click();
    assert.equal(JSON.parse(await fs.readFile(await (await legacy).path(),'utf8')).settings.garden,'rain');

    // The example runs in isolated state. A real pointer hits rendered geometry.
    await btn('Explore the example').click();
    await page.getByRole('heading', { name: 'The Orchard Years' }).waitFor();
    await openMenu('View options');
    await btn('Pause motion').click();
    await page.locator('summary').filter({hasText:'View options'}).click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.gardenFrames.length > 0);
    let picked = 0;
    for (const angle of [0, 1]) {
      if (angle) {
        await btn('Reset').click();
        await btn('Rotate right').click(); await btn('Rotate right').click();
        await canvas.scrollIntoViewIfNeeded();
      }
      const size = await canvas.boundingBox();
      let hits = 0;
      const tip = page.locator('.mt-tooltip');
      for (let y=.26; y<=.67 && !hits; y+=.035) {
        for (let x=.30; x<=.70 && !hits; x+=.026) {
          await page.evaluate(() => {window.gardenPicks.length = 0;});
          await canvas.dispatchEvent('pointermove', {pointerType:'mouse',clientX:size.x+size.width*x,clientY:size.y+size.height*y});
          const hit = await page.evaluate(() => window.gardenPicks.at(-1));
          if (hit >= 1 && hit <= 32 && hit !== picked) {
            const title = await tip.evaluate(el => el.firstChild.textContent);
            await page.mouse.click(size.x+size.width*x,size.y+size.height*y);
            await heading.and(page.getByRole('heading', {name:title,exact:true})).waitFor({timeout:2500});
            picked = hit; hits++;
          }
          if (hit !== undefined) await page.waitForTimeout(114);
        }
      }
      assert.ok(hits, 'expected a leaf hit at orbit angle ' + angle);
    }
    await btn('Reset').click();
    if (process.env.MEMORY_TREE_SCREENSHOTS) await page.locator('.mt-stage').screenshot({path:path.join(process.env.MEMORY_TREE_SCREENSHOTS,'studio-interactive-desktop.png')});
    console.log('Desktop planting, leaf picks from two angles, calendar/anniversary, timeline, photo, editing, duplication, deletion, chapters, appearance, persistence, backup verified.');

    const tablet = await session({ viewport: { width: 820, height: 1180 } });
    const phone = await session({ viewport: { width: 390, height: 844 }, isMobile:true, hasTouch:true, reducedMotion:'reduce' });
    for (const device of [tablet, phone]) {
      await btn('Explore the example', device).click();
      await btn('Zoom in', device).waitFor();
      assert.ok(await device.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await btn('Calendar', device).click();
      assert.ok(await device.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await btn('Tree', device).click();
      const stage=device.locator('.mt-stage');
      if(device===phone){
        assert.equal(await stage.getAttribute('data-motion'),'false');
        const touchSession=await device.context().newCDPSession(device), drawing=stage.locator('canvas');
        await drawing.scrollIntoViewIfNeeded();
        const before=await drawing.screenshot();
        const area=await drawing.boundingBox(), start=buffer=>touchSession.send('Input.dispatchTouchEvent',{type:buffer.type,touchPoints:buffer.points});
        const y=Math.round(area.y+area.height*.45),x=Math.round(area.x+area.width*.5);
        await start({type:'touchStart',points:[{x:x-35,y,id:1},{x:x+35,y,id:2}]});
        await start({type:'touchMove',points:[{x:x-80,y:y+14,id:1},{x:x+77,y:y+18,id:2}]});
        await start({type:'touchEnd',points:[]});
        await device.waitForTimeout(60);
        const after=await stage.locator('canvas').screenshot();
        assert.ok(!before.equals(after), 'two-finger gesture should move the camera');
        await btn('Reset',device).click();
      }
      if (process.env.MEMORY_TREE_SCREENSHOTS) await stage.screenshot({path:path.join(process.env.MEMORY_TREE_SCREENSHOTS,device===phone?'studio-interactive-mobile.png':'studio-interactive-tablet.png')});
    }
    console.log('Tablet and mobile viewports, calendar layout, touch pinch and pan input, reduced motion verified.');

    const fallback=await session({},true);
    await btn('Explore the example',fallback).click();
    await fallback.getByText(/3D graphics are unavailable/).waitFor();
    await fallback.locator('.mt-rows').getByRole('button',{name:/The long way home/}).click();
    await fallback.locator('#mt-selected-title').filter({hasText:'The long way home'}).waitFor();
    assert.equal(await btn('Zoom in',fallback).count(),0);
    console.log('The journal remains usable when WebGL is disabled.');

    const profile = await session({ viewport:{width:1000,height:750} });
    for (const count of [1,10,50,100,500,1000]) {
      const tree = newTree({...initialSettings,name:'Profile '+count,season:'spring'},'performance',524289);
      tree.nextLeaf=count;
      tree.memories=Array.from({length:count},(_,slot)=>({
        id:'leaf-'+slot,slot,title:'Synthetic memory '+slot,date:'2024-06-'+String(1+slot%28).padStart(2,'0'),
        time:'',location:'',story:'A walk near the river',chapterId:'branch-'+slot%6,tags:[],photos:[],
        favorite:false,milestone:slot%11===0,annual:false,
      }));
      const started=performance.now();
      await profile.getByLabel('Import Memory Tree backup').setInputFiles({
        name:'profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(tree)),
      });
      await profile.getByRole('heading',{name:'Profile '+count,exact:true}).waitFor();
      await btn('Rotate right',profile).waitFor();
      const loaded=performance.now()-started;
      await profile.evaluate(()=>{window.gardenFrames.length=0;});
      await btn('Rotate right',profile).click();
      await profile.waitForTimeout(650);
      const metrics=await profile.evaluate(()=>{
        const times=window.gardenFrames,intervals=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b);
        return {frames:times.length,p95:intervals[Math.min(intervals.length-1,Math.floor(intervals.length*.95))]};
      });
      assert.ok(metrics.frames>=3);
      console.log(count+' memories: '+loaded.toFixed(0)+' ms import to viewer, '+metrics.frames+' draw submissions in sample, p95 '+metrics.p95?.toFixed(1)+' ms.');
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
run().catch(error => {console.error(error);process.exitCode=1;});
