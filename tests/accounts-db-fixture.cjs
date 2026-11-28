const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {PGlite} = require('@electric-sql/pglite');
const {randomUUID} = require('node:crypto');

// Real PostgreSQL roles and policies in a disposable engine. Only the Supabase-managed
// Auth and Storage interfaces are supplied here. Hosted services need the separate smoke test.
const platform = `
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
grant usage on schema auth to authenticated,anon;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable
  as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
create schema storage;
grant usage on schema storage to authenticated,anon;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text,created_at timestamptz default now(),updated_at timestamptz default now());
alter table storage.objects enable row level security;
grant select on storage.objects to authenticated,anon;
create policy existing_bucket_policy on storage.objects for select to authenticated using(true);
`;

async function sandbox(work) {
  const db=new PGlite();
  try {
    await db.exec(platform);
    const directory=path.resolve(__dirname,'../supabase/migrations');
    for(const file of (await fs.readdir(directory)).filter(item=>item.endsWith('.sql')).sort())await db.exec(await fs.readFile(path.join(directory,file),'utf8'));
    const ids={a:randomUUID(),b:randomUUID(),c:randomUUID(),unverified:randomUUID()};
    for(const [name,id] of Object.entries(ids))await db.query(
      'insert into auth.users values($1,$2,case when $3 then now() end,$4)',
      [id,name+'@fictional.test',name!=='unverified',JSON.stringify({display_name:name==='c'?'Casey':'Sam'})]);
    const access=databaseAccess(db,ids);
    const entry=(payload,title='Fictional memory')=>({id:payload.id,title,draft:false,summary:{},payload});
    await work({db,ids,...access,entry});
  } finally {await db.close();}
}

function databaseAccess(db,ids) {
  function act(actor,query,params=[],role='authenticated') {
    return db.transaction(async tx=>{
      await tx.exec('set local role '+role);
      if(actor)await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
      return (await tx.query(query,params)).rows;
    });
  }
  const value=async(actor,sql,params=[],role)=>(await act(actor,sql,params,role))[0]?.result;
  const fn=(actor,name,params=[],role)=>value(actor,'select public.'+name+'('+params.map((_,i)=>'$'+(i+1)).join(',')+') as result',params,role);
  const profile=async(actor)=>(await act(actor,'select * from public.dt_profiles'))[0];
  const listing=(actor,shared=false)=>fn(actor,'dt_library',[shared]);
  async function request(from,to) {
    const lookup=await fn(from,'dt_find_account',[(await profile(to)).dear_id]);
    assert.ok(lookup.match);
    assert.equal((await fn(from,'dt_connection_action',['send',lookup.match])).ok,true);
    return (await fn(to,'dt_connection_view')).requests.find(row=>row.incoming&&row.status==='pending'&&row.name===(from===ids.c?'Casey':'Sam'));
  }
  const commit=(actor,kind,rev,docs,receipt=null)=>fn(actor,'dt_commit_scope',[
    kind,rev,JSON.stringify(docs),'[]','{}',receipt,
  ]);
  return {act,fn,profile,listing,request,commit};
}

module.exports = {sandbox,databaseAccess};
