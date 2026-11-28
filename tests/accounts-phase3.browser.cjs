// Run against an isolated production build and an explicitly approved test Supabase project.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { readFile, writeFile } = require('node:fs/promises');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const loadBookModel = require('./load-book-model.cjs');
const { integrationTarget, loopbackOrigin } = require('./accounts-supabase-target.cjs');

const target = integrationTarget();
assert.ok(target, 'Configure the explicitly approved test project.');
const app = loopbackOrigin(process.env.ACCOUNTS_URL || 'http://127.0.0.1:3002');
assert.equal(process.env.DEAR_TOMORROW_APP_URL, app);
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, target.url);
const { chromium } = require(process.env.ACCOUNTS_PLAYWRIGHT || 'playwright');
const config = {auth:{autoRefreshToken:false,persistSession:false}};
const admin = createClient(target.url,target.secret,config);
const accounts = [];
const bucket = 'dear-tomorrow-private';
const results = {checks:{}, profile:[]};
const password = () => randomBytes(24).toString('base64url')+'!A9';
let stage = 'startup';

async function createIdentity(name, withPassword=true) {
  const email='dt-phase3-'+randomUUID()+'@example.test';
  const credentials=withPassword?{password:password()}:{};
  const {data,error}=await admin.auth.admin.createUser({email,...credentials,email_confirm:true,user_metadata:{display_name:name}});
  assert.ok(!error&&data.user.email===email, 'Fictional test identity could not be created.');
  const entry={id:data.user.id,email,...credentials};
  accounts.push(entry);
  return entry;
}

async function signIn(page,entry) {
  await page.goto(app+'/login');
  await page.getByLabel('Email address').fill(entry.email);
  await page.getByLabel('Password',{exact:true}).fill(entry.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL(/\/(welcome|my-space)$/);
  if(new URL(page.url()).pathname==='/welcome') {
    await page.getByRole('button',{name:'Enter My Space'}).click();
    await page.waitForURL('**/my-space');
  }
  assert.equal((await (await page.request.get(app+'/api/account-session')).json()).id,entry.id);
}

async function api(page,entry,data) {
  return page.request.post(app+'/api/private-space',{headers:{origin:app,'x-dear-account':entry.id},data});
}

async function json(response) {
  assert.equal(response.status(),200, (await response.json().catch(()=>({}))).error);
  return response.json();
}

function saveBody(kind,expected,changes,metadata={}) {
  return {action:'save',kind,expected,changes,removals:[],metadata};
}

async function put(page,entry,body) {
  const buffer=Buffer.from(JSON.stringify(body));
  if(buffer.length<=4_000_000)return json(await api(page,entry,body));
  const upload=randomUUID();
  const size=2_500_000;
  const parts=Math.ceil(buffer.length/size);
  for(let index=0;index<parts;index++) {
    const part=await page.request.post(app+'/api/private-space',{headers:{origin:app,'x-dear-account':entry.id,
      'content-type':'application/octet-stream','x-dear-transfer':upload,'x-dear-part':String(index)},
    data:buffer.subarray(index*size,(index+1)*size)});
    assert.deepEqual(await json(part),{staged:true});
  }
  const completion={action:'complete-upload',upload,parts};
  const saved=await json(await api(page,entry,completion));
  const replay=await api(page,entry,completion);
  assert.equal(replay.status(),409);
  return saved;
}

const percentile=(values,quantile)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*quantile)-1];
function summarize(samples) {
  return Object.fromEntries(Object.keys(samples[0]).map(key=>[key,{
    median:Math.round(percentile(samples.map(row=>row[key]),.5)),
    p95:Math.round(percentile(samples.map(row=>row[key]),.95)),
  }]));
}

