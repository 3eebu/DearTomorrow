const assert = require('node:assert/strict');
const {test} = require('node:test');
const {randomUUID} = require('node:crypto');
const {sandbox} = require('./accounts-db-fixture.cjs');

test('verified identities have private profiles, stable permanent IDs, and capped ID-only lookups',()=>sandbox(async({ids,act,fn,profile})=>{
  const [a,b]=await Promise.all([profile(ids.a),profile(ids.b)]);
  assert.equal(a.display_name,b.display_name);
  assert.match(a.dear_id,/^[2-9A-H]{8}-[2-9A-H]{8}-[2-9A-H]{8}$/);
  assert.notEqual(a.dear_id,b.dear_id);
  assert.equal((await act(ids.a,'select id from public.dt_profiles')).length,1);
  await assert.rejects(act(null,'select id from public.dt_profiles',[],'anon'),/permission denied/);
  await assert.rejects(fn(ids.unverified,'dt_find_account',[a.dear_id]),/Verify your email/);
  await assert.rejects(fn(null,'dt_find_account',[a.dear_id],'anon'),/permission denied/);
  const lookup=await fn(ids.a,'dt_find_account',[b.dear_id]);
  assert.deepEqual(Object.keys(lookup).sort(),['match','name']);
  assert.equal(lookup.name,b.display_name);
  assert.equal((await fn(ids.b,'dt_connection_view')).partner,null);
  assert.ok((await fn(ids.a,'dt_find_account',[a.dear_id])).error);
  await fn(ids.a,'dt_profile_name',['Different name',true]);
  assert.equal((await profile(ids.a)).display_name,'Different name');
  assert.equal((await profile(ids.a)).dear_id,a.dear_id);
  for(let n=0;n<10;n++)await fn(ids.a,'dt_find_account',['22AABB44-55CCDD66-77EEFF88']);
  assert.match((await fn(ids.a,'dt_find_account',[b.dear_id])).error,/wait/);
}));

test('only the recipient can accept, decline or establish one connection, and new requests can be paused',()=>sandbox(async({db,ids,fn,request,profile})=>{
  const one=await request(ids.a,ids.b);
  const two=await request(ids.c,ids.b);
  assert.ok((await fn(ids.a,'dt_connection_action',['accept',one.id])).error);
  const decisions=await Promise.all([
    fn(ids.b,'dt_connection_action',['accept',one.id]),
    fn(ids.b,'dt_connection_action',['accept',two.id]),
  ]);
  assert.equal(decisions.filter(v=>v.paired).length,1);
  const members=(await db.query('select * from public.dt_members')).rows;
  assert.equal(members.length,2);
  assert.equal(new Set(members.map(row=>row.connection_id)).size,1);
  const peer=members.find(row=>row.user_id!==ids.b).user_id;
  const third=peer===ids.a?ids.c:ids.a;
  assert.ok((await fn(third,'dt_find_account',[(await profile(ids.b)).dear_id])).error);
  assert.ok((await fn(peer,'dt_connection_action',['disconnect',null])).ok);
  assert.equal((await fn(ids.b,'dt_connection_view')).partner,null);
  await fn(ids.b,'dt_connection_action',['close_requests',null]);
  assert.ok((await fn(third,'dt_find_account',[(await profile(ids.b)).dear_id])).error);
  await fn(ids.b,'dt_connection_action',['open_requests',null]);
  const fresh=await request(third,ids.b);
  assert.equal((await fn(ids.b,'dt_connection_action',['decline',fresh.id])).ok,true);
  const b=await request(ids.b,ids.a);
  assert.equal(b.status,'pending');
  assert.ok((await fn(ids.b,'dt_connection_action',['cancel',b.id])).ok);
  assert.ok((await fn(ids.a,'dt_connection_action',['accept',b.id])).error);
}));

