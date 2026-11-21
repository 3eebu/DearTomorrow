'use client';
import {useEffect,useState} from 'react';
import {loadShelf,loadLetter,type Shelf} from '@/lib/letter-storage';
import {loadLibrary} from '@/lib/memory-book-storage';
import {loadGarden} from '@/lib/memory-tree-storage';
import {listJourneys,loadJourney} from '@/lib/journey-letter-storage';
import {startingCollections,validateCollections,type Letter} from '@/lib/letters';
import {commitCloud,readCloud,sourceFingerprint} from '@/lib/accounts/cloud-client';
import {spaces,type SpaceKind} from '@/lib/accounts/identity';
import {validateDocument,type Documents} from '@/lib/accounts/documents';

type Item = {kind:SpaceKind;document:Documents[SpaceKind]};
type Scan = {items:Item[];shelf:Shelf|null;errors:string[]};

async function scanGuest():Promise<Scan> {
  const guest:Scan={items:[],shelf:null,errors:[]};
  const loaders = {
    letters:async()=>{guest.shelf=await loadShelf();return Promise.all(guest.shelf.summaries.map(item=>loadLetter(item.id)));},
    books:loadLibrary,trees:async()=>(await loadGarden()).grove.trees,
    journeys:async()=>Promise.all((await listJourneys()).map(async item=>(await loadJourney(item.id)).journey)),
  };
  await Promise.all((Object.keys(loaders) as SpaceKind[]).map(async kind=>{
    try {
      const docs=await loaders[kind]();
      for(const document of docs)guest.items.push({kind,document});
    } catch {guest.errors.push(spaces[kind].name);}
  }));
  return guest;
}

async function bringItem(owner:string,item:Item,guest:Scan) {
  const {kind}=item;
  const source=validateDocument(kind,item.document);
  const receipt=await sourceFingerprint(source);
  const snapshot=await readCloud(owner,kind);
  const metadata={...snapshot.metadata};
  const id=snapshot.documents.some(row=>row.id===source.id)?crypto.randomUUID():source.id;
  let document={...source,id};
  if(kind==='letters') {
    const letter=source as Letter;
    const groups=validateCollections(metadata.collections??startingCollections);
    const local=guest.shelf?.collections.find(group=>group.id===letter.collectionId);
    let collectionId='';
    if(local) {
      const found=groups.find(group=>group.name.trim().toLowerCase()===local.name.trim().toLowerCase());
      collectionId=found?.id??(groups.some(group=>group.id===local.id)?crypto.randomUUID():local.id);
      metadata.collections=found?groups:validateCollections([...groups,{id:collectionId,name:local.name}]);
    }
    document={...letter,id,collectionId};
  }
  if(kind==='trees'&&!metadata.activeId)metadata.activeId=id;
  const saved=await commitCloud(owner,kind,snapshot.revision,[document],[],metadata,receipt);
  const confirmed=await readCloud(owner,kind,true,saved.sourceId??id);
  validateDocument(kind,confirmed.documents[0]?.payload);
  return saved.imported===true;
}

export function GuestMigration({owner}:{owner:string}) {
  const [guest,setGuest]=useState<Scan|null>(null);
  const [hidden,setHidden]=useState(false),[pending,setPending]=useState(false),[status,setStatus]=useState('');
  useEffect(()=>{
    let active=true;
    void scanGuest().then(result=>{if(active)setGuest(result);});
    return ()=>{active=false;};
  },[]);
  if(hidden||!guest||(!guest.items.length&&!guest.errors.length))return null;
  const memories=guest.items.length;
  async function migrate() {
    if(!guest||pending)return;
    setPending(true);
    let brought=0,already=0,failed=0;
    for(const [index,item] of guest.items.entries()) {
      setStatus(`Checking memory ${index+1} of ${guest.items.length}…`);
      try {if(await bringItem(owner,item,guest))brought++;else already++;}
      catch {failed++;}
    }
    setStatus(`${brought} brought into My Space. ${already} already verified. ${failed} couldn’t be confirmed. The originals are still saved on this device.`);
    setPending(false);
  }
  return <section className="dt-account-card" aria-labelledby="dt-import-title">
    <h2 id="dt-import-title">{memories?'We found memories saved on this device.':'Some local libraries need attention.'}</h2>
    {memories>0&&<p>Your browser-saved memories can be copied into My Space. The originals stay saved on this device, and you can bring them over one by one.</p>}
    {guest.errors.length>0&&<p>Could not read {guest.errors.join(', ')}. Open those local libraries to recover or export their contents.</p>}
    {status&&<p role="status">{status}</p>}
    <div className="dt-account-actions">
      {!!memories&&<button className="dt-account-primary" onClick={()=>void migrate()} disabled={pending}>{pending?'Copying your memories…':status?'Retry copy':'Copy memories to My Space'}</button>}
      <button className="dt-account-secondary" onClick={()=>setHidden(true)} disabled={pending}>Maybe later</button>
      {status&&!pending&&<a href="/my-space">Refresh My Space</a>}
    </div>
  </section>;
}

export function ExportCloud({owner}:{owner:string}) {
  const [state,setState]=useState('');
  const [busy,setBusy]=useState(false);
  async function download() {
    setBusy(true);setState('');
    try {
      const snapshots=await Promise.all((Object.keys(spaces) as SpaceKind[]).map(async kind=>{
        const result=await readCloud(owner,kind,true);
        return [kind,{metadata:result.metadata,documents:result.documents.map(row=>row.payload)}];
      }));
      const blob=new Blob([JSON.stringify({format:'dear-tomorrow-account-export',version:1,spaces:Object.fromEntries(snapshots)})],{type:'application/json'});
      const href=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=href;anchor.download='dear-tomorrow-my-space.json';anchor.click();
      setTimeout(()=>URL.revokeObjectURL(href),5000);
      setState('Export ready.');
    } catch(error) {setState(error instanceof Error?error.message:'Could not export your cloud memories.');}
    finally {setBusy(false);}
  }
  return <><button className="dt-account-secondary" disabled={busy} onClick={()=>void download()}>{busy?'Preparing export…':'Export My Space'}</button>
    {state&&<p role="status">{state}</p>}</>;
}
