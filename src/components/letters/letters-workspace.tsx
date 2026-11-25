'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StationeryDialog } from '@/components/stationery-dialog';
import {cloudLetters} from '@/lib/accounts/cloud-client';
import type {CloudScope} from '@/lib/accounts/documents';
import { downloadBackup, loadLetter, loadShelf, readBackup, saveShelf, type Shelf } from '@/lib/letter-storage';
import { canOpen, createLetter, defaultPreferences, duplicateLetter, editLetter, importCopies, makeBackup,
  occasionNames, sealLetter, stateLabel, type Collection, type Kind, type Letter, type LetterSummary, type Preferences } from '@/lib/letters';
import { CollectionsEditor, LetterBox } from './letter-box';
import { LetterReader } from './letter-reader';
import { LetterStudio } from './letter-studio';
import './letters.css';

type Screen = {mode:'box'} | {mode:'studio'|'reader';letter:Letter;example?:boolean;arriving?:boolean};
type Modal = {kind:'collection'|'occasion'} | {kind:'organize'|'unseal';letter:Letter};
const explanation=(reason:unknown)=>reason instanceof Error?reason.message:'This action could not be completed.';

function exampleLetter(){
  const draft=createLetter('occasion','anniversary');
  return sealLetter({...draft,title:'Another year of us',specialDate:'2022-10-17',
    envelope:{...draft.envelope,color:'#bb8d8f',material:'linen',ribbon:true,front:{
      to:'My dearest',from:'Me, always',note:'For all the ordinary days',stamp:'17 OCT',border:true,
    },back:{...draft.envelope.back,inscription:'With all my heart',botanical:true,emblem:'initials',initials:'M+A'}},
    pages:[{...draft.pages[0],text:'My love,\n\nLast Sunday you came back from the bakery with two croissants, even though I said I didn’t want one. You left mine in the warmest part of the bag.\n\nWhen I think about another year with you, that is the sort of thing I mean.',signature:'Always, M.'}],
    hidden:'I kept the little paper bag. It’s in the top drawer.'},Date.now());
}