async function profile(browser,storageState,entry,kind,label,count) {
  if(process.env.PHASE3_PROFILES&&!process.env.PHASE3_PROFILES.split(',').includes(kind+':'+label))return;
  stage='profiling '+label+' '+kind;
  const path=kind==='books'?'/memory-books?space=mine':'/memory-tree?space=mine';
  const baseline=[],candidate=[];
  for(let i=0;i<5;i++) {
    const context=await browser.newContext({storageState,viewport:{width:390,height:844},reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      const metrics={longest:0,collect:true};
      window.phaseMetrics=metrics;
      const observer=new PerformanceObserver(list=>{
        for(const task of list.getEntries())if(metrics.collect)metrics.longest=Math.max(metrics.longest,task.duration);
      });
      observer.observe({type:'longtask',buffered:true});
    });
    const page=await context.newPage();
    page.on('response',response=>{
      if(response.url().endsWith('/api/private-space')&&response.status()>=400) {
        console.error('Profile private API status '+response.status());
      }
    });
    const cdp=await context.newCDPSession(page);
    await page.goto(app+path,{waitUntil:'domcontentloaded'});
    const heading=kind==='books'?page.getByRole('heading',{name:new RegExp('Fictional '+label+' book')}):
      page.getByRole('heading',{name:'Your timeline',exact:true});
    try {
      if(kind==='books')await heading.first().waitFor();
      else {
        await heading.waitFor();
        if(count)await page.locator('.mt-keepsake img[alt="Fictional tree photograph"]').first().waitFor({state:'attached'});
      }
    } catch(error) {
      const headings=await page.getByRole('heading').allTextContents();
      const alerts=await page.getByRole('alert').allTextContents();
      console.error(JSON.stringify({headings:headings.slice(0,6),alerts:alerts.slice(0,3)}));
      throw error;
    }
    const measured=await page.evaluate(()=>{
      const calls=performance.getEntriesByType('resource').filter(r=>r.name.endsWith('/api/private-space'));
      window.phaseMetrics.collect=false;
      return {loadMs:performance.now(),requests:calls.length,wireBytes:calls.reduce((n,r)=>n+r.transferSize,0),
        decodedBytes:calls.reduce((n,r)=>n+r.decodedBodySize,0),longestTaskMs:window.phaseMetrics.longest};
    });
    candidate.push({...measured,heapBytes:(await cdp.send('Runtime.getHeapUsage')).usedSize});
    await context.close();

    const previous=await browser.newContext({storageState,viewport:{width:390,height:844},reducedMotion:'reduce'});
    const replay=await previous.newPage();
    const replayCdp=await previous.newCDPSession(replay);
    await replay.goto(app+'/login',{waitUntil:'domcontentloaded'});
    const legacy=await replay.evaluate(async ({owner,kind})=>{
      performance.clearResourceTimings();
      const started=performance.now();
      let longestTaskMs=0;
      const observer=new PerformanceObserver(list=>{
        for(const item of list.getEntries())if(item.startTime>=started)longestTaskMs=Math.max(longestTaskMs,item.duration);
      });
      observer.observe({type:'longtask'});
      const get=async fields=>{
        const response=await fetch('/api/private-space',{method:'POST',headers:{
          'Content-Type':'application/json','X-Dear-Account':owner},body:JSON.stringify({action:'scope',kind,...fields})});
        if(!response.ok)throw new Error('Legacy scope request failed with status '+response.status);
        return response.json();
      };
      const snapshot=await get({content:false});
      const docs=[];
      for(let i=0;i<snapshot.documents.length;i+=4) {
        const group=await Promise.all(snapshot.documents.slice(i,i+4).map(item=>get({content:true,id:item.id})));
        for(const result of group) {
          if(result.revision!==snapshot.revision)throw new Error('Fixture revision changed.');
          docs.push(result.documents[0]);
        }
      }
      window.phaseLegacy=docs;
      const loadMs=performance.now()-started;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      observer.disconnect();
      const calls=performance.getEntriesByType('resource').filter(r=>r.name.endsWith('/api/private-space'));
      return {loadMs,requests:calls.length,wireBytes:calls.reduce((n,r)=>n+r.transferSize,0),
        decodedBytes:calls.reduce((n,r)=>n+r.decodedBodySize,0),longestTaskMs};
    },{owner:entry.id,kind});
    baseline.push({...legacy,heapBytes:(await replayCdp.send('Runtime.getHeapUsage')).usedSize});
    await previous.close();
  }
  results.profile.push({kind,label,count,samples:5,legacyReplay:summarize(baseline),candidatePage:summarize(candidate)});
}

