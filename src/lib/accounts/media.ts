import 'server-only';
import {createHash} from 'node:crypto';
import {privateStorage} from './server';

export const mediaBucket='dear-tomorrow-private';
const marker='$dearMedia';
const allow = /^data:(image\/(?:jpeg|png|webp)|audio\/(?:wav|mpeg|ogg|webm|mp4));base64,([A-Za-z0-9+/]+={0,2})$/;
type Store=NonNullable<ReturnType<typeof privateStorage>>;
function expectedBytes(bytes:Buffer,mime:string) {
  if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='image/png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/webp')return bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(mime==='audio/wav')return bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE';
  if(mime==='audio/mpeg')return bytes.toString('ascii',0,3)==='ID3'||bytes[0]===255&&(bytes[1]&0xe0)===0xe0;
  if(mime==='audio/ogg')return bytes.toString('ascii',0,4)==='OggS';
  if(mime==='audio/webm')return bytes.subarray(0,4).equals(Buffer.from([26,69,223,163]));
  return mime==='audio/mp4'&&bytes.toString('ascii',4,8)==='ftyp';
}

export async function saveImage(bytes:Buffer,mime:string,owner:string,store:Store) {
  if(!/^image\/(jpeg|png|webp)$/.test(mime)||bytes.length>1500000||!expectedBytes(bytes,mime)) {
    throw new Error('Choose a valid JPEG, PNG, or WebP photo under 1.5 MB.');
  }
  const key=owner+'/avatar/'+digest(bytes);
  await upload(bytes,mime,key,store);
  return key;
}
const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
async function upload(bytes:Buffer,type:string,key:string,store:Store) {
  const {error}=await store.storage.from(mediaBucket).upload(key,bytes,{contentType:type,upsert:false,cacheControl:'0'});
  if(error && !('statusCode' in error && String(error.statusCode)==='409'))throw new Error('A private attachment could not be saved. Retry before leaving.');
}

async function walk(value:unknown,convert:(item:unknown)=>Promise<{value:unknown}|null>,depth=0):Promise<unknown> {
  if(depth>85)throw new Error('This document is nested too deeply.');
  const replacement=await convert(value);
  if(replacement)return replacement.value;
  if(Array.isArray(value)) {
    const items=[];
    for(const item of value)items.push(await walk(item,convert,depth+1));
    return items;
  }
  if(value && typeof value==='object') {
    const pairs: [string,unknown][]=[];
    for(const [key,item] of Object.entries(value))pairs.push([key,await walk(item,convert,depth+1)]);
    return Object.fromEntries(pairs);
  }
  return value;
}

export async function packMedia(payload:unknown,prefix:string,store:Store|null) {
  return walk(payload,async item=>{
    if(item&&typeof item==='object'&&Object.hasOwn(item,marker))throw new Error('This document contains a reserved attachment field.');
    if(typeof item!=='string'||!item.startsWith('data:'))return null;
    const match=allow.exec(item);
    if(!match)return null;
    const [,mime,base64]=match;
    const bytes=Buffer.from(base64,'base64');
    if(bytes.length>6000000||!expectedBytes(bytes,mime))throw new Error('A photograph or audio attachment could not be verified.');
    if(!store)throw new Error('Private media storage is not configured.');
    const key=prefix+'/'+digest(bytes);
    await upload(bytes,mime,key,store);
    return {value:{[marker]:key,mime}};
  });
}

export function restoreMedia(payload:unknown,prefix:string,store:Store|null) {
  return walk(payload,async item=>{
    if(!item||typeof item!=='object'||!Object.hasOwn(item,marker))return null;
    const entry=item as Record<string,unknown>;
    const {mime}=entry,key=entry[marker];
    if(typeof key!=='string'||typeof mime!=='string'||!key.startsWith(prefix+'/')||
      !/^[a-f0-9]{64}$/.test(key.slice(prefix.length+1))||!allow.test('data:'+mime+';base64,AA==')) {
      throw new Error('An attachment reference failed its ownership check.');
    }
    if(!store)throw new Error('Private media storage is not configured.');
    const {data,error}=await store.storage.from(mediaBucket).download(key);
    if(error||!data)throw new Error('A private attachment could not be retrieved.');
    const bytes=Buffer.from(await data.arrayBuffer());
    if(!expectedBytes(bytes,mime))throw new Error('A private attachment could not be verified.');
    return {value:'data:'+mime+';base64,'+bytes.toString('base64')};
  });
}

export async function removeOwnedMedia(owner:string,store:Store) {
  const bucket=store.storage.from(mediaBucket);
  async function remove(prefix:string,depth:number) {
    if(depth>4)throw new Error('Private file cleanup needs attention.');
    for(;;) {
      const {data,error}=await bucket.list(prefix,{limit:100,sortBy:{column:'name',order:'asc'}});
      if(error)throw new Error('Private file cleanup could not be completed.');
      if(!data?.length)return;
      if(depth===4&&data.some(item=>!item.id))throw new Error('Private file cleanup needs attention.');
      const files=[];
      for(const item of data) {
        const key=prefix+'/'+item.name;
        if(item.id)files.push(key);else await remove(key,depth+1);
      }
      if(files.length) {
        const {error:failure}=await bucket.remove(files);
        if(failure)throw new Error('Private file cleanup could not be completed.');
      }
    }
  }
  await remove(owner,0);
}
