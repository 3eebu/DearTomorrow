'use client';
import { useEffect, useRef, useState } from 'react';
import { ReadingAtmosphere } from '@/components/memory-books/reader-environment';
import { canOpen, scenes, type Letter, type Preferences } from '@/lib/letters';
import { countdown, releaseLabel } from '@/lib/letter-time';
import { EnvelopeObject, InkDrawing, motionMs, PagePhoto, PageWords, PaperSurface, useReducedMotion, type Face, type Phase } from './letter-objects';

export function LetterReader({letter,preferences,savePreferences,opened,example=false,arriving=false,finishArrival}:{
  letter:Letter;preferences:Preferences;savePreferences:(patch:Partial<Preferences>)=>void;
  opened:()=>Promise<boolean>;example?:boolean;arriving?:boolean;finishArrival:()=>void;
}){
  const [phase,setPhase]=useState<Phase>(arriving?'sealing':'rest');
  const [face,setFace]=useState<Face>(arriving?'back':'front');
  const [reading,setReading]=useState(false),[index,setIndex]=useState(0),[waiting,setWaiting]=useState(false),[now,setNow]=useState(Date.now);
  const [atmosphere,setAtmosphere]=useState(false);
  const reduced=useReducedMotion();
  const content=useRef<HTMLHeadingElement>(null),envAction=useRef<HTMLButtonElement>(null);
  const focusNext=useRef<'paper'|'envelope'|null>(null);
  function finish(which:Exclude<Phase,'rest'>){
    setPhase('rest');setReading(which==='opening');focusNext.current=which==='opening'?'paper':'envelope';
    if(which==='sealing')finishArrival();
  }
  const finishRef=useRef(finish);finishRef.current=finish;
  useEffect(()=>{
    if(phase==='rest')return;
    if(reduced){finishRef.current(phase);return;}
    const timeout=window.setTimeout(()=>finishRef.current(phase),motionMs[phase]);
    return()=>window.clearTimeout(timeout);
  },[phase,reduced]);
  useEffect(()=>{
    if(phase!=='rest')return;
    if(focusNext.current==='paper')content.current?.focus({preventScroll:true});
    if(focusNext.current==='envelope')envAction.current?.focus({preventScroll:true});
    focusNext.current=null;
  },[phase,reading]);
  const available=canOpen(letter,now);
  useEffect(()=>{
    if(!letter.release||available)return;
    const timeout=window.setInterval(()=>setNow(Date.now()),1000);
    return()=>window.clearInterval(timeout);
  },[available,letter.release]);
  async function open(animate:boolean){
    if(waiting||phase!=='rest'||!canOpen(letter,Date.now()))return;
    setWaiting(true);
    try{
      if (await opened()) {
        setFace('back');
        if(animate&&!reduced)setPhase('opening');
        else {focusNext.current='paper';setReading(true);}
      }
    }finally{setWaiting(false);}
  }
  function fold(){
    setReading(false);
    if(reduced){focusNext.current='envelope';setFace('back');}
    else setPhase('returning');
  }
  function goToPage(next:number){
    setIndex(next);
    content.current?.scrollIntoView({block:'start'});
  }
  const page=letter.pages[index];
  return <div className="lt-reading-table" data-scene={preferences.scene} aria-label="Reading table">
    <ReadingAtmosphere scene={preferences.scene} paused={preferences.paused}/>
    <header className="lt-table-bar">
      <div><h2 ref={content} tabIndex={-1} data-letters-heading>{letter.title||'Untitled letter'}</h2>
        {letter.kind==='when'&&letter.label&&<p className="lt-opening-label">Open when {letter.label}</p>}</div>
      <button aria-expanded={atmosphere} onClick={()=>setAtmosphere(!atmosphere)}>{scenes[preferences.scene]} <span aria-hidden="true">⌄</span></button>
    </header>
    {atmosphere&&<div className="lt-atmosphere" role="group" aria-label="Reading environment">
      {(Object.keys(scenes) as (keyof typeof scenes)[]).map(scene=><button key={scene} aria-pressed={preferences.scene===scene}
        onClick={()=>savePreferences({scene})}>{scenes[scene]}</button>)}
      <button disabled={reduced} onClick={()=>savePreferences({paused:!preferences.paused})}>{reduced?'Reduced motion':preferences.paused?'Resume scene motion':'Pause scene motion'}</button>
    </div>}
    {letter.release&&<div className="lt-release">
      <span>{releaseLabel(letter.release)}</span>
      {!available&&<strong data-countdown>{countdown(letter.release.instant,now)}</strong>}
      <small>{available?'Ready to open on this device.':'Local schedule preview. It follows this device clock.'}</small>
    </div>}
    {!reading?<div className="lt-table-object-wrap">
      <EnvelopeObject design={letter.envelope} paper={letter.paper} face={face} phase={phase} title={letter.title}/>
      <div className="lt-object-actions">
        {phase==='rest'?<>
          <button ref={envAction} type="button" aria-label={face==='front'?'View back of envelope':'View front of envelope'} onClick={()=>setFace(face==='front'?'back':'front')}>
            {face==='front'?'Turn envelope over':'See the front'} <span aria-hidden="true">↻</span></button>
          <button className="lt-primary" disabled={!available||waiting} onClick={()=>void open(true)}>{waiting?'Opening…':available?'Release the seal':'Waiting for its day'}</button>
          {available&&!reduced&&<button className="lt-link" disabled={waiting} onClick={()=>void open(false)}>Read without animation</button>}
        </>:<><p role="status">{phase==='sealing'?'Sealing your letter…':phase==='opening'?'Unfolding the letter…':'Folding the letter away…'}</p>
          <button onClick={()=>finish(phase)}>Skip animation</button></>}
      </div>
      {phase==='rest'&&<p className="lt-address-caption">
        {face==='front'?[letter.envelope.front.to&&'To '+letter.envelope.front.to,letter.envelope.front.from&&'From '+letter.envelope.front.from,letter.envelope.front.note].filter(Boolean).join(' · '):
          letter.envelope.back.inscription}
      </p>}
    </div>:<div className="lt-reading-pages">
      <PaperSurface paper={letter.paper} page={page}>
        <PageWords page={page}/>
        {page.photo&&<PagePhoto photo={page.photo}/>}
        {page.signature&&<p className="lt-signature">{page.signature}</p>}
        {!!page.drawing.length&&<InkDrawing strokes={page.drawing}/>}
        {index===letter.pages.length-1&&letter.specialDate&&<p className="lt-special-date">{new Date(letter.specialDate+'T00:00:00Z').toLocaleDateString('en-US',{dateStyle:'long',timeZone:'UTC'})}</p>}
        {index===letter.pages.length-1&&letter.hidden&&<details className="lt-secret"><summary>Unfold the little note</summary><p>{letter.hidden}</p></details>}
        {index===letter.pages.length-1&&letter.voice&&<div className="lt-voice-reader">
          <h3>A voice tucked inside</h3><audio aria-label="Attached voice recording" controls preload="none" src={letter.voice.data}/>
          {letter.transcript&&<details><summary>Read the transcript</summary><p>{letter.transcript}</p></details>}
        </div>}
        {letter.pages.length>1&&<small className="lt-page-number">{index+1} / {letter.pages.length}</small>}
      </PaperSurface>
      <nav className="lt-page-nav" aria-label="Letter pages">
        {letter.pages.length>1&&<><button disabled={index===0} onClick={()=>goToPage(index-1)}>← Previous page</button>
          <span>Page {index+1} of {letter.pages.length}</span>
          <button disabled={index===letter.pages.length-1} onClick={()=>goToPage(index+1)}>Next page →</button></>}
        <button onClick={fold}>Fold the letter away</button>
      </nav>
    </div>}
    {example&&<p className="lt-example-caption">This example is separate from your Letter Box.</p>}
  </div>;
}