async function main() {
  const browser=await chromium.launch({executablePath:process.env.ACCOUNTS_CHROMIUM});
  try {
    if(process.env.PHASE3_CLOSURE_ONLY) {
      stage='passwordless recovery and closure';
      await passwordlessClosure(browser,await createIdentity('Fictional passwordless account',false));
      results.checks.passwordlessClosure='Confirmed identity without a password denied direct reset, set a password through a generated recovery link, and used the customer closure form.';
      return;
    }
    stage='creating fictional fixture accounts';
    const a=await createIdentity('Fictional Phase 3 owner');
    const b=await createIdentity('Fictional Phase 3 partner');
    const withoutPassword=await createIdentity('Fictional passwordless account',false);
    const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const other=await browser.newPage();
    await signIn(p,a);
    await signIn(other,b);
    const storage=await p.context().storageState();
    stage='creating synthetic photographs and audio';
    const model=loadBookModel('./memory-books');
    const voice=loadBookModel('./book-voice');
    const treeModel=loadBookModel('./memory-tree');
    const [small,...photos]=await p.evaluate(()=>{
      const c=document.createElement('canvas');
      const ctx=c.getContext('2d');
      return [480,1100,1100,1100,1100].map((edge,index)=>{
        c.width=edge;c.height=edge;
        let seed=index+1;
        const image=ctx.createImageData(edge,edge);
        for(let j=0;j<image.data.length;j+=4) {
          seed=(1664525*seed+1013904223)>>>0;
          image.data[j]=seed>>>24;image.data[j+1]=seed>>>16;image.data[j+2]=seed>>>8;image.data[j+3]=255;
        }
        ctx.putImageData(image,0,0);return c.toDataURL('image/jpeg',.88);
      });
    });
    function book(title,large) {
      const doc=model.createBook(title,203,203,'#60404c','linen',true);
      for(const [index,data] of (large?photos:[small]).entries()) {
        const id='photo-'+index;
        doc.assets[id]={name:id+'.jpg',data};
        doc.pages[index%2].elements.push({...model.newElement('photo'),assetId:id,text:'Fictional photograph '+index});
      }
      if(large) {
        doc.voiceAssets={recording:voice.voiceWav(Float32Array.from({length:720000},(_,i)=>Math.sin(i*.071)*.16),'Fictional tone.wav')};
        doc.pages[0].elements.push({...model.newElement('voice'),voice:{version:1,style:'button',title:'Fictional recording',transcript:'Synthesized tone.',assetId:'recording'}});
      }
      return JSON.parse(JSON.stringify(model.validateBook(doc)));
    }
    function tree(name,count) {
      let doc=treeModel.newTree({...treeModel.initialSettings,name,view:'timeline'});
      for(let i=0;i<count;i++) {
        doc=treeModel.putMemory(doc,{title:'Fictional memory '+(i+1),date:'2026-11-01',time:'',story:'Made for a fictional library.',
          location:'',chapterId:'',tags:[],favorite:false,milestone:false,annual:false,
          photos:[{id:randomUUID(),name:'Fictional tree photograph',data:small}]});
      }
      return JSON.parse(JSON.stringify(doc));
    }
    const kept=book('Fictional small book',false);
    const partnerBook=book('Fictional partner book',false);
    const smallTree=tree('Fictional small tree',1);
    assert.ok(small.length<400_000);
    let books=(await put(p,a,saveBody('books',0,[kept]))).revision;
    await put(other,b,saveBody('books',0,[partnerBook]));
    const uploadsOnly=Boolean(process.env.PHASE3_UPLOADS_ONLY);
    let trees=uploadsOnly?0:(await put(p,a,saveBody('trees',0,[smallTree],{activeId:smallTree.id}))).revision;
    stage='profiling the small cloud libraries';
    await profile(browser,storage,a,'books','small',1);
    if(!uploadsOnly)await profile(browser,storage,a,'trees','small',1);
    stage='seeding media-heavy libraries';
    const large=book('Fictional large book 1',true);
    results.largeBackupBytes=Buffer.byteLength(JSON.stringify(large));
    assert.ok(results.largeBackupBytes>4_500_000);
    books=(await put(p,a,saveBody('books',books,[large]))).revision;
    const uploaded=(await json(await api(p,a,{action:'scope',kind:'books',id:large.id,content:true}))).documents[0].payload;
    assert.deepEqual(uploaded.assets,large.assets);
    assert.deepEqual(uploaded.voiceAssets,large.voiceAssets);
    results.checks.stagedSave='The large upload returned one revision, rejected a second completion, and restored every photograph and audio byte.';
    const more=Array.from({length:11},(_,i)=>book('Fictional large book '+(i+2),false));
    books=(await put(p,a,saveBody('books',books,more))).revision;
    const largeTree=tree('Fictional large tree',32);
    if(!uploadsOnly)trees=(await put(p,a,saveBody('trees',trees,[largeTree],{activeId:largeTree.id}))).revision;
    stage='profiling the large cloud libraries';
    await profile(browser,storage,a,'books','large',13);
    if(!uploadsOnly)await profile(browser,storage,a,'trees','large',33);
    if(process.env.PHASE3_PROFILE_ONLY)return;
    if(!uploadsOnly) {
      stage='opening the Memory Tree index';
      await p.goto(app+'/memory-tree?space=mine');
      await p.getByRole('heading',{name:'Your timeline',exact:true}).waitFor();
      stage='selecting a Memory Tree photograph';
      await p.getByRole('button',{name:'Fictional memory 2',exact:true}).click();
      const loadedPhoto=p.locator('.mt-keepsake img[alt="Fictional tree photograph"]');
      await loadedPhoto.waitFor({state:'attached'});
      await loadedPhoto.scrollIntoViewIfNeeded();
      assert.ok(await loadedPhoto.evaluate(async image=>{await image.decode();return image.naturalWidth>0;}));
      stage='saving Calendar view with deferred photographs';
      await p.getByRole('button',{name:'Calendar',exact:true}).click();
      await p.getByRole('region',{name:'Memory calendar'}).waitFor();
      await p.getByText('Syncing your tree…',{exact:true}).waitFor({state:'hidden',timeout:120000});
      const index=await json(await api(p,a,{action:'scope',kind:'trees',id:largeTree.id,content:true,view:'tree-index'}));
      assert.equal(index.revision,trees+1);
      const reloadedTree=(await json(await api(p,a,{action:'scope',kind:'trees',id:largeTree.id,content:true}))).documents[0].payload;
      assert.deepEqual(reloadedTree.memories.map(memory=>memory.photos),largeTree.memories.map(memory=>memory.photos));
      results.checks.tree='Loaded and decoded the selected memory photograph, then saved Calendar view with all 32 original photo values intact.';
      if(process.env.PHASE3_TREE_ONLY)return;
    }
    stage='interrupted large book import and retry';
    await p.goto(app+'/memory-books?space=mine');
    await p.getByRole('heading',{name:kept.title,exact:true}).waitFor();
    const input=p.locator('input[type=file]');
    let interrupted=false;
    const abort=async route=>{
      if(!interrupted&&route.request().headers()['x-dear-part']==='1') {
        interrupted=true;await route.abort('internetdisconnected');
      } else await route.continue();
    };
    await p.route('**/api/private-space',abort);
    await input.setInputFiles({name:'fictional.memory-book.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(large))});
    await p.getByRole('button',{name:'Retry saving'}).waitFor();
    assert.ok(interrupted);
    let scope=await json(await api(p,a,{action:'scope',kind:'books'}));
    assert.equal(scope.revision,books);
    assert.ok(scope.documents.some(entry=>entry.id===kept.id));
    assert.deepEqual((await json(await api(p,a,{action:'scope',kind:'books',id:kept.id,content:true}))).documents[0].payload.assets,kept.assets);
    await p.unroute('**/api/private-space',abort);
    let completed=0;
    const record=request=>{
      if(request.url().endsWith('/api/private-space')&&request.postData()?.includes('"action":"complete-upload"'))completed++;
    };
    p.on('request',record);
    await p.getByRole('button',{name:'Retry saving'}).dblclick();
    await expectRevision(p,a,books+1);
    p.off('request',record);
    assert.equal(completed,1);
    books++;
    scope=await json(await api(p,a,{action:'scope',kind:'books'}));
    const imported=scope.documents.find(entry=>entry.id!==large.id&&!more.some(doc=>doc.id===entry.id)&&entry.id!==kept.id);
    assert.ok(imported);
    const sharedBook=imported.docId;
    assert.equal(scope.documents.length,14);
    const restored=(await json(await api(p,a,{action:'read',document:imported.docId}))).payload;
    assert.deepEqual(restored.assets,large.assets);
    assert.deepEqual(restored.voiceAssets,large.voiceAssets);
    results.checks.retry='Aborted fragment produced an error. Old revision and assets survived. Double retry committed once.';
    stage='refreshing while a fragment is in flight';
    await p.goto(app+'/memory-books?space=mine');
    await p.getByRole('heading',{name:kept.title,exact:true}).waitFor();
    const pause=async route=>{
      if(route.request().headers()['x-dear-part']==='1')return;
      await route.continue();
    };
    await p.route('**/api/private-space',pause);
    const secondFragment=p.waitForRequest(request=>request.url().endsWith('/api/private-space')&&request.headers()['x-dear-part']==='1');
    await input.setInputFiles({name:'refresh.memory-book.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(large))});
    await secondFragment;
    p.once('dialog',dialog=>dialog.accept());
    await p.reload({waitUntil:'domcontentloaded'});
    await p.unrouteAll({behavior:'ignoreErrors'});
    assert.equal((await json(await api(p,a,{action:'scope',kind:'books'}))).revision,books);
    results.checks.refresh='Reload during the second fragment left the prior 14-book revision unchanged.';
    stage='exporting and re-importing the large backup';
    const title=large.title+' — imported';
    await p.getByRole('button',{name:'Read '+title,exact:true}).waitFor();
    await p.getByLabel('Options for '+title,{exact:true}).click();
    const download=p.waitForEvent('download');
    await p.getByRole('button',{name:'Export backup',exact:true}).click();
    const file=await readFile(await (await download).path());
    const exported=JSON.parse(JSON.stringify(model.validateBook(JSON.parse(file))));
    assert.deepEqual(exported.assets,large.assets);
    assert.deepEqual(exported.voiceAssets,large.voiceAssets);
    await input.setInputFiles({name:'exported.memory-book.json',mimeType:'application/json',buffer:file});
    await expectRevision(p,a,++books);
    results.checks.backup='Downloaded backup validated and re-imported with all photograph and audio bytes.';
    stage='pairing the fictional owner and partner';
    await p.goto(app+'/settings');
    const code=await p.locator('.dt-account-id-card code').innerText();
    await other.goto(app+'/connect');
    await other.getByLabel('Dear Tomorrow ID').fill(code);
    await other.getByRole('button',{name:'Find account'}).click();
    await other.getByRole('button',{name:'Send connection request'}).click();
    await p.goto(app+'/connect');
    await p.getByRole('button',{name:'Accept',exact:true}).click();
    await p.waitForURL('**/our-space?welcome=1');
    stage='checking pre-grant access to the large book';
    assert.equal((await api(other,b,{action:'read',document:sharedBook})).status(),404,'The partner must not have access before sharing.');
    stage='granting access to the large book';
    await p.goto(app+'/my-space/memory/'+sharedBook);
    await p.getByRole('button',{name:/Share with/}).click();
    await p.getByRole('button',{name:'Keep private'}).waitFor();
    const authorized=(await json(await api(other,b,{action:'read',document:sharedBook}))).payload;
    assert.deepEqual(authorized.assets,large.assets);
    assert.deepEqual(authorized.voiceAssets,large.voiceAssets);
    stage='revoking the large book grant';
    await p.getByRole('button',{name:'Keep private'}).click();
    await p.getByRole('button',{name:'Share with my partner'}).waitFor();
    assert.equal((await api(other,b,{action:'read',document:sharedBook})).status(),404,'The partner must lose access after revocation.');
    results.checks.sharing='Recipient received identical photo/audio bytes after explicit grant. Reads were denied before the grant and after revocation.';
    stage='closing the password account and checking the partner’s own book';
    await closeAccount(p,a);
    const independent=(await json(await api(other,b,{action:'scope',kind:'books',id:partnerBook.id,content:true}))).documents[0].payload;
    assert.deepEqual(independent.assets,partnerBook.assets);
    results.checks.passwordClosure='Customer closure removed the owner and left the partner’s book and file bytes intact.';
    stage='passwordless recovery and closure';
    await passwordlessClosure(browser,withoutPassword);
    results.checks.passwordlessClosure='Confirmed identity without a password denied direct reset, set a password through a generated recovery link, and used the customer closure form.';
  } finally {
    await browser.close();
    for(const account of accounts)await cleanup(account).catch(()=>{process.exitCode=1;console.error('A fictional fixture could not be cleaned up.');});
    if(process.env.PHASE3_RESULTS)await writeFile(process.env.PHASE3_RESULTS,JSON.stringify(results,null,2)+'\n');
  }
}

async function expectRevision(page,entry,expected) {
  for(let attempt=0;attempt<25;attempt++) {
    const scope=await json(await api(page,entry,{action:'scope',kind:'books'}));
    if(scope.revision===expected)return;
    assert.ok(scope.revision<expected,'A duplicate save advanced the revision.');
    await new Promise(resolve=>setTimeout(resolve,300));
  }
  throw new Error('The expected saved revision was not observed.');
}

async function closeAccount(page,entry) {
  await page.goto(app+'/settings');
  await page.getByText('Delete account',{exact:true}).click();
  await page.getByLabel('Current password').fill('incorrect-fictional-password');
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button',{name:'Permanently delete account'}).click();
  await page.waitForURL('**/settings?message=delete');
  assert.equal((await admin.auth.admin.getUserById(entry.id)).data.user?.id,entry.id);
  await page.getByLabel('Current password').fill(entry.password);
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button',{name:'Permanently delete account'}).click();
  await page.waitForURL(app+'/');
  assert.equal((await admin.auth.admin.getUserById(entry.id)).data.user,null);
  const owned=await admin.storage.from(bucket).list(entry.id);
  assert.ok(!owned.error&&owned.data.length===0,'Closed account still has owned Storage objects.');
  entry.closed=true;
}

async function passwordlessClosure(browser,entry) {
  const context=await browser.newContext();
  const cookies=[];
  const auth=createServerClient(target.url,target.key,{cookies:{getAll:()=>cookies,setAll:updates=>cookies.push(...updates)}});
  const magic=await admin.auth.admin.generateLink({type:'magiclink',email:entry.email});
  assert.ok(!magic.error);
  assert.equal((await auth.auth.verifyOtp({type:'magiclink',token_hash:magic.data.properties.hashed_token})).data.user?.id,entry.id);
  await context.addCookies(cookies.filter(cookie=>cookie.value).map(({name,value})=>({name,value,url:app,httpOnly:true,sameSite:'Lax'})));
  const page=await context.newPage();
  await page.goto(app+'/reset-password');
  await page.waitForURL('**/forgot-password?message=confirmation');
  await page.goto(app+'/settings');
  await page.getByText('Delete account',{exact:true}).click();
  await page.getByRole('button',{name:'Email me a password setup link'}).waitFor();
  const recovery=await admin.auth.admin.generateLink({type:'recovery',email:entry.email});
  assert.ok(!recovery.error);
  const link=new URL('/auth/confirm',app);
  link.searchParams.set('type','recovery');
  link.searchParams.set('token_hash',recovery.data.properties.hashed_token);
  await page.goto(link.href);
  await page.waitForURL('**/reset-password');
  entry.password=password();
  await page.getByLabel('New password',{exact:true}).fill(entry.password);
  await page.getByRole('button',{name:'Save new password'}).click();
  await page.waitForURL('**/login?message=changed');
  const consumed=await page.request.get(link.href,{maxRedirects:0});
  assert.equal(new URL(consumed.headers().location,app).searchParams.get('message'),'confirmation');
  await signIn(page,entry);
  await closeAccount(page,entry);
  await context.close();
}

async function cleanup(entry) {
  if(entry.closed)return;
  const identity=await admin.auth.admin.getUserById(entry.id);
  assert.ok(!identity.error&&identity.data.user?.email===entry.email,'Fictional fixture ownership could not be confirmed.');
  const store=admin.storage.from(bucket);
  async function remove(prefix) {
    const {data,error}=await store.list(prefix,{limit:100});
    if(error)throw error;
    for(const item of data) {
      const key=prefix+'/'+item.name;
      if(item.id) {
        const removed=await store.remove([key]);
        if(removed.error)throw removed.error;
      } else await remove(key);
    }
  }
  await remove(entry.id);
  const deleted=await admin.auth.admin.deleteUser(entry.id);
  if(deleted.error)throw deleted.error;
}

main().then(()=>console.log('Phase 3 fictional browser checks passed.')).catch(error=>{
  process.exitCode=1;
  const message=String(error.message).split('\n')[0].replace(/token_hash=[^&\s]+/g,'token_hash=[redacted]');
  console.error('Phase 3 failed during '+stage+': '+message);
});
