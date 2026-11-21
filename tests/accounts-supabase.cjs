const assert = require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');

const url=process.env.DT_TEST_SUPABASE_URL;
const key=process.env.DT_TEST_SUPABASE_KEY;
const secret=process.env.DT_TEST_SUPABASE_SECRET;

async function main() {
  if(!url||!key||!secret) {
    console.log('Skipped Supabase integration. Configure a disposable local Auth, Postgres, and Storage stack.');
    return;
  }
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname),'Use a disposable local project only.');
  const connect=token=>createClient(url,token,{auth:{persistSession:false,autoRefreshToken:false}});
  const admin=connect(secret);
  const users=[];
  const retryPass=randomBytes(24).toString('base64url')+'!a9';
  function okay(result) {
    if(result.error)throw new Error(result.error.message);
    return result.data;
  }
  const rpc=async(client,name,fields={})=>okay(await client.rpc(name,fields));
  const profile=actor=>actor.client.from('dt_profiles').select('display_name,dear_id').eq('id',actor.id).single().then(okay);
  async function account(suffix) {
    const client=connect(key),email='journey-'+suffix+'-'+randomUUID()+'@example.test';
    const data=okay(await admin.auth.admin.createUser({email,password:retryPass,email_confirm:true,user_metadata:{display_name:'Sam'}}));
    users.push(data.user.id);
    const {user}=okay(await client.auth.signInWithPassword({email,password:retryPass}));
    return {client,id:user.id};
  }
  async function invite(sender,recipient) {
    const {dear_id}=await profile(recipient);
    const match=await rpc(sender.client,'dt_find_account',{code:dear_id});
    assert.ok(match.match);
    assert.equal((await rpc(sender.client,'dt_connection_action',{operation:'send',reference:match.match})).ok,true);
    const requests=(await rpc(recipient.client,'dt_connection_view')).requests;
    return requests.find(request=>request.incoming&&request.status==='pending'&&!seen.has(request.id))?.id;
  }
  const seen=new Set();
  try {
    const [a,b,c]=await Promise.all([account('a'),account('b'),account('c')]);
    const [pa,pb]=await Promise.all([profile(a),profile(b)]);
    assert.equal(pa.display_name,pb.display_name);
    assert.notEqual(pa.dear_id,pb.dear_id);
    const first=await invite(a,b);assert.ok(first);seen.add(first);
    const second=await invite(c,b);assert.ok(second);
    const decisions=await Promise.all([first,second].map(reference=>rpc(b.client,'dt_connection_action',{operation:'accept',reference})));
    assert.equal(decisions.filter(result=>result.paired).length,1);
    const sender=decisions[0].paired?a:c,outsider=sender===a?c:a;
    const content={id:'test-letter',kind:'tomorrow',state:'scheduled',release:{instant:Date.now()+300000},pages:[{text:'Fictional shared writing'}]};
    const bucket='dear-tomorrow-private';
    const object=sender.id+'/letters/test-letter/'+'a'.repeat(64);
    okay(await admin.storage.from(bucket).upload(object,Buffer.from([137,80,78,71,13,10,26,10,0]),{contentType:'image/png'}));
    try {
      assert.ok((await b.client.storage.from(bucket).download(object)).error);
      assert.ok((await connect(key).rpc('dt_find_account',{code:pb.dear_id})).error);
      const save=expected=>rpc(sender.client,'dt_commit_scope',{kind_name:'letters',expected,
        changes:[{id:content.id,title:'Test letter',summary:{},payload:content}],removals:[],meta:{}});
      await save(0);
      const [doc]=await rpc(sender.client,'dt_library');
      assert.equal(await rpc(b.client,'dt_read_document',{document:doc.id}),null);
      await rpc(sender.client,'dt_share',{document:doc.id,allow_share:true});
      assert.equal((await rpc(b.client,'dt_read_document',{document:doc.id})).payload,null);
      content.release.instant=Date.now()-300000;
      await save(1);
      assert.equal((await rpc(b.client,'dt_read_document',{document:doc.id})).payload.pages[0].text,'Fictional shared writing');
      assert.equal(await rpc(outsider.client,'dt_read_document',{document:doc.id}),null);
      assert.ok((await b.client.rpc('dt_share',{document:doc.id,allow_share:true})).error);
      await rpc(b.client,'dt_connection_action',{operation:'disconnect'});
      assert.equal(await rpc(b.client,'dt_read_document',{document:doc.id}),null);
      assert.ok((await rpc(sender.client,'dt_read_document',{document:doc.id})).payload);
    } finally {
      okay(await admin.storage.from(bucket).remove([object]));
    }
    console.log('Supabase Auth, three concurrent test accounts, PostgREST, RLS, timed sharing, and Storage passed.');
  } finally {
    for(const id of users) {
      // End active membership before deleting the fictional identity.
      await admin.rpc('dt_begin_delete',{actor:id});
      await admin.auth.admin.deleteUser(id);
    }
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
