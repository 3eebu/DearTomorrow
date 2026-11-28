const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadServerModule } = require('./phase4-server-fixture.cjs');

function monitor() {
  const captured = [];
  const console = Object.fromEntries(['info','warn','error'].map(level=>[level,line=>captured.push({level,line})]));
  const events = loadServerModule('src/lib/accounts/service-events.ts',{}, {console});
  return {captured,events};
}

test('synthetic alert reaches the local log sink using the production event schema', t => {
  const {captured,events} = monitor();
  events.recordServiceEvent('monitoring.synthetic');
  assert.deepEqual(captured, [{level:'warn',line:'{"service":"dear-tomorrow","event":"monitoring.synthetic","level":"warn"}'}]);
  t.diagnostic('Local sink received one synthetic warning. External delivery requires an approved destination.');
});

test('authentication and Storage events contain fixed fields and discard diagnostic content', async () => {
  const {captured,events} = monitor();
  const secret = 'fictional-private-letter-and-token';
  events.recordServiceEvent(secret);
  events.recordAuthError(401);
  events.recordAuthError(429);
  events.recordAuthError(503);
  const {packMedia,restoreMedia} = loadServerModule('src/lib/accounts/media.ts',{'./service-events':events});
  const store={storage:{from:()=>({
    upload:async()=>({error:{message:secret,statusCode:'500'}}),
    download:async()=>({error:{message:secret},data:null}),
  })}};
  const prefix='owner/books/test';
  await assert.rejects(packMedia({voice:'data:audio/ogg;base64,T2dnUw=='},prefix,store),/could not be saved/);
  await assert.rejects(restoreMedia({voice:{$dearMedia:prefix+'/'+ 'd'.repeat(64),mime:'audio/ogg'}},prefix,store),/could not be retrieved/);
  const decoded=captured.map(entry=>JSON.parse(entry.line));
  for(const event of decoded)assert.deepEqual(Object.keys(event).sort(),['event','level','service']);
  assert.deepEqual(decoded.map(entry=>entry.event),[
    'auth.rejected','auth.rate_limited','auth.unavailable','storage.write_failed','storage.read_failed',
  ]);
  assert.ok(!JSON.stringify(captured).includes(secret));
});

test('save route avoids stale uploads, retains import retry semantics and reports failed commits',async()=>{
  const {captured,events}=monitor();
  const origin='http://127.0.0.1:3002';
  const owner='fictional';
  let uploads=0, scopeStatus=200, commitStatus=200, receipt=null;
  class PrivateMediaUnavailable extends Error {}
  const client={
    async rpc(name) {
      if (name==='dt_scope') return {data:{revision:2},error:scopeStatus===200?null:{private:'payload'},status:scopeStatus};
      assert.equal(name,'dt_commit_scope');
      return {data:commitStatus===200?{revision:3}:null,error:commitStatus===200?null:{code:commitStatus===409?'40001':'other'},status:commitStatus};
    },
    from() {return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:receipt,error:null,status:200};}};},
  };
  const {POST}=loadServerModule('src/app/api/private-space/route.ts',{
    'next/server':{NextResponse:{json:Response.json}},
    '@/lib/accounts/server':{account:async()=>({client,user:{id:owner}}),privateStorage:()=>null},
    '@/lib/accounts/config':{appOrigin:()=>origin,matchesHostedOrigin:()=>true},
    '@/lib/accounts/documents':{describeDocument:(_kind,doc)=>doc,sourceIdPattern:/^[a-z]+$/},
    '@/lib/accounts/identity':{isSpaceKind:kind=>kind==='books'},
    '@/lib/accounts/media':{packMedia:async payload=>{uploads++;return payload;},PrivateMediaUnavailable},
    '@/lib/accounts/service-events':events,
    '@/lib/accounts/cloud-transport':{cloudRequestBytes:10000,directCloudRequestBytes:10000},
  });
  const send = (expected,extra={})=>POST(new Request(origin+'/api/private-space',{
    method:'POST',headers:{origin,'x-dear-account':owner},
    body:JSON.stringify({action:'save',kind:'books',expected,changes:[{id:'draft',payload:{id:'draft'}}],removals:[],...extra}),
  }));
  assert.equal((await send(1)).status,409);
  assert.equal(uploads,0);
  receipt={source_id:'draft'};
  const duplicate=await send(1,{importing:true,receipt:'c'.repeat(64)});
  assert.deepEqual(await duplicate.json(),{imported:false,sourceId:'draft'});
  assert.equal(uploads,0);
  commitStatus=409;
  assert.equal((await send(2)).status,409);
  assert.equal(uploads,1);
  commitStatus=400;
  assert.equal((await send(2)).status,503);
  scopeStatus=0;
  assert.equal((await send(2)).status,503);
  assert.equal(uploads,2);
  assert.deepEqual(captured.map(x=>JSON.parse(x.line).event),[
    'workspace.revision_conflict','workspace.revision_conflict','workspace.save_failed','database.unavailable',
  ]);
});
