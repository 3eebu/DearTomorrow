const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { test } = require('node:test');
const { PGlite } = require('@electric-sql/pglite');
const { sandbox, databaseAccess } = require('./accounts-db-fixture.cjs');
const { loadServerModule } = require('./phase4-server-fixture.cjs');

const { packMedia, restoreMedia, removeOwnedMedia, mediaBucket } = loadServerModule('src/lib/accounts/media.ts');
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==';
const audio = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==';

function diskBucket(root, db) {
  const file = key => path.join(root, key);
  return { storage: { from(bucket) {
    assert.equal(bucket, mediaBucket);
    return {
      async upload(key, bytes) {
        await fs.mkdir(path.dirname(file(key)), { recursive:true });
        try { await fs.writeFile(file(key), bytes, { flag:'wx' }); }
        catch (err) {
          if (err.code === 'EEXIST') return { error:{statusCode:'409'} };
          throw err;
        }
        await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', [bucket,key]);
        return {error:null};
      },
      async download(key) {
        try { return {data:new Blob([await fs.readFile(file(key))]),error:null}; }
        catch { return {data:null,error:{message:'Unavailable fixture file'}}; }
      },
      async list(prefix, {limit}) {
        const entries = await fs.readdir(file(prefix), {withFileTypes:true}).catch(err => {
          if (err.code !== 'ENOENT') throw err;
          return [];
        });
        return {data:entries.slice(0,limit).map(e => ({name:e.name,id:e.isFile()?e.name:null})),error:null};
      },
      async remove(keys) {
        for (const key of keys) {
          await fs.unlink(file(key));
          let parent = path.dirname(file(key));
          while (parent !== root) {
            try { await fs.rmdir(parent); }
            catch (err) { if (err.code === 'ENOTEMPTY') break; throw err; }
            parent = path.dirname(parent);
          }
          await db.query('delete from storage.objects where bucket_id=$1 and name=$2', [bucket,key]);
        }
        return {error:null};
      },
    };
  }}};
}

async function withBuckets(run) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'dear-phase4-'));
  try { return await run({root,source:path.join(root,'source'),target:path.join(root,'restored')}); }
  finally { await fs.rm(root, {recursive:true,force:true}); }
}

async function authorizedRead(fn, actor, id, store) {
  const record = await fn(actor,'dt_read_document',[id]);
  if (!record?.payload) return record;
  return {...record,payload:await restoreMedia(record.payload,
    [record.ownerId,record.kind,record.sourceId].join('/'),store)};
}

