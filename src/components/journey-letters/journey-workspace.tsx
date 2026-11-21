'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {cloudJourneys} from '@/lib/accounts/cloud-client';
import type {CloudScope} from '@/lib/accounts/documents';
import { LetterReader } from '@/components/letters/letter-reader';
import { LetterStudio } from '@/components/letters/letter-studio';
import { countdown } from '@/lib/letter-time';
import { defaultEnvelope, defaultPreferences, editLetter, type Letter } from '@/lib/letters';
import { checkpointStatus, checkpointTimes, checkpointZone, copyJourney, createCheckpointLetter, createJourney,
  formatJourneyTime, journeyPhase, journeyProgress, openCheckpoint, putCheckpointLetter, summarizeJourney,
  type Journey, type JourneyPlan, type JourneySummary } from '@/lib/journey-letters';
import { deleteJourney, downloadJourney, listJourneys, loadJourney, readJourneyBackup, saveJourney, type SavedJourney } from '@/lib/journey-letter-storage';
import { JourneyMap } from './journey-map';
import { JourneySchedule, JourneySetup, RouteTimes } from './journey-forms';
import '../letters/letters.css';
import './journey.css';

type View =
  | { kind:'library' | 'new' | 'edit' | 'schedule' }
  | { kind:'journey'; intro?: boolean; returnTo?: string }
  | { kind:'studio' | 'reader'; index:number; arriving?:boolean };
type Confirm = { action:'delete' } | { action:'unseal'; index:number } | { action:'empty'; index:number };
const heroFrom = {name:'Lahore',point:{lat:31.558,lon:74.35071}};
const heroTo = {name:'London',point:{lat:51.50853,lon:-.12574}};
const samples = ['#dfc3aa','#d9b4ab','#c5c9b2','#d0b6af','#dec69c','#d3aaa8'];
const wax = ['#773e49','#97554c','#556747','#733b52','#946333','#783743'];
const message = (error:unknown) => error instanceof Error ? error.message : 'This action could not be completed.';
const time = (instant:number) => new Date(instant).toISOString();

function useJourneyClock() {
  const [now,setNow] = useState<number|null>(null);
  useEffect(() => {
    let timer = 0;
    function sync() {
      window.clearInterval(timer);
      if (document.hidden) return;
      setNow(Date.now());
      timer = window.setInterval(() => setNow(Date.now()),1000);
    }
    sync();
    document.addEventListener('visibilitychange',sync);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange',sync); };
  },[]);
  return now;
}

function TinyEnvelope({index,letter,ready=false,opened=false}: {index:number;letter?:Letter|null;ready?:boolean;opened?:boolean}) {
  const ink = letter?.envelope ?? defaultEnvelope;
  return <span className="jl-envelope" aria-hidden="true" data-ready={ready} data-opened={opened}
    style={{'--env-color':letter?ink.color:samples[index],'--env-wax':letter?ink.back.wax:wax[index]} as CSSProperties}>
    <span className="jl-envelope-paper"/><span className="jl-envelope-pocket"/><span className="jl-envelope-flap"/>
    <span className="jl-envelope-wax"><svg viewBox="0 0 24 24">
      {index===5?<path d="m12 3 2.2 6.8 6.8 2.2-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2Z"/>:
        <path d="M7 18c1-4 5-7 10-11m-6 7C5 14 5 8 7 9c2 0 3 2 4 5m1-2c-1-4 1-7 3-8 1 2 0 5-3 8m2-1c2-1 5-1 7-4-4-1-6 0-7 4"/>}
    </svg></span>
  </span>;
}

function LocalNote({cloud=false}:{cloud?:boolean}) {
  if(cloud)return <aside className="jl-local-note"><strong>Kept in My Space</strong><p>Share a journey from My Space. Shared opening times are checked by the server. Automatic delivery is unavailable.</p></aside>;
  return <aside className="jl-local-note">
    <strong>Kept on this device</strong>
    <p>This browser saves your journeys. Opening times follow its clock and can be bypassed. A backup carries the complete letters, so share it privately. Automatic delivery is unavailable.</p>
  </aside>;
}