export default function LettersWorkspace({scope}:{scope?:CloudScope}={}){
  const store=useMemo(()=>scope?cloudLetters(scope):{loadShelf,loadLetter,saveShelf},[scope]);
  const [shelf,setShelf]=useState<Shelf|null>(null),[screen,setScreen]=useState<Screen>({mode:'box'});
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [modal,setModal]=useState<Modal|null>(null),[retry,setRetry]=useState(0);
  const [temporary,setTemporary]=useState(defaultPreferences);
  const latest=useRef<Shelf|null>(null),queue=useRef(Promise.resolve()),pending=useRef(false),input=useRef<HTMLInputElement>(null);
  const anchor=useRef<HTMLElement>(null),seen=useRef<'box'|'studio'|'reader'>('box');
  useEffect(()=>{
    let active=true;
    store.loadShelf().then(result=>{if(active){latest.current=result;setShelf(result);}},reason=>{if(active)setError(explanation(reason));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[retry,store]);
  useEffect(()=>{
    if(seen.current!==screen.mode){
      seen.current=screen.mode;
      anchor.current?.scrollIntoView({block:'start'});
      anchor.current?.querySelector<HTMLElement>('[data-letters-heading]')?.focus({preventScroll:true});
    }
  },[screen.mode]);
  function transact(change:(snapshot:Shelf)=>Parameters<typeof saveShelf>[1]){
    const result=queue.current.then(async()=>{
      const snapshot=latest.current;
      if(!snapshot)throw new Error('Your browser storage is unavailable.');
      const next=await store.saveShelf(snapshot,change(snapshot));
      latest.current=next;setShelf(next);
    });
    queue.current=result.catch(()=>{});
    return result;
  }
  function commit(letter:Letter){return transact(()=>({letters:[letter]}));}
  async function act(work:()=>Promise<void>){
    if(pending.current)return;
    pending.current=true;setBusy(true);setError('');
    try{await work();}
    catch(reason){setError(explanation(reason));}
    finally{pending.current=false;setBusy(false);}
  }
  function go(next:Screen){setError('');setModal(null);setScreen(next);}
  function begin(kind:Kind='love',occasion?:typeof occasionNames[number]){
    void act(async()=>{
      const letter=createLetter(kind,occasion);
      await commit(letter);
      go({mode:'studio',letter});
    });
  }
  function preferences(patch:Partial<Preferences>){
    if(!latest.current){setTemporary(p=>({...p,...patch}));return;}
    void transact(snapshot=>({preferences:{...snapshot.preferences,...patch}})).catch(reason=>setError(explanation(reason)));
  }
  function pick(item:LetterSummary,organize=false){
    void act(async()=>{
      const letter=await store.loadLetter(item.id);
      if(organize)setModal({kind:'organize',letter});
      else go({mode:letter.state==='draft'?'studio':'reader',letter});
    });
  }
  function updateDisplayed(letter:Letter){
    setScreen(current=>current.mode==='reader'&&current.letter.id===letter.id?{...current,letter}:current);
    setModal(current=>current?.kind==='organize'&&current.letter.id===letter.id?{...current,letter}:current);
  }
  function writeBackup(letter:Letter){
    try{downloadBackup(makeBackup([letter],latest.current?.collections??[]),letter.title);}
    catch(reason){setError(explanation(reason));}
  }
  function importFile(file:File){
    void act(async()=>{
      const backup=await readBackup(file);
      await transact(snapshot=>importCopies(backup,snapshot.collections));
      go({mode:'box'});
    });
  }
  function exportGroup(id:string){
    void act(async()=>{
      if(!latest.current)return;
      const group=latest.current.collections.find(c=>c.id===id);
      const docs=[];
      for(const row of latest.current.summaries.filter(item=>item.collectionId===id))docs.push(await store.loadLetter(row.id));
      if(group&&docs.length)downloadBackup(makeBackup(docs,[group]),group.name);
    });
  }
  async function recordOpening(letter:Letter,example:boolean){
    if(example||letter.state==='opened')return true;
    if(pending.current||!canOpen(letter,Date.now()))return false;
    pending.current=true;setBusy(true);setError('');
    try{
      const opened:Letter={...letter,state:'opened',updatedAt:Math.max(letter.createdAt,Date.now())};
      await commit(opened);updateDisplayed(opened);return true;
    }catch(reason){setError(explanation(reason));return false;}
    finally{pending.current=false;setBusy(false);}
  }
  const alert=error&&<div className="lt-notice" role="alert"><span>{error}</span>
    {!shelf&&<button type="button" onClick={()=>{setError('');setLoading(true);setRetry(n=>n+1);}}>Try opening again</button>}
  </div>;
  return <section id="letters" ref={anchor} className="lt-workspace" aria-label="Letters workspace">
    <input ref={input} type="file" hidden aria-label="Import Letters backup" accept=".json,application/json"
      onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(file)importFile(file);}}/>
    {!modal&&alert}
    {screen.mode==='box'&&<LetterBox shelf={shelf} loading={loading} busy={busy} write={begin} pick={pick} organize={item=>pick(item,true)}
      example={()=>go({mode:'reader',letter:exampleLetter(),example:true})}
      importFile={()=>input.current?.click()} manage={()=>{setError('');setModal({kind:'collection'});}}
      occasion={()=>{setError('');setModal({kind:'occasion'});}} preferences={preferences} exportGroup={exportGroup}/>}
    {screen.mode==='studio'&&shelf&&<LetterStudio key={screen.letter.id} initial={screen.letter} collections={shelf.collections}
      cloud={!!scope} save={commit} backup={writeBackup} exit={()=>go({mode:'box'})} sealed={letter=>go({mode:'reader',letter,arriving:true})}/>}
    {screen.mode==='reader'&&<section className="lt-reading-room">
      <div className="lt-room-nav">
        <button type="button" disabled={busy} onClick={()=>go({mode:'box'})}>← Back to Letter Box</button>
        {!screen.example&&<div className="lt-actions">
          <span>{stateLabel(screen.letter,Date.now())}</span>
          <button disabled={busy} onClick={()=>{setError('');setModal({kind:'organize',letter:screen.letter});}}>Organize letter</button>
          <button disabled={busy} onClick={()=>{setError('');setModal({kind:'unseal',letter:screen.letter});}}>Unseal and edit</button>
        </div>}
      </div>
      <LetterReader key={screen.letter.id} letter={screen.letter} preferences={shelf?.preferences??temporary}
        savePreferences={preferences} opened={()=>recordOpening(screen.letter,!!screen.example)} example={screen.example} arriving={screen.arriving}
        finishArrival={()=>setScreen(value=>value.mode==='reader'?{...value,arriving:false}:value)}/>
    </section>}
    {modal&&<StationeryDialog className="lt-dialog" size="small" key={modal.kind} busy={busy} onClose={()=>setModal(null)}
      title={modal.kind==='collection'?'Your collections':modal.kind==='occasion'?'Occasion stationery':modal.kind==='unseal'?'Unseal this letter?':'Organize this letter'}>
      {alert}
      {modal.kind==='collection'&&shelf&&<CollectionsEditor initial={shelf.collections} busy={busy} save={values=>
        void act(async()=>{await transact(()=>({collections:values}));setModal(null);})}/>}
      {modal.kind==='occasion'&&<div className="lt-occasion-list">
        {occasionNames.map(name=><button className="dt-relief-card" key={name} disabled={busy} onClick={()=>begin('occasion',name)}>{name[0].toUpperCase()+name.slice(1)} <span aria-hidden="true">↗</span></button>)}
      </div>}
      {modal.kind==='unseal'&&<><p>The letter will return to Drafts. Seal it again when it’s ready{modal.letter.release?', and choose its opening time again':''}.</p>
        <button className="lt-primary" disabled={busy} onClick={()=>void act(async()=>{
          const letter=editLetter(modal.letter);await commit(letter);go({mode:'studio',letter});
        })}>Return to Studio</button></>}
      {modal.kind==='organize'&&shelf&&<Organize key={modal.letter.id} letter={modal.letter} groups={shelf.collections} busy={busy}
        save={letter=>void act(async()=>{
          await commit(letter);updateDisplayed(letter);setModal(null);
        })} copy={()=>void act(async()=>{
          const letter=duplicateLetter(modal.letter);await commit(letter);go({mode:'studio',letter});
        })} backup={()=>writeBackup(modal.letter)}/>}
    </StationeryDialog>}
  </section>;
}

function Organize({letter,groups,busy,save,copy,backup}:{letter:Letter;groups:Collection[];busy:boolean;
  save:(letter:Letter)=>void;copy:()=>void;backup:()=>void}){
  const [details,setDetails]=useState({title:letter.title,collectionId:letter.collectionId,favorite:letter.favorite,archived:letter.archived});
  return <form className="lt-fields" onSubmit={event=>{
    event.preventDefault();
    save({...letter,...details,title:details.title.trim()||'Untitled letter',updatedAt:Math.max(Date.now(),letter.createdAt)});
  }}>
    <label>Letter title<input value={details.title} maxLength={120} onChange={event=>setDetails({...details,title:event.target.value})}/></label>
    <label>Collection<select value={details.collectionId} onChange={event=>setDetails({...details,collectionId:event.target.value})}>
      <option value="">No collection</option>{groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}
    </select></label>
    <label className="lt-check"><input type="checkbox" checked={details.favorite} onChange={event=>setDetails({...details,favorite:event.target.checked})}/> Favorite</label>
    <label className="lt-check"><input type="checkbox" checked={details.archived} onChange={event=>setDetails({...details,archived:event.target.checked})}/> Archived</label>
    <div className="lt-actions"><button type="button" disabled={busy} onClick={copy}>Duplicate as draft</button>
      <button type="button" disabled={busy} onClick={backup}>Export letter</button></div>
    <button type="submit" className="lt-primary" disabled={busy}>Save organization</button>
  </form>;
}
