import type {Shelf,saveShelf} from '../letter-storage';
import type {SavedGrove} from '../memory-tree-storage';
import type {SavedJourney} from '../journey-letter-storage';
import {defaultPreferences, startingCollections, summarize, validateCollections, validatePreferences, validateSummary,type Letter,type Preferences} from '../letters';
import {validateGrove, type Grove} from '../memory-tree';
import type {MemoryBookDocument} from '../memory-books';
import {validateJourneySummary, type Journey} from '../journey-letters';
import {validateDocument,type CloudScope,type ScopeResult,type CloudDocument} from './documents';
import type {SpaceKind} from './identity';

export async function requestCloud<T>(owner:string,fields:Record<string,unknown>):Promise<T> {
  if(typeof navigator!=='undefined'&&!navigator.onLine)throw new Error('Offline. Keep this draft open or export a backup before leaving.');
  let response:Response;
  try {
    response=await fetch('/api/private-space',{method:'POST',cache:'no-store',credentials:'same-origin',
      headers:{'Content-Type':'application/json','X-Dear-Account':owner},body:JSON.stringify(fields)});
  } catch {throw new Error('Couldn’t sync. Check your connection and retry, or export your draft.');}
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result)throw new Error(result?.error || 'The cloud could not confirm this request.');
  return result as T;
}

export const readCloud = (owner:string,kind:SpaceKind,content=false,id?:string) =>
  requestCloud<ScopeResult>(owner,{action:'scope',kind,content,id});
export const readDocument = (owner:string,document:string) =>
  requestCloud<Omit<CloudDocument,'ownerId'>>(owner,{action:'read',document});
type CommitResult = {revision:number;imported?:boolean;sourceId?:string};
export const commitCloud = (owner:string,kind:SpaceKind,expected:number,changes:unknown[],removals:string[],
  metadata:Record<string,unknown>,receipt?:string) =>
  requestCloud<CommitResult>(owner,{action:'save',kind,expected,changes,removals,metadata,importing:!!receipt,receipt});
const payloads = <K extends SpaceKind>(kind:K,scope:ScopeResult) => scope.documents.map(item=>validateDocument(kind,item.payload));

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
      const snapshot=await readCloud(owner,'books',true);
      const books=payloads('books',snapshot);
      revision=snapshot.revision;
      return books;
    },
    async saveLibrary(books:MemoryBookDocument[],previous:MemoryBookDocument[] = []) {
      if(revision===null)throw new Error('Reopen your cloud library before saving.');
      const {changed,removed}=diff(books,previous);
      const result=await commitCloud(owner,'books',revision,changed,removed,{});
      revision=result.revision;
    },
  };
}
export function cloudTrees({owner}:CloudScope) {
  let previous:Grove['trees']=[];
  return {
    async loadGarden():Promise<SavedGrove> {
      const snapshot=await readCloud(owner,'trees',true);
      const grove=validateGrove({version:1,activeId:snapshot.metadata.activeId??'',trees:payloads('trees',snapshot)});
      previous=grove.trees;
      return {revision:snapshot.revision,grove};
    },
    async saveGarden(grove:Grove,revision:number):Promise<SavedGrove> {
      const {changed,removed}=diff(grove.trees,previous);
      const validated=validateGrove(grove);
      const result=await commitCloud(owner,'trees',revision,changed,removed,{activeId:validated.activeId});
      previous=validated.trees;
      return {grove:validated,revision:result.revision};
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