function JourneyLibrary({items,loading,busy,create,pick,importFile,cloud}: {
  items:JourneySummary[];loading:boolean;busy:boolean;create:()=>void;pick:(id:string)=>void;importFile:()=>void;cloud:boolean;
}) {
  const now = useJourneyClock();
  return <>
    <section className="jl-hero">
      <div className="jl-hero-copy">
        <p className="jl-small">A letter for every mile</p>
        <h1 className="jl-title" data-jl-focus tabIndex={-1}>Until We <em>Meet Again.</em></h1>
        <p>Six little letters for the distance between goodbye and hello.</p>
        <div className="jl-actions">
          <button className="jl-primary" onClick={create} disabled={loading||busy}>Create a journey <span aria-hidden="true">↗</span></button>
          <button className="jl-link" onClick={importFile} disabled={loading||busy}>Import backup</button>
        </div>
      </div>
      <div className="jl-hero-art">
        <div className="jl-hero-cities"><span>Lahore</span><span>London</span></div>
        <JourneyMap from={heroFrom} to={heroTo} progress={.43} start/>
        <div className="jl-pocket" aria-hidden="true"><TinyEnvelope index={0}/><TinyEnvelope index={3}/></div>
      </div>
    </section>
    <section className="jl-library" aria-labelledby="jl-library-title">
      <p className="jl-small">{items.length?(cloud?'Saved in My Space':'Saved on this device'):'Journey Letters'}</p>
      <h2 id="jl-library-title">{items.length?'Your journeys':'Even the distance can hold a little love.'}</h2>
      {loading?<p role="status">Opening your local journey library…</p>:items.length?
        <ul className="jl-library-list">{items.map(item=><li key={item.id}>
          <button type="button" disabled={busy} onClick={()=>pick(item.id)} aria-label={`Open journey ${item.name}`}>
            <span><strong>{item.name}</strong><span>{item.from.name} <span aria-hidden="true">→</span> {item.to.name}</span></span>
            <span><time dateTime={time(item.departure.instant)}>{formatJourneyTime(item.departure.instant,item.departure.zone)}</time>
              <span>{item.completed} of 6 sealed · {now===null?'Schedule saved':journeyPhase(item,now)}</span></span>
            <span aria-hidden="true">↗</span>
          </button>
        </li>)}</ul>:<p>Prepare a letter for takeoff, another for the quiet miles, and one to welcome them when they arrive.</p>}
    </section>
    <LocalNote cloud={cloud}/>
  </>;
}

function JourneyOverview({ journey,intro,recipient,busy,showRecipient,back,edit,schedule,pick,duplicate,download,remove,cloud }: {
  journey:Journey;intro:boolean;recipient:boolean;busy:boolean;showRecipient:(value:boolean)=>void;
  back:()=>void;edit:()=>void;schedule:()=>void;pick:(index:number)=>void;
  duplicate:()=>void;download:()=>void;remove:()=>void;cloud:boolean;
}) {
  const wallClock = useJourneyClock();
  const now = wallClock ?? journey.departure.instant-1;
  const progress = journeyProgress(journey,now);
  const times = checkpointTimes(journey);
  const seen = journey.checkpoints.filter(stop=>stop.letter?.state==='opened').length;
  let next = Infinity;
  for (const [index,stop] of journey.checkpoints.entries()) {
    if (stop.letter?.state==='sealed' && times[index]>now) next = Math.min(next,times[index]);
  }
  return <>
    <div className="jl-overview-top">
      <button className="jl-link" onClick={back} disabled={busy}>← Your journeys</button>
      <div className="jl-view-switch" role="group" aria-label="Journey view">
        <button type="button" aria-pressed={!recipient} onClick={()=>showRecipient(false)}>Prepare letters</button>
        <button type="button" aria-pressed={recipient} onClick={()=>showRecipient(true)}>Opening view</button>
      </div>
    </div>
    <header className="jl-overview-head">
      <p className="jl-small">{journey.name}</p>
      <h1 className="jl-title" data-jl-focus tabIndex={-1}>Until We <em>Meet Again.</em></h1>
      {journey.dedication&&<p className="jl-dedication">{journey.dedication}</p>}
    </header>
    <div className="jl-atlas">
      <RouteTimes plan={journey}/>
      <JourneyMap from={journey.from} to={journey.to} progress={progress} start={intro}/>
      <div className="jl-progress">
        <label htmlFor="jl-progress">Scheduled journey progress</label>
        <progress id="jl-progress" max={100} value={Math.floor(progress*100)}/>
        <span>{journeyPhase(journey,now)} · {Math.floor(progress*100)}%</span>
      </div>
    </div>
    <section className="jl-collection" aria-labelledby="jl-collection-title">
      <div className="jl-collection-head">
        <div><p className="jl-small">{recipient?`${seen} of 6 opened`:'Six moments to write for'}</p>
          <h2 id="jl-collection-title">{recipient?'The letters waiting for you.':'Six envelopes, one journey.'}</h2></div>
        {!recipient&&<button className="jl-secondary" onClick={schedule}>Edit checkpoints and opening times</button>}
      </div>
      {recipient&&next<Infinity&&<p className="jl-next"><span>Next sealed envelope opens in</span> <strong>{countdown(next,now)}</strong></p>}
      <ol className="jl-envelope-list">
        {journey.checkpoints.map((stop,index)=>{
          const status = checkpointStatus(stop,times[index],now,!recipient);
          return <li key={stop.id}>
            <button type="button" data-stop-id={stop.id} disabled={busy} onClick={()=>pick(index)}
              aria-label={`Envelope ${index+1}, ${stop.label}, ${status}`}>
              <span className="jl-index">0{index+1}</span>
              <TinyEnvelope letter={stop.letter} index={index} ready={status==='Ready to open'} opened={status==='Opened'}/>
              <strong>{stop.label}</strong>
              <span className="jl-envelope-status">{status}</span>
              <time dateTime={time(times[index])}>{formatJourneyTime(times[index],checkpointZone(journey,index))}</time>
            </button>
          </li>;
        })}
      </ol>
    </section>
    <LocalNote cloud={cloud}/>
    {!recipient&&<div className="jl-manage" aria-label="Manage this journey">
      <button className="jl-link" disabled={busy} onClick={edit}>Edit journey details</button>
      <button className="jl-link" disabled={busy} onClick={duplicate}>Duplicate as drafts</button>
      <button className="jl-link" disabled={busy} onClick={download}>Export journey</button>
      <button className="jl-link" disabled={busy} onClick={remove}>Delete journey</button>
    </div>}
    {seen===6&&<p className="jl-farewell">All six letters have found their way to you.</p>}
  </>;
}