test('lookup tickets cannot cross accounts, repeated requests stay singular, and expired requests cannot pair',()=>sandbox(async({db,ids,profile,fn,request})=>{
  const code=(await profile(ids.b)).dear_id;
  const first=await fn(ids.a,'dt_find_account',[code]);
  assert.ok((await fn(ids.c,'dt_connection_action',['send',first.match])).error);
  assert.ok((await fn(ids.a,'dt_connection_action',['send',first.match])).ok);
  const duplicate=await fn(ids.a,'dt_find_account',[code]);
  assert.ok((await fn(ids.a,'dt_connection_action',['send',duplicate.match])).ok);
  const incoming=(await fn(ids.b,'dt_connection_view')).requests;
  assert.equal(incoming.length,1);
  await db.query("update public.dt_requests set expires_at=now()-interval '1 second' where id=$1",[incoming[0].id]);
  assert.match((await fn(ids.b,'dt_connection_action',['accept',incoming[0].id])).error,/expired/);
  assert.equal((await fn(ids.b,'dt_connection_view')).partner,null);
  assert.ok(await request(ids.a,ids.b));
}));

test('sharing is read-only, saved revisions and import receipts are atomic, and disconnect ends access',()=>sandbox(async({ids,act,fn,listing,commit,entry,request})=>{
  const first=entry({id:'tree-a',secret:'Only in My Space'});
  const second=entry({id:'tree-b',secret:'Intentionally shared'});
  const fingerprint='a'.repeat(64);
  assert.equal((await commit(ids.a,'trees',0,[first])).revision,1);
  assert.equal((await commit(ids.a,'trees',1,[second],fingerprint)).revision,2);
  assert.deepEqual(await commit(ids.a,'trees',0,[second],fingerprint),{imported:false,sourceId:'tree-b'});
  await assert.rejects(commit(ids.a,'trees',0,[entry({id:'uncommitted'})]),/newer version/);
  assert.equal((await listing(ids.a)).length,2);
  assert.equal((await listing(ids.b)).length,0);
  const documents=await listing(ids.a);
  const id=documents.find(item=>item.sourceId==='tree-b').id;
  assert.equal(await fn(ids.b,'dt_read_document',[id]),null);
  assert.equal((await act(ids.b,'select * from public.dt_documents')).length,0);
  await assert.rejects(fn(ids.b,'dt_share',[id,true]),/unavailable/);
  await assert.rejects(fn(ids.a,'dt_share',[id,true]),/Connect/);
  const pending=await request(ids.a,ids.b);
  await fn(ids.b,'dt_connection_action',['accept',pending.id]);
  assert.equal((await listing(ids.b,true)).length,0);
  await fn(ids.a,'dt_share',[id,true]);
  assert.equal((await listing(ids.b,true)).length,1);
  assert.equal((await fn(ids.b,'dt_read_document',[id])).payload.secret,'Intentionally shared');
  assert.equal(await fn(ids.c,'dt_read_document',[id]),null);
  assert.equal(await fn(ids.b,'dt_read_document',[documents.find(item=>item.sourceId==='tree-a').id]),null);
  assert.equal((await act(ids.b,'select * from public.dt_documents')).length,0);
  await assert.rejects(act(ids.b,"update public.dt_documents set title='intruder'"),/permission denied/);
  await fn(ids.a,'dt_share',[id,false]);
  assert.equal(await fn(ids.b,'dt_read_document',[id]),null);
  await fn(ids.a,'dt_share',[id,true]);
  await fn(ids.b,'dt_connection_action',['disconnect',null]);
  assert.equal(await fn(ids.b,'dt_read_document',[id]),null);
  assert.equal((await listing(ids.a)).length,2);
}));

