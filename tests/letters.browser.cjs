const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.LETTERS_PLAYWRIGHT || 'playwright');
const load = require('./load-book-model.cjs');
const { createLetter, makeBackup, sealLetter } = load('./letters');
const { voiceWav } = load('./book-voice');
const base = process.env.LETTERS_URL || 'http://127.0.0.1:3002';
const shots = process.env.LETTERS_SHOTS;
const testDate = new Date('2026-11-19T12:00:00.000Z');
const diary = 'My dearest,\n\nI still think of the morning we took the long way past the station.';

async function run() {
  const browser = await chromium.launch({ executablePath:process.env.LETTERS_CHROMIUM,
    args:['--use-fake-device-for-media-stream'] });
  const errors = [];
  try {
    async function windowAt(options={}){
      const context=await browser.newContext({ viewport:{width:1440,height:1050},timezoneId:'America/Los_Angeles',...options });
      const page=await context.newPage();
      page.setDefaultTimeout(8000);
      page.on('pageerror',error=>errors.push(error.message));
      await page.clock.setFixedTime(testDate);
      assert.equal((await page.goto(base+'/letters')).status(),200);
      await page.getByRole('button',{name:'Write a letter',exact:false}).first().waitFor();
      return page;
    }
    async function shot(page, name, selector) {
      if(!shots)return;
      await fs.mkdir(shots,{recursive:true});
      if(selector)await page.locator(selector).screenshot({path:path.join(shots,name+'.jpg'),type:'jpeg',quality:85});
      else await page.screenshot({path:path.join(shots,name+'.jpg'),type:'jpeg',quality:85});
    }
    const page=await windowAt();
    const button=(name,where=page)=>where.getByRole('button',{name,exact:true});
    const dialog=page.getByRole('dialog');
    const studio=page.locator('.lt-studio');
    const writing=()=>page.getByRole('textbox',{name:'Write on the letter'});
    const row=(title,where=page)=>where.locator(':is(.lt-letter-grid,.lt-letter-list) li>button:first-child').filter({hasText:title});
    const saved=()=>page.getByText('Draft saved on this device',{exact:true}).waitFor();

    assert.equal(await page.getByLabel('Import Letters backup').isVisible(),false);
    await shot(page,'letter-box-closed');
    await button('Lift the lid').click();
    await page.getByText('Make room for your first letter.').waitFor();
    await page.waitForTimeout(1200);
    await shot(page,'letter-box');
    await button('Collections').click();
    await button('Add collection',dialog).click();
    await dialog.getByLabel('Collection 4').fill('For the long weeks');
    await button('Save collections',dialog).click();
    await dialog.waitFor({state:'hidden'});
    await page.locator('.lt-box-filters option').filter({hasText:'For the long weeks'}).waitFor({state:'attached'});
    await button('Occasion stationery').click();
    await button('Anniversary',dialog).click();
    await studio.getByText('Letter Studio',{exact:true}).waitFor();
    await studio.getByLabel(/^Letter title/).fill('Our seventh anniversary');
    await studio.getByLabel(/^Collection/).selectOption('anniversaries');
    await writing().fill(diary);
    await writing().press('Control+Home');
    await writing().press('Shift+End');
    await button('Bold').click();
    await page.locator('.lt-page-words span[style*="700"]').filter({hasText:'My dearest,'}).waitFor();
    await button('Paper').click();
    await studio.getByLabel(/^Stationery/).selectOption('handmade');
    await studio.getByLabel('Watermark initials').fill('R+S');
    await studio.getByLabel('Ruled border').check();
    await studio.getByLabel(/^Decoration/).selectOption('branch');
    await button('Envelope').click();
    await studio.getByLabel('Recipient',{exact:true}).fill('Rosie');
    await studio.getByLabel('Sender',{exact:true}).fill('Sam');
    await studio.getByLabel('Front inscription').fill('For seven ordinary years with you');
    await studio.getByLabel('Stamp wording').fill('18 OCT');
    await studio.getByLabel('Decorative border').check();
    await button('Back').click();
    await studio.getByLabel(/^Flap shape/).selectOption('curved');
    await studio.getByLabel(/^Wax palette/).selectOption('#395748');
    await studio.getByLabel(/^Seal emblem/).selectOption('initials');
    await studio.getByLabel('Seal initials').fill('R+S');
    await studio.getByLabel('Botanical sprig').check();
    await studio.getByLabel('Ribbon',{exact:true}).check();
    await studio.getByLabel('Back inscription').fill('Love from the little kitchen');
    await button('Writing').click();
    await button('Add page').click();
    await writing().fill('Page two. Here is the picture I told you about.');
    await studio.getByLabel('Signature',{exact:true}).fill('All my love, Sam');
    await button('Extras').click();
    await studio.getByLabel('Page photograph').setInputFiles(path.join(__dirname,'fixtures','book-photo.png'));
    await studio.locator('.lt-page-photo img').waitFor();
    await studio.getByLabel('Photo caption').fill('The sitting room');
    await button('Draw on this page').click();
    const drawing = studio.locator('canvas');
    await drawing.scrollIntoViewIfNeeded();
    const draw = await drawing.boundingBox();
    await page.mouse.move(draw.x+draw.width*.4,draw.y+draw.height*.5);
    await page.mouse.down();
    await page.mouse.move(draw.x+draw.width*.6,draw.y+draw.height*.26,{steps:10});
    await page.mouse.up();
    await button('Finish drawing').click();
    await studio.locator('summary').filter({hasText:'Hidden message & date'}).click();
    await studio.getByLabel('Hidden message').fill('The first ticket is still in my wallet.');
    await studio.getByLabel('Special date').fill('2026-10-18');
    await studio.locator('summary').filter({hasText:'Voice recording'}).click();
    const audio=voiceWav(Float32Array.from({length:5600},(_,i)=>.3*Math.sin(i*.146)),'Synthetic voice fixture');
    await studio.getByLabel('Audio file').setInputFiles({
      name:'synthetic-voice.wav',mimeType:'audio/wav',buffer:Buffer.from(audio.data.split(',')[1],'base64'),
    });
    await studio.getByRole('status').filter({hasText:/synthetic-voice/}).waitFor();
    await studio.getByLabel('Transcript').fill('Here are a few seconds of synthetic test audio.');
    await saved();
    await page.reload();
    await row('Our seventh anniversary').click();
    await writing().waitFor();
    assert.equal(await writing().inputValue(),diary);
    await button('Next writing page').click();
    assert.match(await writing().inputValue(),/Page two/);
    assert.equal(await studio.locator('canvas').count(),1);

    await page.evaluate(()=>{
      window.letterTrace=[];
      function probe(at){
        const phase=document.querySelector('.lt-object')?.getAttribute('data-phase');
        if(phase&&phase!=='rest')window.letterTrace.push({at,phase});
        requestAnimationFrame(probe);
      }
      requestAnimationFrame(probe);
    });
    await button('Seal letter').click();
    await page.locator('.lt-object[data-phase=sealing]').waitFor();
    const flap=page.locator('.lt-env-flap');
    const closed=await flap.evaluate(el=>getComputedStyle(el).transform);
    await page.waitForTimeout(1400);
    assert.notEqual(await flap.evaluate(el=>getComputedStyle(el).transform),closed,'the envelope flap must hinge');
    await page.locator('.lt-object[data-phase=rest]').waitFor();
    await button('View front of envelope').click();
    await page.getByText('To Rosie · From Sam · For seven ordinary years with you',{exact:true}).waitFor();
    await button('View back of envelope').click();
    await page.getByText('Love from the little kitchen',{exact:true}).last().waitFor();
    await page.waitForTimeout(550);
    await shot(page,'sealed-envelope','.lt-reading-room');
    await button('Release the seal').click();
    await page.locator('.lt-object[data-phase=opening]').waitFor();
    const sheet=page.locator('.lt-sheet-carriage');
    const tucked=await sheet.evaluate(el=>getComputedStyle(el).transform);
    await page.waitForTimeout(1550);
    assert.notEqual(await sheet.evaluate(el=>getComputedStyle(el).transform),tucked,'the paper must emerge from the pocket');
    await page.waitForTimeout(550);
    await shot(page,'emerging-letter');
    await page.locator('.lt-reading-pages').waitFor();
    await button('Next page →').click();
    await page.getByRole('img',{name:'The sitting room'}).waitFor();
    await page.getByText('Unfold the little note',{exact:true}).click();
    await page.getByText('The first ticket is still in my wallet.',{exact:true}).waitFor();
    const voice=page.locator('.lt-voice-reader audio');
    assert.equal(await voice.evaluate(el=>el.paused),true,'voice must stay paused until requested');
    await voice.evaluate(el=>el.play());
    await button('Morning Sun').click();
    await page.getByRole('group',{name:'Reading environment'}).waitFor();
    await button('Candlelight').click();
    await page.locator('.lt-reading-table[data-scene=candle]').waitFor();
    await shot(page,'candlelight-letter','.lt-reading-room');
    await button('Rainy Afternoon').click();
    await page.locator('.lt-reading-table[data-scene=rain]').waitFor();
    await button('Pause scene motion').click();
    await button('Resume scene motion').waitFor();
    await button('Fold the letter away').click();
    await page.locator('.lt-object[data-phase=returning]').waitFor();
    await button('Release the seal').waitFor();
    await button('Read without animation').click();
    await button('Fold the letter away').click();
    await page.locator('.lt-object[data-phase=returning]').waitFor();
    await button('Skip animation').click();
    await button('Release the seal').waitFor();
    assert.equal(await page.locator('.lt-voice-reader audio').count(),0);
    const metrics=await page.evaluate(()=>{
      function measure(phase){
        const frames=window.letterTrace.filter(item=>item.phase===phase).map(item=>item.at);
        const intervals=frames.slice(1).map((t,i)=>t-frames[i]).sort((a,b)=>a-b);
        return {frames:frames.length,p95:intervals.length?Number(intervals[Math.floor(intervals.length*.95)].toFixed(1)):0};
      }
      return {sealing:measure('sealing'),opening:measure('opening')};
    });
    assert.ok(metrics.sealing.frames>30&&metrics.opening.frames>30);
    console.log('CSS animation frame callbacks at 1440 × 1050',JSON.stringify(metrics));

    await button('Organize letter').click();
    await dialog.getByLabel('Favorite').check();
    await button('Save organization',dialog).click();
    await button('← Back to Letter Box').click();
    await button('Favorites').click();
    await row('Our seventh anniversary').waitFor();
    await button('Use list view').click();
    await page.locator('.lt-letter-list').waitFor();
    await page.getByLabel('Find a letter').fill('Rosie');
    await row('Our seventh anniversary').waitFor();
    await button('Organize Our seventh anniversary').click();
    const incoming=page.waitForEvent('download');
    await button('Export letter',dialog).click();
    const exported=JSON.parse(await fs.readFile(await (await incoming).path(),'utf8'));
    assert.equal(exported.letters[0].pages.length,2);
    assert.equal(exported.letters[0].pages[1].drawing.length,1);
    assert.equal(exported.letters[0].state,'opened');
    assert.ok(exported.letters[0].voice.data.startsWith('data:audio/wav'));
    await dialog.getByLabel('Archived').check();
    await button('Save organization',dialog).click();
    await button('Archived').click();
    await row('Our seventh anniversary').waitFor();
    await button('Organize Our seventh anniversary').click();
    await button('Duplicate as draft',dialog).click();
    await studio.getByLabel('Letter title',{exact:true}).waitFor();
    assert.match(await studio.getByLabel('Letter title',{exact:true}).inputValue(),/copy/);
    await button('Save and return to box').click();

    const labels=['you miss me','you can’t sleep','you need a hug','you are proud','it has been a long day','you need to laugh','there is good news'];
    const entries=labels.map((label,index)=>{
      const doc=createLetter('when',undefined,testDate.valueOf(),'UTC');
      doc.title='Envelope '+(index+1);
      doc.label=label;doc.collectionId='seven';doc.pages[0].text='A little note for when '+label+'.';
      return sealLetter(doc,testDate.valueOf());
    });
    const bundle=makeBackup(entries,[{id:'seven',name:'Seven little envelopes'}]);
    async function backup(value){
      await page.getByLabel('Import Letters backup').setInputFiles({
        name:'letters.dear-letters.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value)),
      });
    }
    await backup(exported);
    await page.waitForFunction(()=>document.querySelectorAll('.lt-letter-list li').length===2);
    await backup(bundle);
    await button('Open When').click();
    await row('Envelope 7').waitFor();
    assert.equal(await page.locator('.lt-letter-list li').count(),7);
    await page.locator('.lt-box-filters').getByLabel(/^Collection/).selectOption({label:'Seven little envelopes'});
    const group=page.waitForEvent('download');
    await button('Export this collection ↗').click();
    const exportedGroup=JSON.parse(await fs.readFile(await (await group).path(),'utf8'));
    assert.equal(exportedGroup.letters.length,7);
    await backup({format:'bad-backup'});
    await page.getByRole('alert').filter({hasText:/saved letters were kept/}).waitFor();
    assert.equal(await page.locator('.lt-letter-list li').count(),7);
    await row('Envelope 1').click();
    await page.getByText('Open when you miss me',{exact:true}).waitFor();
    await button('Read without animation').click();
    await page.getByText('A little note for when you miss me.',{exact:true}).waitFor();
    await button('← Back to Letter Box').click();
    await button('Letters to Tomorrow').click();
    await button('Write a Letter to Tomorrow').click();
    await studio.getByLabel('Letter title',{exact:true}).fill('Birthday in a repeated hour');
    await writing().fill('Enjoy this day, even when it begins twice.');
    await studio.getByLabel(/^Opening time zone/).selectOption('America/New_York');
    await studio.getByLabel('Intended opening time').fill('2027-03-14T02:30');
    await studio.getByText('That local time does not exist. Choose a different time.').waitFor();
    await button('Seal letter').click();
    await studio.getByRole('alert').filter({hasText:/daylight-saving change/}).waitFor();
    await studio.getByLabel('Intended opening time').fill('2027-11-07T01:30');
    await studio.getByLabel(/^This hour occurs twice/).selectOption('later');
    await button('Seal letter').click();
    await button('Skip animation').click();
    assert.equal(await button('Waiting for its day').isDisabled(),true);
    assert.match(await page.locator('.lt-release').textContent(),/UTC−05:00/);
    await page.clock.setFixedTime(new Date('2027-11-07T06:31:00Z'));
    await button('Release the seal').waitFor();
    await button('Read without animation').click();
    await page.getByText('Enjoy this day, even when it begins twice.',{exact:true}).waitFor();
    await button('Unseal and edit').click();
    await button('Return to Studio',dialog).click();
    await writing().waitFor();
    assert.equal(await writing().inputValue(),'Enjoy this day, even when it begins twice.');
    await button('Save and return to box').click();
    const journeyLink=page.getByRole('link',{name:'Explore Journey Letters'});
    assert.equal(await journeyLink.getAttribute('href'),'/journey-letters');
    await journeyLink.click();
    await page.getByRole('heading',{name:'Until We Meet Again.'}).waitFor();
    console.log('Desktop letter and collection workflows, timed release, backup import, and the Journey Letters entry passed.');

    // Separate browser contexts keep every synthetic letter away from the workspace owner's storage.
    const tablet=await windowAt({viewport:{width:820,height:1180}});
    const phone=await windowAt({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    for(const screen of [tablet,phone]){
      assert.ok(await screen.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await button('Open an example',screen).click();
      await button('View back of envelope',screen).click();
      if(screen===phone)await button('Release the seal',screen).tap();
      else await button('Read without animation',screen).click();
      await screen.locator('.lt-reading-pages').waitFor({timeout:screen===phone?1700:8000});
      await screen.getByText('Unfold the little note',{exact:true}).click();
      assert.ok(await screen.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(screen===phone){
        await screen.locator('.lt-table-bar').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
        await shot(screen,'mobile-reading');
      }
      await button('← Back to Letter Box',screen).click();
      await button('Write a letter',screen).click();
      const field=screen.getByRole('textbox',{name:'Write on the letter'});
      await field.fill('A small note from a small screen.');
      await button('Save and return to box',screen).click();
      await row('Untitled letter',screen).click();
      assert.equal(await field.inputValue(),'A small note from a small screen.');
      assert.ok(await screen.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(screen===phone){
        await button('Paper',screen).tap();
        await screen.getByLabel(/^Stationery/).selectOption('pink');
        await button('Seal letter',screen).tap();
        await button('Release the seal',screen).tap();
        await screen.locator('.lt-paper[data-paper=pink]').waitFor({timeout:1700});
        await screen.getByText('A small note from a small screen.',{exact:true}).waitFor();
      }
    }
    console.log('Tablet and phone writing, reading, wrapping, touch and reduced-motion flows passed.');

    const recorder=await windowAt({permissions:['microphone']});
    await button('Write a letter',recorder).click();
    await button('Extras',recorder).click();
    await recorder.locator('summary').filter({hasText:'Voice recording'}).click();
    await button('Record voice',recorder).click();
    await button('Keep recording',recorder).waitFor();
    await recorder.waitForTimeout(550);
    await button('Keep recording',recorder).click();
    await recorder.locator('.lt-voice-controls audio').waitFor();
    await button('Save and return to box',recorder).click();
    await row('Untitled letter',recorder).waitFor();
    console.log('Explicit microphone capture passed using Chromium’s synthetic audio device.');

    const conflict=await windowAt();
    await button('Write a letter',conflict).click();
    const original=conflict.getByRole('textbox',{name:'Write on the letter'});
    await original.fill('First version.');
    await button('Save and return to box',conflict).click();
    const stale=await conflict.context().newPage();
    stale.setDefaultTimeout(8000);
    await stale.goto(base+'/letters');
    await row('Untitled letter',stale).click();
    await row('Untitled letter',conflict).click();
    await original.fill('Current saved version.');
    await button('Save and return to box',conflict).click();
    await stale.getByRole('textbox',{name:'Write on the letter'}).fill('Conflicting draft stays open.');
    await stale.getByRole('alert').filter({hasText:/Another tab changed/}).waitFor();
    await button('Export this draft',stale).waitFor();
    await row('Untitled letter',conflict).click();
    assert.equal(await original.inputValue(),'Current saved version.');
    console.log('Conflicting browser writes kept the committed letter and exposed a recovery export.');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