test('isolated PostgreSQL snapshot and separate media backup restore ownership, bytes and sharing', async t => {
  await withBuckets(async ({root,source,target}) => {
    const startBackup = performance.now();
    let captureMs, ids, docs, stableId, revisions;
    const originals = {
      books:{id:'fictional-book',pages:[{picture:photo,voice:audio}]},
      trees:{id:'fictional-tree',memories:[{title:'A fictional date',picture:photo}]},
      letters:{id:'fictional-letter',kind:'tomorrow',state:'scheduled',release:{instant:Date.now()+86400000},pages:[{voice:audio}]},
      journeys:{id:'fictional-journey',checkpoints:[]},
    };
    await sandbox(async ({db,ids:actors,fn,profile,listing,request,commit,entry}) => {
      ids = actors;
      stableId = (await profile(ids.a)).dear_id;
      const store = diskBucket(source,db);
      for (const [kind,payload] of Object.entries(originals)) {
        const packed = await packMedia(payload, [ids.a,kind,payload.id].join('/'), store);
        await commit(ids.a,kind,0,[entry(packed)]);
      }
      docs = await listing(ids.a);
      const pending = await request(ids.a,ids.b);
      assert.equal((await fn(ids.b,'dt_connection_action',['accept',pending.id])).paired,true);
      for (const kind of ['books','letters']) {
        await fn(ids.a,'dt_share',[docs.find(doc=>doc.kind===kind).id,true]);
      }
      revisions = (await db.query('select kind,revision from public.dt_workspaces order by kind')).rows;
      const snapshot = await db.dumpDataDir();
      await fs.writeFile(path.join(root,'postgres.tar'), Buffer.from(await snapshot.arrayBuffer()));
      await fs.cp(source, path.join(root,'media-backup'), {recursive:true});
      captureMs = Math.round(performance.now()-startBackup);
    });

    const startRestore = performance.now();
    const loadDataDir = new Blob([await fs.readFile(path.join(root,'postgres.tar'))]);
    const recovered = new PGlite({loadDataDir});
    try {
      await fs.cp(path.join(root,'media-backup'), target, {recursive:true});
      const store = diskBucket(target,recovered);
      const {act,fn,profile,listing} = databaseAccess(recovered,ids);
      assert.equal((await profile(ids.a)).dear_id,stableId);
      assert.equal((await listing(ids.a)).length,4);
      assert.deepEqual((await recovered.query('select kind,revision from public.dt_workspaces order by kind')).rows,revisions);
      assert.deepEqual((await listing(ids.b,true)).map(item=>item.kind).sort(),['books','letters']);
      let checkedAttachments = 0;
      for (const doc of docs) {
        const owner = await authorizedRead(fn,ids.a,doc.id,store);
        assert.equal(owner.ownerId,ids.a);
        assert.equal(owner.owned,true);
        assert.deepEqual(JSON.parse(JSON.stringify(owner.payload)),originals[doc.kind]);
        const partner = await authorizedRead(fn,ids.b,doc.id,store);
        if (doc.kind==='books') {
          assert.equal(partner.owned,false);
          assert.deepEqual(JSON.parse(JSON.stringify(partner.payload)),originals.books);
        } else if (doc.kind==='letters') {
          assert.equal(partner.locked,true);
          assert.equal(partner.payload,null);
        } else assert.equal(partner,null);
        assert.equal(await authorizedRead(fn,ids.c,doc.id,store),null);
        await assert.rejects(authorizedRead(
          (_,name,params)=>fn(null,name,params,'anon'),null,doc.id,store
        ),/permission denied/);
        const serialized = JSON.stringify(owner.payload);
        checkedAttachments += (serialized.match(/data:(?:audio|image)\//g)??[]).length;
      }
      assert.equal((await act(ids.b,'select name from storage.objects')).length,0);
      assert.equal((await act(ids.c,'select id from public.dt_documents')).length,0);
      await assert.rejects(fn(ids.unverified,'dt_scope',['books',false]),/Verify your email/);
      const book = docs.find(doc=>doc.kind==='books');
      await fn(ids.a,'dt_share',[book.id,false]);
      assert.equal(await authorizedRead(fn,ids.b,book.id,store),null);
      assert.ok((await authorizedRead(fn,ids.a,book.id,store)).payload);
      t.diagnostic(JSON.stringify({
        scope:'isolated PostgreSQL and filesystem media',
        fixtureThroughBackupMs:captureMs, restoreAndVerifyMs:Math.round(performance.now()-startRestore),
        restoredDocuments:docs.length, checkedAttachments,
      }));
    } finally { await recovered.close(); }
  });
});

test('retention inventory protects references, drafts, recent uploads and unrelated accounts', async t => {
  await withBuckets(async ({source}) => sandbox(async ({db,ids,fn,entry}) => {
    const store = diskBucket(source,db);
    const save = (actor,rev,docs,removals=[],metadata={})=>fn(actor,'dt_commit_scope',
      ['books',rev,JSON.stringify(docs),JSON.stringify(removals),JSON.stringify(metadata),null]);
    const make = (owner,id,attachment=photo)=>packMedia({id,attachment}, [owner,'books',id].join('/'),store);
    const keep = await make(ids.a,'kept');
    const remove = await make(ids.a,'attachment-removed');
    const deleted = await make(ids.a,'document-deleted');
    const unrelated = await make(ids.b,'keep-unrelated');
    await save(ids.a,0,[{...entry(keep),draft:true},entry(remove),entry(deleted)]);
    await save(ids.b,0,[entry(unrelated)]);
    const orphan = await make(ids.a,'lost-race');
    await assert.rejects(save(ids.a,0,[entry(orphan)]),/newer version/);
    await save(ids.a,1,[entry({id:remove.id})],[deleted.id]);
    const recent = await make(ids.a,'upload-in-progress');
    const keys = [keep,remove,deleted,orphan,unrelated].map(x=>x.attachment.$dearMedia);
    const read = store.storage.from(mediaBucket).download;
    const referencedElsewhere = await make(ids.a,'revision-metadata');
    const retainedKey = referencedElsewhere.attachment.$dearMedia;
    await db.query("update public.dt_workspaces set metadata=$1 where owner_id=$2",
      [JSON.stringify({editor:{current:[referencedElsewhere]}}),ids.a]);
    await db.query("update storage.objects set created_at=now()-interval '2 days',updated_at=now()-interval '2 days' where name=any($1)",[[...keys,retainedKey]]);
    const cutoff = new Date(Date.now()-86400000).toISOString();
    const inventory = await fs.readFile(path.resolve(__dirname,'../scripts/private-media-inventory.sql'),'utf8');
    const candidates = async () => (await db.query(inventory,[ids.a,cutoff])).rows.map(row=>row.name);
    assert.deepEqual(await candidates(),[keys[1],keys[2],keys[3]].sort());
    assert.ok((await read(recent.attachment.$dearMedia)).data);
    for (const key of keys) assert.ok((await read(key)).data);

    // A second snapshot sees this saved reference. Demonstrate exclusion and
    // removal only after local fixture writers have finished.
    await save(ids.a,2,[entry(orphan)],[],{editor:{current:[referencedElsewhere]}});
    const reviewed = await candidates();
    assert.deepEqual(reviewed,[keys[1],keys[2]].sort());
    await store.storage.from(mediaBucket).remove(reviewed);
    for(const key of reviewed) assert.equal((await read(key)).data,null);
    for(const key of [keys[0],keys[3],keys[4],recent.attachment.$dearMedia]) assert.ok((await read(key)).data);

    const transfer = randomUUID();
    const stage = (owner,id) => fn(null,'dt_stage_cloud_chunk',[owner,id,0,'YQ=='],'service_role');
    await stage(ids.a,transfer);
    const expiry = (await db.query('select extract(epoch from (expires_at-now()))::int as seconds from dt_private.cloud_chunks where transfer_id=$1',[transfer])).rows[0].seconds;
    assert.ok(expiry>1790&&expiry<=1800);
    assert.equal(await fn(null,'dt_read_cloud_chunk',[ids.a,transfer,0,2],'service_role'),null);
    await db.query("update dt_private.cloud_chunks set expires_at=now()-interval '1 second' where transfer_id=$1",[transfer]);
    await stage(ids.b,randomUUID());
    assert.equal((await db.query('select count(*)::int as count from dt_private.cloud_chunks where transfer_id=$1',[transfer])).rows[0].count,0);

    const closingTransfer = randomUUID();
    await stage(ids.a,closingTransfer);
    await fn(null,'dt_begin_delete',[ids.a],'service_role');
    assert.deepEqual(await candidates(),[]);
    await removeOwnedMedia(ids.a,store);
    await db.query('delete from auth.users where id=$1',[ids.a]);
    assert.equal((await db.query('select count(*)::int as count from storage.objects where name like $1',[ids.a+'/%'])).rows[0].count,0);
    assert.equal((await db.query('select count(*)::int as count from dt_private.cloud_chunks where owner_id=$1',[ids.a])).rows[0].count,0);
    assert.ok((await read(keys[4])).data);
    t.diagnostic(JSON.stringify({observedFragmentDeadlineSeconds:expiry,staleSaveRetainedObject:true,
      removedAttachmentAndDocumentRetainedObjects:true,fixtureCandidatesSafelyRemoved:reviewed.length}));
  }));
});
