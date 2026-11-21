import {NextRequest,NextResponse} from 'next/server';
import {account,privateStorage} from '@/lib/accounts/server';
import {appOrigin} from '@/lib/accounts/config';
import {describeDocument,sourceIdPattern,uuidPattern,type CloudDocument,type ScopeResult} from '@/lib/accounts/documents';
import {isSpaceKind} from '@/lib/accounts/identity';
import {packMedia,restoreMedia} from '@/lib/accounts/media';

const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const failure=(status:number,error:string)=>NextResponse.json({error},{status,headers});
const limit=54_000_000;
async function boundedJson(request:NextRequest) {
  const reader=request.body?.getReader();
  if(!reader)throw new Error('A document is required.');
  const chunks:Uint8Array[]=[];
  let size=0;
  try {
    for(;;) {
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.length;
      if(size>limit)throw new Error('This save exceeds the 54 MB request limit. Save smaller batches.');
      chunks.push(value);
    }
  } finally {await reader.cancel().catch(()=>{});}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string,unknown>;
}

export async function POST(request:NextRequest) {
  if(request.headers.get('origin')!==appOrigin())return failure(403,'This request must come from Dear Tomorrow.');
  const session=await account();
  if(!session)return failure(401,'Sign in and verify your email to open your private library.');
  const {client,user}=session;
  if(request.headers.get('x-dear-account')!==user.id)return failure(409,'This tab belongs to a different account. Reopen My Space.');
  try {
    const input=await boundedJson(request);
    const {action,kind}=input;
    if(action==='read') {
      if(typeof input.document!=='string'||!uuidPattern.test(input.document))return failure(404,'This memory is unavailable.');
      const {data,error}=await client.rpc('dt_read_document',{document:input.document});
      if(error||!data)return failure(404,'This memory is unavailable.');
      const doc=data as CloudDocument;
      const payload=await restoreMedia(doc.payload,doc.ownerId+'/'+doc.kind+'/'+doc.sourceId,privateStorage());
      const {ownerId,...view}=doc;
      return NextResponse.json({...view,payload},{headers});
    }
    if(!isSpaceKind(kind))return failure(400,'Choose a valid workspace.');
    if(action==='scope') {
      const id=input.id;
      if(id!==undefined&&(typeof id!=='string'||!sourceIdPattern.test(id)))return failure(400,'Choose a valid memory.');
      const {data,error}=await client.rpc('dt_scope',{kind_name:kind,include_content:input.content===true,entry_id:id??null});
      if(error||!data)return failure(403,'This private library could not be opened.');
      const scope=data as ScopeResult;
      if(input.content===true) {
        const store=privateStorage();
        for(const item of scope.documents)item.payload=await restoreMedia(item.payload,user.id+'/'+kind+'/'+item.id,store);
      }
      return NextResponse.json(scope,{headers});
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
    return failure(400,error instanceof Error?error.message:'The private workspace could not complete this request.');
  }
}
