const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.MEMORY_TREE_PLAYWRIGHT || 'playwright');

const output = process.env.MEMORY_TREE_SCREENSHOTS;
const base = process.env.MEMORY_TREE_URL || 'http://127.0.0.1:3002';
const route = base + '/memory-tree/experiment';
const quick = process.argv.includes('--frame');
const record = process.argv.includes('--record');
const clipOnly = process.argv.includes('--clip');
async function recordScene(canvas){
  await canvas.scrollIntoViewIfNeeded();
  const clip=await canvas.evaluate(async c=>{
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const stream=c.captureStream(30), chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});
    const done=new Promise(resolve=>{recorder.onstop=resolve;});
    const first=new Promise(resolve=>{
      recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);resolve();}};
    });
    try{
      recorder.start(500);
      // The encoder can take seconds to produce its first frame on a cold GPU.
      // Time the daylight hold and both transitions from actual encoded video.
      await Promise.race([first,wait(25000).then(()=>{throw Error('No encoded canvas frames');})]);
      for(const mode of ['Sunset','Night']){
        await wait(4500);
        [...document.querySelectorAll('button')].find(b=>b.textContent===mode).click();
      }
      await wait(4500);
      recorder.stop();await done;
      return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(chunks,{type:'video/webm'}));});
    } finally {
      if(recorder.state!=='inactive')recorder.stop();
      stream.getTracks().forEach(t=>t.stop());
    }
  });
  await fs.writeFile(path.join(output,'living-landscape.webm'),Buffer.from(clip,'base64'));
}
async function run(){
  const browser=await chromium.launch({executablePath:process.env.MEMORY_TREE_CHROMIUM, args:['--enable-webgl','--enable-unsafe-swiftshader','--disable-background-timer-throttling']});
  try {
    if(output)await fs.mkdir(output,{recursive:true});
    const results=[];
    const errors=[];
    for(const [label,width,height,dpr] of quick?[['desktop',1440,960,1]]:[['desktop',1440,960,1],['phone',390,844,2]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,isMobile:label==='phone',hasTouch:label==='phone'});
      page.on('pageerror',e=>errors.push(e.message));
      assert.equal((await page.goto(route)).status(),200);
      await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
      const canvas=page.locator('canvas[data-ready=true]');
      await canvas.waitFor({timeout:45000});
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      if(clipOnly){assert.ok(output);await recordScene(canvas);return;}
      if(output){
        await canvas.screenshot({path:path.join(output,label+'-daylight.png')});
        await page.screenshot({path:path.join(output,label+'-page.png'),fullPage:true});
      }
      if(quick){await page.close();continue;}
      const metrics=await canvas.evaluate(async c=>{
        const gl=c.getContext('webgl2');
        const ext=gl.getExtension('WEBGL_debug_renderer_info');
        const gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
        const samples=[],gpuSamples=[],pending=[];
        const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
        // Bracket the real scene's synchronous render callback. Poll after GPU
        // completion, discard disjoint measurements, and avoid blocking gl.finish().
        const original=gl.viewport;
        let drawn=0;
        gl.viewport=function(...args){
          drawn++;
          if(timer && drawn%12===1){
            const q=gl.createQuery();
            gl.beginQuery(timer.TIME_ELAPSED_EXT,q);
            queueMicrotask(()=>{gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push(q);});
          }
          return original.apply(gl,args);
        };
        await new Promise(resolve=>{
          let first=0,prev=0;
          function tick(t){
            if(!first)first=t;
            if(prev)samples.push(t-prev);
            prev=t;
            if(timer && gl.getParameter(timer.GPU_DISJOINT_EXT)){
              pending.splice(0).forEach(q=>gl.deleteQuery(q));
            }else while(pending.length && gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
              const q=pending.shift();gpuSamples.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);
            }
            if(t-first>=4500)resolve();else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
        gl.viewport=original;
        pending.forEach(q=>gl.deleteQuery(q));
        const sorted=[...samples].sort((a,b)=>a-b);
        gpuSamples.sort((a,b)=>a-b);
        return {gpu,pixels:[c.width,c.height],samples:samples.length,drawn,fps:1000*drawn/samples.reduce((a,b)=>a+b,0),
          gpuSamples:gpuSamples.length,gpuMedianMs:gpuSamples[Math.floor(gpuSamples.length*.5)]??null,
          medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)]};
      });
      assert.ok(metrics.drawn>5,'The live scene must draw throughout the timing sample');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const details=page.getByText('Rendering details',{exact:true});
      await details.click();
      results.push({label,...metrics,geometry:await page.locator('details p').innerText()});
      await details.click();
      for(const mode of ['Sunset','Night']){
        await page.getByRole('button',{name:mode,exact:true}).click();
        await canvas.scrollIntoViewIfNeeded();
        await page.waitForTimeout(2400);
        if(output)await canvas.screenshot({path:path.join(output,label+'-'+mode.toLowerCase()+'.png')});
      }
      await page.getByRole('button',{name:'Daylight',exact:true}).click();
      await page.getByRole('button',{name:'Pause wind',exact:true}).click();
      await page.waitForTimeout(350);
      const paused=await canvas.screenshot();
      await page.waitForTimeout(350);
      assert.ok(paused.equals(await canvas.screenshot()),'Paused frame must be stable');
      await details.click();
      const stages=[];
      for(let i=0;i<7;i++){
        await page.getByRole('combobox').selectOption(String(i));
        await page.waitForFunction(n=>document.querySelector('canvas').getAttribute('aria-label').startsWith(n),
          ['Seed','Sprout','Sapling','Young tree','Growing tree','Mature tree','Flourishing tree'][i]);
        await page.waitForTimeout(150);
        stages.push(await page.locator('details p').innerText());
        if(output && label==='desktop')await canvas.screenshot({path:path.join(output,'growth-'+i+'.png')});
      }
      assert.equal(new Set(stages).size,7);
      results.at(-1).stages=stages;
      await details.click();
      await page.getByRole('button',{name:'Resume wind',exact:true}).click();
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForTimeout(250);
      const reduced=await canvas.screenshot();
      await page.waitForTimeout(350);
      assert.ok(reduced.equals(await canvas.screenshot()),'Reduced-motion frame must be stable');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.waitForTimeout(400);
      assert.ok(!reduced.equals(await canvas.screenshot()),'Wind must resume');
      if(output && record && label==='desktop')await recordScene(canvas);
      await page.close();
    }
    if(!quick){
      const page=await browser.newPage();
      await page.addInitScript(()=>{const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:orig.call(this,kind,...args)};});
      await page.goto(route);
      await page.getByText('Showing the original painting.',{exact:false}).waitFor();
      assert.ok(await page.getByRole('button',{name:'Daylight'}).isDisabled());
      assert.deepEqual(errors,[]);
      if(output)await fs.writeFile(path.join(output,'measurements.json'),JSON.stringify(results,null,2));
      console.log(JSON.stringify(results,null,2));
      console.log('PASS: real renderer, lights, stages, pause/resume, reduced motion, fallback, and viewport bounds.');
    }
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
