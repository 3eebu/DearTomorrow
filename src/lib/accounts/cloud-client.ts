import type {Shelf,saveShelf} from '../letter-storage';
import type {SavedGrove} from '../memory-tree-storage';
import type {SavedJourney} from '../journey-letter-storage';
import {defaultPreferences, startingCollections, summarize, validateCollections, validatePreferences, validateSummary,type Letter,type Preferences} from '../letters';
import {validateGrove, type Grove, type Photo, type Tree} from '../memory-tree';
import type {MemoryBookDocument} from '../memory-books';
import {validateJourneySummary, type Journey} from '../journey-letters';
import {validateDocument,type CloudScope,type ScopeResult,type CloudDocument} from './documents';
import type {SpaceKind} from './identity';
import {cloudChunkBytes,cloudRequestBytes,directCloudRequestBytes} from './cloud-transport';
import type {BookShelfEntry} from '../book-shelf';

async function cloudPost<T>(owner:string,body:BodyInit,headers:Record<string,string>):Promise<T> {
  if(typeof navigator!=='undefined'&&!navigator.onLine)throw new Error('Offline. Keep this draft open or export a backup before leaving.');
  let response:Response;
  try {
    response=await fetch('/api/private-space',{method:'POST',cache:'no-store',credentials:'same-origin',
      headers:{...headers,'X-Dear-Account':owner},body});
  } catch {throw new Error('Couldn’t sync. Check your connection and retry, or export your draft.');}
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result)throw new Error(result?.error || (response.status===413
    ? 'This upload exceeded the transport limit. Keep this draft open or export a backup.'
    : 'The cloud could not confirm this request. Keep this draft open or export a backup.'));
  return result as T;
}

export function requestCloud<T>(owner:string,fields:Record<string,unknown>):Promise<T> {
  return cloudPost<T>(owner,JSON.stringify(fields),{'Content-Type':'application/json'});
}

export async function readCloud(owner:string,kind:SpaceKind,content=false,id?:string):Promise<ScopeResult> {
  if(!content||id!==undefined)return requestCloud(owner,{action:'scope',kind,content,id});
  const snapshot=await requestCloud<ScopeResult>(owner,{action:'scope',kind,content:false});
  const documents:ScopeResult['documents']=[];
  for(let first=0;first<snapshot.documents.length;first+=4) {
    const batch=await Promise.all(snapshot.documents.slice(first,first+4).map(entry=>
      requestCloud<ScopeResult>(owner,{action:'scope',kind,content:true,id:entry.id})));
    for(const result of batch) {
      if(result.revision!==snapshot.revision||result.documents.length!==1) {
        throw new Error('Your library changed while it was opening. Reopen it to see the latest version.');
      }
      documents.push(result.documents[0]);
    }
  }
  return {...snapshot,documents};
}
export const readDocument = (owner:string,document:string) =>
  requestCloud<Omit<CloudDocument,'ownerId'>>(owner,{action:'read',document});
