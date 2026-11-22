import {NextRequest,NextResponse} from 'next/server';
import {account,privateStorage} from '@/lib/accounts/server';
import {appOrigin,matchesHostedOrigin} from '@/lib/accounts/config';
import {describeDocument,sourceIdPattern,uuidPattern,type CloudDocument,type ScopeResult} from '@/lib/accounts/documents';
import {isSpaceKind} from '@/lib/accounts/identity';
import {packMedia,restoreMedia} from '@/lib/accounts/media';
import {cloudChunkBytes,cloudMaxParts,cloudRequestBytes,directCloudRequestBytes} from '@/lib/accounts/cloud-transport';

const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const failure=(status:number,error:string)=>NextResponse.json({error},{status,headers});
class BodyTooLarge extends Error {}
async function boundedBytes(request:NextRequest,limit:number) {
  const reader=request.body?.getReader();
  if(!reader)throw new Error('A document is required.');
  const chunks:Uint8Array[]=[];
  let size=0;
  try {
    for(;;) {
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.length;
      if(size>limit)throw new BodyTooLarge();
      chunks.push(value);
    }
  } finally {await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks);
}

function streamedJson(value:unknown) {
  const body=new Blob([JSON.stringify(value)]);
  let offset=0;
  const stream=new ReadableStream<Uint8Array>({
    async pull(controller) {
      const part=await body.slice(offset,offset+64*1024).arrayBuffer();
      controller.enqueue(new Uint8Array(part));
      offset+=part.byteLength;
      if(offset===body.size)controller.close();
    },
  });
  return new Response(stream,{headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
}

async function stageChunk(request:NextRequest,actor:string,transfer:string) {
  const ordinal=request.headers.get('x-dear-part');
  if(!uuidPattern.test(transfer)||!ordinal||!/^\d{1,2}$/.test(ordinal)||Number(ordinal)>=cloudMaxParts||
    request.headers.get('content-type')!=='application/octet-stream')return failure(400,'Invalid upload fragment.');
  const store=privateStorage();
  if(!store)return failure(503,'Private upload storage is not configured.');
  const bytes=await boundedBytes(request,cloudChunkBytes);
  if(!bytes.length)return failure(400,'Invalid upload fragment.');
  const {error}=await store.rpc('dt_stage_cloud_chunk',{actor,transfer,ordinal:Number(ordinal),encoded:bytes.toString('base64')});
  if(error?.code==='54000')return failure(409,'Another upload is still in progress. Keep this draft open and retry.');
  if(error)return failure(503,'The upload fragment could not be saved. Keep this draft open and retry.');
  return NextResponse.json({staged:true},{headers});
}

async function readTransfer(actor:string,transfer:string,parts:number,store:NonNullable<ReturnType<typeof privateStorage>>) {
  const chunks:Buffer[]=[];
  let total=0;
  for(let first=0;first<parts;first+=4) {
    const batch=await Promise.all(Array.from({length:Math.min(4,parts-first)},(_,i)=>
      store.rpc('dt_read_cloud_chunk',{actor,transfer,ordinal:first+i,parts})));
    for(const {data,error} of batch) {
      if(error||typeof data!=='string')return null;
      const chunk=Buffer.from(data,'base64');
      if(!chunk.length||chunk.length>cloudChunkBytes||(chunks.length<parts-1&&chunk.length!==cloudChunkBytes))return null;
      total+=chunk.length;
      if(total>cloudRequestBytes)throw new BodyTooLarge();
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks,total);
}

export async function POST(request:NextRequest) {
  if(!matchesHostedOrigin(request.headers.get('host'))||request.headers.get('origin')!==appOrigin())return failure(403,'This request must come from Dear Tomorrow.');
  const session=await account();
  if(!session)return failure(401,'Sign in and verify your email to open your private library.');
  const {client,user}=session;
  if(request.headers.get('x-dear-account')!==user.id)return failure(409,'This tab belongs to a different account. Reopen My Space.');
  try {
    const transfer=request.headers.get('x-dear-transfer');
    if(transfer!==null)return await stageChunk(request,user.id,transfer);
    const requestLimit=process.env.VERCEL==='1'?directCloudRequestBytes:cloudRequestBytes;
    let input=JSON.parse((await boundedBytes(request,requestLimit)).toString('utf8')) as Record<string,unknown>;
    if(input?.action==='complete-upload'||input?.action==='cancel-upload') {
      const {upload,parts}=input;
      if(typeof upload!=='string'||!uuidPattern.test(upload))return failure(400,'Invalid upload.');
      const store=privateStorage();
      if(!store)return failure(503,'Private upload storage is not configured.');
      if(input.action==='cancel-upload') {
        const {error}=await store.rpc('dt_drop_cloud_transfer',{actor:user.id,transfer:upload});
        return error?failure(503,'The upload could not be canceled.'):NextResponse.json({canceled:true},{headers});
      }
      if(typeof parts!=='number'||!Number.isInteger(parts)||parts<2||parts>cloudMaxParts)return failure(400,'Invalid upload.');
      const saved=await readTransfer(user.id,upload,parts,store);
      if(!saved)return failure(409,'This upload expired or is incomplete. Keep this draft open and retry.');
      const {error}=await store.rpc('dt_drop_cloud_transfer',{actor:user.id,transfer:upload});
      if(error)return failure(503,'The upload could not be completed. Keep this draft open and retry.');
      input=JSON.parse(saved.toString('utf8')) as Record<string,unknown>;
      if(input?.action!=='save')return failure(400,'Only a save can use a staged upload.');
    }
    if(!input||typeof input!=='object'||Array.isArray(input))return failure(400,'This change could not be read.');
    const {action,kind}=input;
    if(action==='read') {
      if(typeof input.document!=='string'||!uuidPattern.test(input.document))return failure(404,'This memory is unavailable.');
      const {data,error}=await client.rpc('dt_read_document',{document:input.document});
      if(error||!data)return failure(404,'This memory is unavailable.');
      const doc=data as CloudDocument;
      const payload=await restoreMedia(doc.payload,doc.ownerId+'/'+doc.kind+'/'+doc.sourceId,privateStorage());
      const {ownerId,...view}=doc;
      return streamedJson({...view,payload});
    }
    if(!isSpaceKind(kind))return failure(400,'Choose a valid workspace.');
    if(action==='scope') {
      const id=input.id;
      if(id!==undefined&&(typeof id!=='string'||!sourceIdPattern.test(id)))return failure(400,'Choose a valid memory.');
      if(input.content===true&&id===undefined)return failure(400,'Choose one memory to open.');
      const {data,error}=await client.rpc('dt_scope',{kind_name:kind,include_content:input.content===true,entry_id:id??null});
      if(error||!data)return failure(403,'This private library could not be opened.');
      const scope=data as ScopeResult;
      if(input.content===true) {
        const store=privateStorage();
        for(const item of scope.documents)item.payload=await restoreMedia(item.payload,user.id+'/'+kind+'/'+item.id,store);
      }
      return streamedJson(scope);
    }
    if(action!=='save'||!Number.isSafeInteger(input.expected)||!Array.isArray(input.changes)||input.changes.length>100||
      !Array.isArray(input.removals)||!input.removals.every(id=>typeof id==='string'&&sourceIdPattern.test(id))) {
      return failure(400,'This change could not be read.');
    }
    const {error:authError}=await client.rpc('dt_scope',{kind_name:kind,include_content:false});
    if(authError)return failure(403,'This account cannot save changes.');
    const importing=input.importing===true;
    const raw=input.changes.map(change=>describeDocument(kind,change));
    if(new Set(raw.map(item=>item.id)).size!==raw.length||raw.some(item=>!sourceIdPattern.test(item.id)))return failure(400,'Document IDs must be distinct.');
    const receipt=importing&&typeof input.receipt==='string'&&/^[a-f0-9]{64}$/.test(input.receipt)?input.receipt:null;
    if(importing&&!receipt)return failure(400,'This import needs its source fingerprint.');
    if(receipt) {
      const {data,error}=await client.from('dt_imports').select('source_id').eq('owner_id',user.id).eq('kind',kind)
        .eq('fingerprint',receipt).maybeSingle();
      if(error)return failure(503,'Import status could not be confirmed.');
      if(data)return NextResponse.json({imported:false,sourceId:data.source_id},{headers});
    }
    const store=privateStorage();
    const changes=[];
    for(const doc of raw) {
      const payload=await packMedia(doc.payload,user.id+'/'+kind+'/'+doc.id,store);
      changes.push({...doc,payload});
    }
    const {data,error}=await client.rpc('dt_commit_scope',{
      kind_name:kind,expected:input.expected,changes,removals:input.removals,meta:input.metadata??{},receipt,
    });
    if(error?.code==='40001')return failure(409,'Another tab saved a newer version. Export this draft and reopen your library before retrying.');
    if(error||!data)return failure(503,'The cloud could not confirm this save. Reopen your library to check the saved version.');
    return NextResponse.json(data,{headers});
  } catch(error) {
    if(error instanceof BodyTooLarge)return failure(413,'This upload exceeds the allowed request size.');
    return failure(400,'The private workspace could not complete this request. Keep your draft open or export a backup.');
  }
}