test('PostgreSQL withholds timed and draft content and blocks direct reads from private Storage',()=>sandbox(async({db,ids,act,fn,listing,commit,entry,request})=>{
  const t=Date.now();
  const locked={id:'letter-a',kind:'tomorrow',state:'scheduled',release:{instant:t+86400000},pages:[{text:'Protected body'}]};
  const journey={id:'journey-a',departure:{instant:t-8*3600000},arrival:{instant:t+8*3600000},
    checkpoints:Array.from({length:6},(_,i)=>({id:'stop-'+i,label:'Envelope '+i,custom:null,
      letter:{state:i===0?'draft':'sealed',media:{'$dearMedia':'attachment-'+i}}}))};
  await commit(ids.a,'letters',0,[entry(locked)]);
  await commit(ids.a,'journeys',0,[entry(journey)]);
  await commit(ids.a,'books',0,[entry({id:'book-a',secret:'Private book'})]);
  await commit(ids.a,'trees',0,[entry({id:'tree-a',secret:'Private tree'})]);
  const docs=await listing(ids.a);
  assert.equal(docs.length,4);
  for(const {id} of docs) assert.equal(await fn(ids.b,'dt_read_document',[id]),null);
  const pending=await request(ids.a,ids.b);
  await fn(ids.b,'dt_connection_action',['accept',pending.id]);
  for(const {id} of docs) assert.equal(await fn(ids.b,'dt_read_document',[id]),null);
  const letterId=docs.find(doc=>doc.kind==='letters').id;
  const journeyId=docs.find(doc=>doc.kind==='journeys').id;
  await fn(ids.a,'dt_share',[letterId,true]);
  await fn(ids.a,'dt_share',[journeyId,true]);
  assert.equal((await fn(ids.a,'dt_read_document',[letterId])).payload.pages[0].text,'Protected body');
  const hidden=await fn(ids.b,'dt_read_document',[letterId]);
  assert.equal(hidden.locked,true);
  assert.equal(hidden.payload,null);
  await commit(ids.a,'letters',1,[entry({...locked,release:{instant:t-3600000}})]);
  assert.equal((await fn(ids.b,'dt_read_document',[letterId])).payload.pages[0].text,'Protected body');
  const shared=await fn(ids.b,'dt_read_document',[journeyId]);
  assert.equal(shared.payload.checkpoints[0].letter,null);
  assert.ok(shared.payload.checkpoints[1].letter.media);
  assert.equal(shared.payload.checkpoints[5].letter,null);
  assert.ok(!JSON.stringify(shared).includes('attachment-5'));
  assert.deepEqual((await listing(ids.b,true)).map(doc=>doc.kind).sort(),['journeys','letters']);
  for(const {id} of docs) assert.equal(await fn(ids.c,'dt_read_document',[id]),null);
  await db.exec("insert into storage.objects values ('dear-tomorrow-private','secret'),('existing-bucket','existing')");
  assert.deepEqual((await act(ids.b,'select name from storage.objects')).map(row=>row.name),['existing']);
  await assert.rejects(fn(ids.a,'dt_begin_delete',[ids.a]),/permission denied/);
  await fn(null,'dt_begin_delete',[ids.a],'service_role');
  assert.equal(await fn(ids.b,'dt_read_document',[journeyId]),null);
  assert.equal((await fn(ids.b,'dt_connection_view')).partner,null);
  assert.equal((await act(ids.a,'select * from public.dt_documents')).length,0);
}));

test('staged cloud uploads are bounded, private, ordered and disposable',()=>sandbox(async({db,ids,fn})=>{
  const upload=randomUUID(),other=randomUUID();
  const stage=(owner,id,part,content)=>fn(null,'dt_stage_cloud_chunk',[owner,id,part,content],'service_role');
  const read=(owner,id,part,parts)=>fn(null,'dt_read_cloud_chunk',[owner,id,part,parts],'service_role');
  const drop=(owner,id)=>fn(null,'dt_drop_cloud_transfer',[owner,id],'service_role');
  await assert.rejects(fn(ids.a,'dt_stage_cloud_chunk',[ids.a,upload,0,'YQ==']),/permission denied/);
  await assert.rejects(fn(ids.b,'dt_read_cloud_chunk',[ids.a,upload,0,2]),/permission denied/);
  await stage(ids.a,upload,1,'Yg==');
  assert.equal(await read(ids.a,upload,1,2),null);
  await stage(ids.a,upload,0,'YQ==');
  await stage(ids.a,upload,0,'YQ==');
  await assert.rejects(stage(ids.a,upload,0,'Yw=='),/differs/);
  assert.equal(await read(ids.a,upload,0,2),'YQ==');
  assert.equal(await read(ids.a,upload,1,2),'Yg==');
  assert.equal(await read(ids.b,upload,1,2),null);
  await drop(ids.b,upload);
  assert.equal(await read(ids.a,upload,1,2),'Yg==');
  await stage(ids.a,other,0,'YQ==');
  await assert.rejects(stage(ids.a,randomUUID(),0,'YQ=='),/Too many pending transfers/);
  await drop(ids.a,upload);
  assert.equal(await read(ids.a,upload,1,2),null);
  await db.query("update dt_private.cloud_chunks set expires_at=now()-interval '1 second' where transfer_id=$1",[other]);
  await stage(ids.a,randomUUID(),0,'YQ==');
  assert.equal((await db.query('select count(*)::int as count from dt_private.cloud_chunks where transfer_id=$1',[other])).rows[0].count,0);
}));