type CommitResult = {revision:number;imported?:boolean;sourceId?:string};
export async function commitCloud(owner:string,kind:SpaceKind,expected:number,changes:unknown[],removals:string[],
  metadata:Record<string,unknown>,receipt?:string):Promise<CommitResult> {
  const payload=new Blob([JSON.stringify({action:'save',kind,expected,changes,removals,metadata,importing:!!receipt,receipt})],
    {type:'application/json'});
  if(payload.size>cloudRequestBytes)throw new Error('This save exceeds the 54 MB request limit. Save smaller batches or export a backup.');
  const confirmed=(result:CommitResult)=>{
    if(result.revision!==expected+1&&!(receipt&&result.imported===false&&typeof result.sourceId==='string')) {
      throw new Error('The cloud could not confirm this save. Reopen your library to check the saved version.');
    }
    return result;
  };
  if(payload.size<=directCloudRequestBytes)return confirmed(await cloudPost(owner,payload,{'Content-Type':'application/json'}));

  const upload=crypto.randomUUID();
  const parts=Math.ceil(payload.size/cloudChunkBytes);
  try {
    for(let index=0;index<parts;index++) {
      const offset=index*cloudChunkBytes;
      const part=await cloudPost<{staged:boolean}>(owner,payload.slice(offset,offset+cloudChunkBytes),{
        'Content-Type':'application/octet-stream','X-Dear-Transfer':upload,'X-Dear-Part':String(index),
      });
      if(part.staged!==true)throw new Error('The cloud could not confirm this upload fragment. Keep your draft open and retry.');
    }
    return confirmed(await requestCloud(owner,{action:'complete-upload',upload,parts}));
  } catch(error) {
    await requestCloud(owner,{action:'cancel-upload',upload}).catch(()=>{});
    throw error;
  }
}
function atRevision(snapshot:ScopeResult,revision:number,id:string) {
  if(snapshot.revision!==revision||snapshot.documents.length!==1||snapshot.documents[0].id!==id) {
    throw new Error('Your library changed in another tab. Reload it before continuing.');
  }
  return snapshot.documents[0];
}

export function cloudLetters({owner}:CloudScope) {
  return {
    async loadShelf():Promise<Shelf> {
      const snapshot=await readCloud(owner,'letters');
      return {version:1,revision:snapshot.revision,summaries:snapshot.documents.map(item=>validateSummary(item.summary)),
        collections:validateCollections(snapshot.metadata.collections??startingCollections),
        preferences:validatePreferences((snapshot.metadata.preferences??defaultPreferences) as Preferences)};
    },
    async loadLetter(id:string) {
      const snapshot=await readCloud(owner,'letters',true,id);
      return validateDocument('letters',snapshot.documents[0]?.payload);
    },
    async saveShelf(previous:Shelf,change:Parameters<typeof saveShelf>[1]):Promise<Shelf> {
      const collections=validateCollections(change.collections??previous.collections);
      const preferences=validatePreferences(change.preferences??previous.preferences);
      const entries=new Map(previous.summaries.map(entry=>[entry.id,entry]));
      const letters=(change.letters??[]).map(doc=>validateDocument('letters',doc));
      for(const letter of letters)entries.set(letter.id,summarize(letter));
      if([...entries.values()].some(letter=>letter.collectionId&&!collections.some(group=>group.id===letter.collectionId))) {
        throw new Error('A letter belongs to a collection that could not be found.');
      }
      const result=await commitCloud(owner,'letters',previous.revision,letters,[],{collections,preferences});
      return {version:1,revision:result.revision,summaries:[...entries.values()],collections,preferences};
    },
  };
}