function JourneyDialog({ title,close,busy,children }: {title:string;close:()=>void;busy:boolean;children:ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  },[]);
  return <dialog ref={ref} className="jl-dialog" aria-labelledby="jl-dialog-title" onCancel={event=>{
    event.preventDefault();if(!busy)close();
  }}>
    <header><h2 id="jl-dialog-title">{title}</h2><button className="jl-link" aria-label="Close dialog" disabled={busy} onClick={close}>×</button></header>
    {children}
  </dialog>;
}

export default function JourneyWorkspace({scope}:{scope?:CloudScope}={}) {
  const store=useMemo(()=>scope?cloudJourneys(scope):{listJourneys,loadJourney,saveJourney,deleteJourney},[scope]);
  const [items,setItems] = useState<JourneySummary[]>([]);
  const [entry,setEntry] = useState<SavedJourney|null>(null);
  const [view,setView] = useState<View>({kind:'library'});
  const [recipient,setRecipient] = useState(false);
  const [preferences,setPreferences] = useState(defaultPreferences);
  const [confirm,setConfirm] = useState<Confirm|null>(null);
  const [loading,setLoading] = useState(true),[busy,setBusy] = useState(false),[retry,setRetry] = useState(0);
  const [error,setError] = useState(''),[loadError,setLoadError] = useState(false);
  const latest = useRef<SavedJourney|null>(null), pending = useRef(false), upload = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null), focused = useRef(false);
  const journey = entry?.journey;
  const restoreId = view.kind==='journey' ? view.returnTo : undefined;

  useEffect(() => {
    let active = true;
    store.listJourneys().then(result=>{
      if(active){setItems(result);setLoadError(false);}
    },error=>{
      if(active){setError(message(error));setLoadError(true);}
    }).finally(()=>{if(active)setLoading(false);});
    return () => {active=false;};
  },[retry,store]);
  useEffect(() => {
    if (!focused.current) {focused.current=true;return;}
    const target = restoreId ? root.current?.querySelector<HTMLElement>(`[data-stop-id="${restoreId}"]`) :
      root.current?.querySelector<HTMLElement>('[data-jl-focus],[data-letters-heading]');
    target?.focus({preventScroll:true});
    if(restoreId)target?.scrollIntoView({block:'nearest'});
    else root.current?.scrollIntoView({block:'start'});
  },[view.kind,restoreId]);

  function go(next:View) {setError('');setConfirm(null);setView(next);}
  function workspace(next:SavedJourney) {latest.current=next;setEntry(next);}
  async function commit(next:Journey, previous = latest.current?.revision ?? 0) {
    const saved = await store.saveJourney(next, previous);
    workspace(saved);
    const summary = summarizeJourney(saved.journey);
    setItems(items=>[summary,...items.filter(item=>item.id!==summary.id)]);
  }
  async function act(operation:()=>Promise<void>) {
    if(pending.current)return false;
    pending.current=true;setBusy(true);setError('');
    try {await operation();return true;}
    catch(error){setError(message(error));return false;}
    finally {pending.current=false;setBusy(false);}
  }
  function loadLibrary() {
    go({kind:'library'});
    setLoading(true);setRetry(n=>n+1);
  }
  function pickJourney(id:string) {
    void act(async()=>{workspace(await store.loadJourney(id));setRecipient(false);go({kind:'journey',intro:true});});
  }
  function savePlan(plan:JourneyPlan) {
    void act(async()=>{
      const editing=view.kind==='edit'?latest.current:null;
      const next = editing ? {...editing.journey,...plan,updatedAt:Math.max(Date.now(),editing.journey.createdAt)} : createJourney(plan);
      await commit(next,editing?.revision??0);
      go({kind:'journey',intro:true});
    });
  }
  function choose(index:number) {
    if(!journey)return;
    const stop=journey.checkpoints[index], letter=stop.letter;
    if(recipient) {
      if(!letter||letter.state==='draft')setConfirm({action:'empty',index});
      else go({kind:'reader',index});
    } else if(letter?.state==='draft')go({kind:'studio',index});
    else if(letter)setConfirm({action:'unseal',index});
    else void act(async()=>{
      await commit(putCheckpointLetter(journey,stop.id,createCheckpointLetter(journey,index)));
      go({kind:'studio',index});
    });
  }
  function exportDraft(letter:Letter,index:number) {
    const current=latest.current?.journey;
    if(!current)return;
    try {downloadJourney(putCheckpointLetter(current,current.checkpoints[index].id,letter));}
    catch(error){setError(message(error));}
  }
  async function saveLetter(letter:Letter,index:number) {
    const current=latest.current;
    if(!current)throw new Error('Journey storage is unavailable.');
    await commit(putCheckpointLetter(current.journey,current.journey.checkpoints[index].id,letter),current.revision);
  }
  function recordOpening(index:number) {
    return act(async()=>{
      const current=latest.current;
      if(!current)throw new Error('Journey storage is unavailable.');
      const next=openCheckpoint(current.journey,index);
      if(next!==current.journey)await commit(next,current.revision);
    });
  }
  function importFile(file:File) {
    void act(async()=>{
      const result = await readJourneyBackup(file);
      await commit(copyJourney(result,false),0);
      setRecipient(false);go({kind:'journey',intro:true});
    });
  }
  function confirmAction() {
    const current=latest.current;
    if(!current||!confirm)return;
    if(confirm.action==='delete') {
      void act(async()=>{await store.deleteJourney(current);latest.current=null;setEntry(null);loadLibrary();});
    } else if(confirm.action==='unseal') {
      const {index}=confirm;
      void act(async()=>{
        const letter=current.journey.checkpoints[index].letter;
        if(!letter)return;
        await saveLetter(editLetter(letter),index);
        go({kind:'studio',index});
      });
    }
  }
  function returnFrom(index:number) {
    go({kind:'journey',returnTo:latest.current?.journey.checkpoints[index].id});
  }
  const alert = error&&<div className="jl-notice" role="alert">{error}
    {loadError&&<button className="jl-link" onClick={loadLibrary}>Try again</button>}</div>;
  const activeIndex = view.kind==='studio'||view.kind==='reader'?view.index:null;
  const activeLetter = activeIndex===null?null:journey?.checkpoints[activeIndex].letter;
  const activeTime = journey&&activeIndex!==null?checkpointTimes(journey)[activeIndex]:null;
  return <section className="jl-root" ref={root} aria-label="Journey Letters workspace">
    <input ref={upload} type="file" hidden accept=".json,application/json" aria-label="Import Journey Letters backup"
      onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(file)importFile(file);}}/>
    {!confirm&&alert}
    {busy&&scope&&<p className="jl-small" role="status">Syncing journey…</p>}
    {view.kind==='library'&&<JourneyLibrary items={items} loading={loading} busy={busy||loadError} cloud={!!scope}
      pick={pickJourney} create={()=>{setRecipient(false);go({kind:'new'});}} importFile={()=>upload.current?.click()}/>}
    {(view.kind==='new'||view.kind==='edit')&&<JourneySetup key={view.kind} original={view.kind==='edit'?journey:undefined}
      busy={busy} cancel={()=>go({kind:view.kind==='edit'?'journey':'library'})} save={savePlan}/>}
    {view.kind==='journey'&&journey&&<JourneyOverview journey={journey} intro={!!view.intro} recipient={recipient} busy={busy} cloud={!!scope}
      showRecipient={setRecipient} back={loadLibrary} edit={()=>go({kind:'edit'})} schedule={()=>go({kind:'schedule'})} pick={choose}
      duplicate={()=>void act(async()=>{await commit(copyJourney(journey,true),0);go({kind:'journey',intro:true});})}
      download={()=>{try{downloadJourney(journey);}catch(error){setError(message(error));}}}
      remove={()=>setConfirm({action:'delete'})}/>}
    {view.kind==='schedule'&&journey&&<JourneySchedule journey={journey} busy={busy} cancel={()=>go({kind:'journey'})}
      save={next=>void act(async()=>{await commit({...next,updatedAt:Math.max(Date.now(),next.createdAt)});go({kind:'journey'});})}/>}
    {view.kind==='studio'&&activeLetter&&<div className="lt-workspace jl-letter-stage">
      <p className="jl-small">{journey?.name} · Envelope {view.index+1}</p>
      <LetterStudio key={activeLetter.id} initial={activeLetter} collections={[]} journey cloud={!!scope} save={letter=>saveLetter(letter,view.index)}
        exit={()=>returnFrom(view.index)} backup={letter=>exportDraft(letter,view.index)}
        sealed={()=>{setRecipient(true);go({kind:'reader',index:view.index,arriving:true});}}/>
    </div>}
    {view.kind==='reader'&&journey&&activeLetter&&activeTime!==null&&<div className="lt-workspace jl-letter-stage">
      <section className="lt-reading-room">
        <div className="lt-room-nav">
          <button onClick={()=>returnFrom(view.index)} disabled={busy}>← Back to journey</button>
          <span>{journey.checkpoints[view.index].label}</span>
        </div>
        <LetterReader key={activeLetter.id} letter={activeLetter} preferences={preferences}
          savePreferences={patch=>setPreferences(previous=>({...previous,...patch}))}
          opening={{instant:activeTime,label:formatJourneyTime(activeTime,checkpointZone(journey,view.index))}}
          opened={()=>recordOpening(view.index)} arriving={view.arriving}
          finishArrival={()=>setView(v=>v.kind==='reader'?{...v,arriving:false}:v)}/>
      </section>
    </div>}
    {confirm&&journey&&<JourneyDialog busy={busy} close={()=>setConfirm(null)}
      title={confirm.action==='delete'?'Delete this journey?':journey.checkpoints[confirm.index].label}>
      {alert}
      {confirm.action==='delete'?<>
        <p>Delete “{journey.name}” and only the envelopes saved inside it. Any letters in your separate Letter Box will stay there.</p>
        <div className="jl-actions"><button className="jl-secondary" autoFocus disabled={busy} onClick={()=>setConfirm(null)}>Keep journey</button>
          <button className="jl-primary" disabled={busy} onClick={confirmAction}>Delete journey and its letters</button></div>
      </>:confirm.action==='empty'?<>
        <p>This envelope {journey.checkpoints[confirm.index].letter?'is still being written':'has yet to be written'}.</p>
        <p>Scheduled for {formatJourneyTime(checkpointTimes(journey)[confirm.index],checkpointZone(journey,confirm.index))}.</p>
      </>:<>
        <p>You can preview the opening experience or return this envelope to a draft. It must be sealed again before it can be opened.</p>
        <div className="jl-actions"><button className="jl-secondary" disabled={busy} onClick={()=>{
          setRecipient(true);go({kind:'reader',index:confirm.index});
        }}>Preview opening view</button>
          <button className="jl-primary" disabled={busy} onClick={confirmAction}>Unseal and edit</button></div>
      </>}
    </JourneyDialog>}
    <div className="jl-foot-link"><Link href="/letters">← Back to Letters</Link></div>
  </section>;
}
