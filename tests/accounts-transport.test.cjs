const assert=require('node:assert/strict');
const {test}=require('node:test');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const {webcrypto:crypto}=require('node:crypto');
const ts=require('typescript');

function load(file,globals={}) {
  const source=readFileSync(join(__dirname,'../src/lib/accounts',file+'.ts'),'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const exports={};
  runInNewContext(outputText,{exports,Blob,crypto,require:name=>name==='./cloud-transport'?load('cloud-transport'):{},...globals});
  return exports;
}

test('staged HTTPS saves retain the exact UTF-8 JSON and use bounded function requests',async()=>{
  const parts=[];
  const calls=[];
  const {commitCloud}=load('cloud-client',{location:{hostname:'staging.test'},fetch:async(url,{headers,body})=>{
    assert.equal(url,'/api/private-space');
    assert.equal(headers['X-Dear-Account'],'owner');
    assert.ok((body.size??Buffer.byteLength(body))<4_500_000);
    if(headers['X-Dear-Transfer']) {
      assert.equal(Number(headers['X-Dear-Part']),parts.length);
      parts.push(Buffer.from(await body.arrayBuffer()));
      calls.push(headers['X-Dear-Transfer']);
      return Response.json({staged:true});
    }
    const finish=JSON.parse(body);
    assert.equal(finish.action,'complete-upload');
    assert.equal(finish.parts,parts.length);
    assert.ok(calls.every(id=>id===finish.upload));
    assert.deepEqual(JSON.parse(Buffer.concat(parts).toString('utf8')),{
      action:'save',kind:'books',expected:7,changes:[change],removals:['old'],metadata:{},importing:false,
    });
    return Response.json({revision:8});
  }});
  const change={id:'book',cover:'a'.repeat(2_499_977)+'🌿',assets:{photo:'x'.repeat(5_000_000)}};
  assert.equal((await commitCloud('owner','books',7,[change],['old'],{})).revision,8);
  assert.ok(parts.length>2);
});

test('a rejected fragment cancels the transfer without completing a save',async()=>{
  const calls=[];
  const {commitCloud}=load('cloud-client',{location:{hostname:'staging.test'},fetch:async(_url,{headers,body})=>{
    calls.push(headers['X-Dear-Transfer']?'stage':JSON.parse(body).action);
    return headers['X-Dear-Transfer']
      ? Response.json({error:'Upload interrupted.'},{status:503})
      : Response.json({canceled:true});
  }});
  await assert.rejects(commitCloud('owner','books',0,[{payload:'a'.repeat(5_000_000)}],[],{}),/Upload interrupted/);
  assert.deepEqual(calls,['stage','cancel-upload']);
});

test('a successful HTTP status alone cannot acknowledge a staged or direct save',async()=>{
  const calls=[];
  const {commitCloud}=load('cloud-client',{fetch:async(_url,{headers,body})=>{
    calls.push(headers['X-Dear-Transfer']?'stage':JSON.parse(typeof body==='string'?body:await body.text()).action);
    return Response.json({});
  }});
  await assert.rejects(commitCloud('owner','books',0,[{payload:'one'}],[],{}),/could not confirm this save/);
  await assert.rejects(commitCloud('owner','books',0,[{payload:'a'.repeat(5_000_000)}],[],{}),/could not confirm this upload fragment/);
  assert.deepEqual(calls,['save','stage','cancel-upload']);
});

test('a library loads separately authorized documents and rejects a mixed revision',async()=>{
  let revision=4;
  const ids=[];
  const {readCloud}=load('cloud-client',{fetch:async(_url,{body})=>{
    const request=JSON.parse(body);
    if(!request.content)return Response.json({revision:4,metadata:{},documents:[{id:'a'},{id:'b'}]});
    ids.push(request.id);
    return Response.json({revision,documents:[{id:request.id,payload:{id:request.id}}]});
  }});
  assert.deepEqual(Array.from((await readCloud('owner','books',true)).documents,item=>item.id),['a','b']);
  assert.deepEqual(ids,['a','b']);
  revision=5;
  await assert.rejects(readCloud('owner','books',true),/library changed/);
});

test('Vercel requires a canonical HTTPS origin and local preview still accepts loopback',()=>{
  const config=(env)=>load('config',{process:{env},URL});
  assert.equal(config({}).appOrigin(),'http://127.0.0.1:3002');
  assert.throws(()=>config({VERCEL:'1'}).appOrigin(),/Set DEAR_TOMORROW_APP_URL/);
  for(const host of ['http://staging.test','https://localhost:3002','https://staging.test/login','https://u:p@staging.test']) {
    assert.throws(()=>config({VERCEL:'1',DEAR_TOMORROW_APP_URL:host}).appOrigin(),/HTTPS origin/);
  }
  const staging=config({VERCEL:'1',DEAR_TOMORROW_APP_URL:'https://staging.test'});
  assert.equal(staging.appOrigin(),'https://staging.test');
  assert.equal(staging.matchesHostedOrigin('staging.test'),true);
  assert.equal(staging.matchesHostedOrigin('STAGING.test'),true);
  assert.equal(staging.matchesHostedOrigin(null),false);
  assert.equal(staging.matchesHostedOrigin('other.test'),false);
});

test('the private route consumes a large upload once and streams an authorized large read',async()=>{
  const owner='9db51427-bd9a-4465-9762-7233c6641672';
  const upload=crypto.randomUUID();
  const document=crypto.randomUUID();
  const origin='https://staging.test';
  const chunks=new Map();
  const stored={id:'book',data:'x'.repeat(7_000_000)};
  const uploadJson=Buffer.from(JSON.stringify({
    action:'save',kind:'books',expected:2,changes:[stored],removals:[],metadata:{},
  }));
  let commits=0;
  const store={rpc:async(name,{transfer,ordinal,encoded})=>{
    assert.equal(transfer,upload);
    if(name==='dt_stage_cloud_chunk')chunks.set(ordinal,encoded);
    if(name==='dt_read_cloud_chunk')return {data:chunks.get(ordinal)};
    if(name==='dt_drop_cloud_transfer')chunks.clear();
    return {data:null};
  }};
  const client={rpc:async(name,input)=>{
    if(name==='dt_scope')return {data:{revision:2}};
    if(name==='dt_commit_scope') {
      assert.equal(input.expected,2);
      assert.equal(input.changes[0].payload.data,stored.data);
      commits++;
      return {data:{revision:3}};
    }
    assert.equal(name,'dt_read_document');
    assert.equal(input.document,document);
    return {data:{id:document,ownerId:owner,sourceId:'book',kind:'books',payload:stored}};
  }};
  const transport=load('cloud-transport');
  const imports={
    'next/server':{NextResponse:{json:(value,options)=>Response.json(value,options)}},
    '@/lib/accounts/server':{account:async()=>({user:{id:owner},client}),privateStorage:()=>store},
    '@/lib/accounts/config':{appOrigin:()=>origin,matchesHostedOrigin:host=>host==='staging.test'},
    '@/lib/accounts/documents':{
      describeDocument:(_kind,doc)=>({id:doc.id,payload:doc}),
      uuidPattern:/^[0-9a-f-]{36}$/,
      sourceIdPattern:/^[a-z]+$/,
    },
    '@/lib/accounts/identity':{isSpaceKind:kind=>kind==='books'},
    '@/lib/accounts/media':{packMedia:async value=>value,restoreMedia:async value=>value,PrivateMediaUnavailable:class extends Error{}},
    '@/lib/accounts/service-events':{recordServiceEvent(){}},
    '@/lib/accounts/cloud-transport':transport,
  };
  const source=readFileSync(join(__dirname,'../src/app/api/private-space/route.ts'),'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const exports={};
  runInNewContext(outputText,{exports,Buffer,Blob,Response,ReadableStream,require:name=>imports[name],process:{env:{VERCEL:'1'}}});
  function post(body,headers) {
    const request=new Request(origin+'/api/private-space',{method:'POST',body,headers:{host:'staging.test',origin,'X-Dear-Account':owner,...headers}});
    request.nextUrl=new URL(request.url);
    return exports.POST(request);
  }
  const postJson=(value)=>post(JSON.stringify(value),{'Content-Type':'application/json'});
  assert.equal((await post(uploadJson)).status,413);
  assert.equal((await postJson({action:'complete-upload',upload,parts:3})).status,409);
  for(let start=0,index=0;start<uploadJson.length;start+=transport.cloudChunkBytes,index++) {
    const headers={'Content-Type':'application/octet-stream','X-Dear-Transfer':upload,'X-Dear-Part':String(index)};
    const piece=uploadJson.subarray(start,start+transport.cloudChunkBytes);
    if(index===0) {
      assert.equal((await post(piece,{...headers,'X-Dear-Account':'wrong-account'})).status,409);
      assert.equal((await post(piece,{...headers,origin:'https://other.test'})).status,403);
      assert.equal((await post(piece,{...headers,host:'other.test'})).status,403);
      assert.equal(chunks.size,0);
    }
    assert.equal((await post(piece,headers)).status,200);
  }
  const complete=await postJson({action:'complete-upload',upload,parts:3});
  assert.equal((await complete.json()).revision,3);
  assert.equal(commits,1);
  assert.equal(chunks.size,0);
  assert.equal((await postJson({action:'complete-upload',upload,parts:3})).status,409);
  const read=await postJson({action:'read',document});
  assert.equal(read.headers.get('Cache-Control'),'private, no-store');
  assert.equal(read.headers.get('Content-Length'),null);
  const reader=read.body.getReader();
  const pieces=[];
  for(;;) {
    const {value,done}=await reader.read();
    if(done)break;
    pieces.push(value);
  }
  assert.ok(pieces.length>1);
  assert.equal(JSON.parse(Buffer.concat(pieces).toString('utf8')).payload.data,stored.data);
});