function diff<T extends {id:string}>(next:T[],previous:T[]) {
  const old=new Map(previous.map(item=>[item.id,item]));
  const changed=next.filter(item=>old.get(item.id)!==item);
  const ids=new Set(next.map(item=>item.id));
  return {changed,removed:previous.filter(item=>!ids.has(item.id)).map(item=>item.id)};
}
export function cloudBooks({owner}:CloudScope) {
  let revision:number|null=null;
  return {
    async loadLibrary() {
      const snapshot=await requestCloud<{revision:number;books:BookShelfEntry[]}>(owner,{action:'scope',kind:'books',view:'book-shelf'});
      revision=snapshot.revision;
      return snapshot.books;
    },
    async loadBook(entry:BookShelfEntry) {
      if(revision===null)throw new Error('Reopen your cloud library before opening this book.');
      const expected=revision;
      const snapshot=await readCloud(owner,'books',true,entry.id);
      return validateDocument('books',atRevision(snapshot,expected,entry.id).payload);
    },
    async saveLibrary(books:BookShelfEntry[],previous:BookShelfEntry[]) {
      if(revision===null)throw new Error('Reopen your cloud library before saving.');
      const {changed,removed}=diff(books,previous);
      const documents=changed.map(item=>{
        if(!item.document)throw new Error('Open this book before saving changes.');
        return item.document;
      });
      const result=await commitCloud(owner,'books',revision,documents,removed,{});
      revision=result.revision;
    },
  };
}
export function cloudTrees({owner}:CloudScope) {
  let previous:Grove['trees']=[];
  const photos=new Map<string,Set<string>>();
  async function prepareTree(tree:Tree,revision:number) {
    const existing=previous.find(item=>item.id===tree.id);
    const oldPhotos=photos.get(tree.id);
    const unchanged=new Map(existing?.memories.map(memory=>[memory.id,memory.photos]));
    const preserve=(memory:Tree['memories'][number])=>oldPhotos?.has(memory.id)&&
      unchanged.get(memory.id)===memory.photos&&memory.photos.length===0;
    if(!tree.memories.some(preserve))return tree;
    const source=validateDocument('trees',atRevision(await readCloud(owner,'trees',true,tree.id),revision,tree.id).payload);
    const restored=new Map(source.memories.map(memory=>[memory.id,memory.photos]));
    return {...tree,memories:tree.memories.map(memory=>preserve(memory)?
      {...memory,photos:restored.get(memory.id)!}:memory)};
  }
  return {
    async loadGarden():Promise<SavedGrove> {
      const snapshot=await readCloud(owner,'trees');
      const trees=await Promise.all(snapshot.documents.map(async ({id})=>{
        const index=await requestCloud<ScopeResult>(owner,{action:'scope',kind:'trees',id,content:true,view:'tree-index'});
        return atRevision(index,snapshot.revision,id);
      }));
      const grove=validateGrove({version:1,activeId:snapshot.metadata.activeId??'',trees:trees.map(entry=>entry.payload)});
      for(const entry of trees)photos.set(entry.id,new Set(entry.photoMemoryIds));
      previous=grove.trees;
      return {revision:snapshot.revision,grove};
    },
    hasPhotos(tree:string,memory:string) {return photos.get(tree)?.has(memory)??false;},
    async loadPhotos(tree:string,memory:string,revision:number) {
      const snapshot=await requestCloud<ScopeResult>(owner,{action:'scope',kind:'trees',id:tree,content:true,view:'tree-photos',memory});
      return atRevision(snapshot,revision,tree).payload as Photo[];
    },
    prepareTree,
    async saveGarden(grove:Grove,revision:number):Promise<SavedGrove> {
      const {changed,removed}=diff(grove.trees,previous);
      validateGrove(grove);
      const documents=await Promise.all(changed.map(tree=>prepareTree(tree,revision)));
      const result=await commitCloud(owner,'trees',revision,documents,removed,{activeId:grove.activeId});
      for(const tree of documents)photos.set(tree.id,new Set(tree.memories.filter(memory=>memory.photos.length).map(memory=>memory.id)));
      for(const id of removed)photos.delete(id);
      previous=grove.trees;
      return {grove,revision:result.revision};
    },
  };
}
export function cloudJourneys({owner}:CloudScope) {
  return {
    async listJourneys() {
      const snapshot=await readCloud(owner,'journeys');
      return snapshot.documents.map(doc=>validateJourneySummary(doc.summary));
    },
    async loadJourney(id:string):Promise<SavedJourney> {
      const snap=await readCloud(owner,'journeys',true,id);
      return {journey:validateDocument('journeys',snap.documents[0]?.payload),revision:snap.revision};
    },
    async saveJourney(journey:Journey,previous=0):Promise<SavedJourney> {
      const revision=previous||(await readCloud(owner,'journeys')).revision;
      const result=await commitCloud(owner,'journeys',revision,[journey],[],{});
      return {journey,revision:result.revision};
    },
    async deleteJourney(entry:SavedJourney) {
      await commitCloud(owner,'journeys',entry.revision,[],[entry.journey.id],{});
    },
  };
}

export async function sourceFingerprint(document:Letter|MemoryBookDocument|Grove['trees'][number]|Journey) {
  const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(document)));
  return Array.from(new Uint8Array(data),byte=>byte.toString(16).padStart(2,'0')).join('');
}
