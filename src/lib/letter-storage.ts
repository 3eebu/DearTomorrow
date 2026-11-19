import { defaultPreferences, LIMITS, startingCollections, summarize, validateBackup, validateCollections,
  validateLetter, validatePreferences, validateSummary, type Backup, type Collection, type Letter, type LetterSummary, type Preferences } from './letters';

export type Shelf = { version: 1; revision: number; summaries: LetterSummary[]; collections: Collection[]; preferences: Preferences };
const headerKey = 'shelf';
const generalFailure = 'The change could not be saved on this device. Your last saved letters are intact.';
const conflictFailure = 'Another tab changed your Letter Box. Export your current draft, then reload this page before editing again.';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if (!globalThis.indexedDB) { reject(new Error('Browser storage is unavailable.')); return; }
    const request=indexedDB.open('dear-tomorrow-letters',1);
    let blocked=false;
    request.onupgradeneeded=()=>{
      request.result.createObjectStore('settings');
      request.result.createObjectStore('letters');
    };
    request.onblocked=()=>{blocked=true;reject(new Error('Close the other Letters tabs and try again.'));};
    request.onerror=()=>reject(new Error('Your browser did not open local Letters storage.'));
    request.onsuccess=()=>{
      const db=request.result;
      db.onversionchange=()=>db.close();
      if(blocked)db.close();else resolve(db);
    };
  });
}

async function read<T>(store: 'settings'|'letters',key:string) {
  const db=await database();
  try {
    return await new Promise<T|undefined>((resolve,reject)=>{
      const tx=db.transaction(store,'readonly');
      const request=tx.objectStore(store).get(key);
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=tx.onabort=()=>reject(new Error('Unable to read your Letter Box. Your browser data was kept.'));
    });
  } finally { db.close(); }
}
export async function loadShelf():Promise<Shelf> {
  const data=await read<Shelf>('settings',headerKey);
  if (data===undefined) return {version:1,revision:0,summaries:[],collections:startingCollections,preferences:defaultPreferences};
  if (!data || data.version!==1 || !Number.isSafeInteger(data.revision) || data.revision<1 ||
      !Array.isArray(data.summaries) || data.summaries.length>LIMITS.letters) {
    throw new Error('Your Letter Box could not be read. Existing letters were kept.');
  }
  const collections=validateCollections(data.collections),summaries=data.summaries.map(validateSummary);
  const ids=new Set<string>();
  for(const item of summaries) {
    if(ids.has(item.id)||
      (item.collectionId&&!collections.some(c=>c.id===item.collectionId)))throw new Error('Your Letter Box catalog needs recovery. Saved documents were kept.');
    ids.add(item.id);
  }
  return {...data,summaries,collections,preferences:validatePreferences(data.preferences)};
}
export async function loadLetter(id:string) {
  const data=await read('letters',id);
  if(data===undefined)throw new Error('This letter could not be found on this device.');
  const letter=validateLetter(data);
  if(letter.id!==id)throw new Error('This letter’s identity did not match the Letter Box.');
  return letter;
}

type Change = { letters?:Letter[]; collections?:Collection[]; preferences?:Preferences };
export async function saveShelf(previous:Shelf,change:Change):Promise<Shelf> {
  const collections=validateCollections(change.collections??previous.collections);
  const preferences=validatePreferences(change.preferences??previous.preferences);
  const documents=(change.letters??[]).map(validateLetter);
  const entries=new Map(previous.summaries.map(item=>[item.id,item]));
  for(const letter of documents)entries.set(letter.id,summarize(letter));
  if(entries.size>LIMITS.letters)throw new Error('This Letter Box holds up to 100 letters.');
  for(const item of entries.values())if(item.collectionId&&!collections.some(c=>c.id===item.collectionId)) {
    throw new Error('A letter belongs to a collection that could not be found.');
  }
  const next:Shelf={version:1,revision:previous.revision+1,summaries:[...entries.values()],collections,preferences};
  const db=await database();
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(['settings','letters'],'readwrite');
      const settings=tx.objectStore('settings'),letters=tx.objectStore('letters');
      const current=settings.get(headerKey);
      let conflict=false;
      current.onsuccess=()=>{
        if ((current.result?.revision??0)!==previous.revision) {conflict=true;tx.abort();return;}
        try {
          for(const letter of documents)letters.put(letter,letter.id);
          settings.put(next,headerKey);
        } catch {tx.abort();}
      };
      tx.oncomplete=()=>resolve();
      tx.onabort=()=>reject(new Error(conflict?conflictFailure:generalFailure));
    });
    return next;
  } finally { db.close(); }
}
export async function readBackup(file:File) {
  if(file.size>LIMITS.backup)throw new Error('Choose a Letters backup smaller than 48 MB.');
  let decoded:unknown;
  try { decoded=JSON.parse(await file.text()); }
  catch { throw new Error('This file is not a readable Letters backup.'); }
  return validateBackup(decoded);
}
export function downloadBackup(backup:Backup,name:string) {
  const blob=new Blob([JSON.stringify(backup)],{type:'application/json'});
  if(blob.size>LIMITS.backup)throw new Error('This collection is too large for one backup. Export its letters individually.');
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=(name.replace(/[^a-z0-9 -]/gi,'').trim().slice(0,70)||'letters')+'.dear-letters.json';
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
