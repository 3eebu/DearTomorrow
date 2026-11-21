const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const path=require('node:path');

const exportsUnderTest={};
const code=fs.readFileSync(path.resolve(__dirname,'../src/lib/accounts/media.ts'),'utf8');
const {outputText}=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
vm.runInNewContext(outputText,{exports:exportsUnderTest,Buffer,require:name=>name==='server-only'?{}:require(name)});
const {packMedia,restoreMedia,saveImage}=exportsUnderTest;
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==';
const owner='a19a7231-de92-4649-8f7d-34d5bbb24558';
const scope=owner+'/journeys/journey-a';

function testBucket() {
  const files=new Map();
  let reads=0;
  const store={storage:{from:bucket=>{
    assert.equal(bucket,'dear-tomorrow-private');
    return {
      upload:async(key,bytes,options)=>{
        assert.equal(options.upsert,false);
        if(files.has(key))return {error:{statusCode:'409'}};
        files.set(key,{bytes,options});
        return {error:null};
      },
      download:async key=>{
        reads++;
        const file=files.get(key);
        return file?{data:new Blob([file.bytes],{type:file.options.contentType}),error:null}:{data:null,error:{message:'Missing file'}};
      },
    };
  }}};
  return {store,files,reads:()=>reads};
}

test('private attachment sidecars preserve complete bytes, nested references, and repeat saves',async()=>{
  const {store,files}=testBucket();
  const original={id:'journey-a',checkpoints:[{id:'first',letter:{pages:[{text:'A little note.',photo:{data:photo}}]}}]};
  const remote=await packMedia(original,scope,store);
  assert.ok(!JSON.stringify(remote).includes('base64'));
  const reference=remote.checkpoints[0].letter.pages[0].photo.data.$dearMedia;
  assert.match(reference,/journeys\/journey-a\/[a-f0-9]{64}$/);
  assert.equal(files.size,1);
  await packMedia(original,scope,store);
  assert.equal(files.size,1);
  assert.equal(JSON.stringify(await restoreMedia(remote,scope,store)),JSON.stringify(original));
});

test('media lookups reject another owner, another document, and injected manifest fields before downloading',async()=>{
  const {store,reads}=testBucket();
  const sealed=await packMedia({photo},scope,store);
  await assert.rejects(restoreMedia(sealed,scope+'-other',store),/ownership/);
  await assert.rejects(restoreMedia(sealed,'some-other-owner/journeys/journey-a',store),/ownership/);
  await assert.rejects(packMedia(sealed,scope,store),/reserved/);
  assert.equal(reads(),0);
});

test('media type is verified and missing Storage prevents a false save',async()=>{
  const {store}=testBucket();
  await assert.rejects(packMedia({photo},scope,null),/not configured/);
  await assert.rejects(packMedia({photo:'data:image/jpeg;base64,AA=='},scope,store),/could not be verified/);
  await assert.rejects(saveImage(Buffer.from('<svg/>'),'image/svg+xml',owner,store),/valid JPEG/);
});
