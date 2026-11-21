'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {LetterReader} from '@/components/letters/letter-reader';
import {BookReader} from '@/components/memory-books/book-reader';
import {SharedTree} from '@/components/memory-tree/memory-tree-workspace';
import {JourneyMap} from '@/components/journey-letters/journey-map';
import {RouteTimes} from '@/components/journey-letters/journey-forms';
import {defaultPreferences,type Letter} from '@/lib/letters';
import {journeyProgress,type Journey} from '@/lib/journey-letters';
import {validateDocument,type CloudDocument} from '@/lib/accounts/documents';
import {readDocument} from '@/lib/accounts/cloud-client';
import '../letters/letters.css';
import '../journey-letters/journey.css';

type View = Omit<CloudDocument,'ownerId'>;
const localTime = (instant:number)=>new Date(instant).toLocaleString();

function ReadLetter({letter,owner}:{letter:Letter;owner:boolean}) {
  const [preferences,setPreferences]=useState(defaultPreferences);
  const preview=owner&&letter.state==='draft'?{...letter,state:'sealed' as const}:letter;
  return <div className="lt-workspace"><section className="lt-reading-room">
    <LetterReader letter={{...preview,release:owner?preview.release:null}} preferences={preferences}
      savePreferences={patch=>setPreferences(previous=>({...previous,...patch}))} opened={async()=>true} finishArrival={()=>{}}/>
  </section></div>;
}
function ReadJourney({journey,view,reload}:{journey:Journey;view:View;reload:()=>void}) {
  const [index,setIndex]=useState<number|null>(null);
  const content=useRef<HTMLDivElement>(null);
  const letter=index===null?null:journey.checkpoints[index]?.letter;
  useEffect(()=>{
    if(index===null)return;
    content.current?.querySelector<HTMLElement>('[data-letters-heading]')?.focus();
  },[index,letter]);
  if(letter)return <div ref={content}>
    <button className="dt-account-link" onClick={()=>setIndex(null)}>← Back to envelopes</button>
    <ReadLetter key={letter.id} letter={letter} owner={view.owned}/>
  </div>;
  return <div className="jl-root">
    {journey.dedication&&<p className="jl-dedication">{journey.dedication}</p>}
    <RouteTimes plan={journey}/>
    <JourneyMap from={journey.from} to={journey.to} progress={journeyProgress(journey,Date.now())}/>
    <ol className="dt-account-list">
      {journey.checkpoints.map((stop,i)=>{
        const gate=view.gates[i];
        return <li key={stop.id}><div><strong>{stop.label}</strong>
          <small>{stop.letter?'Ready to read':gate?.sealed?'Sealed until '+localTime(gate.instant):'No sealed letter yet'}</small></div>
          {stop.letter&&<button className="dt-account-secondary" onClick={()=>setIndex(i)}>Open envelope {i+1}</button>}</li>;
      })}
    </ol>
    {!view.owned&&<button className="dt-account-link" onClick={reload}>Check for newly available envelopes</button>}
  </div>;
}

export function MemoryViewer({owner,document,returnTo}:{owner:string;document:string;returnTo:string}) {
  const [view,setView]=useState<View|null>(null),[error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const router=useRouter();
  const live=useRef(true),sequence=useRef(0);
  const reload=useCallback(async()=>{
    const ticket=++sequence.current;
    setLoading(true);setError('');
    try {
      const result=await readDocument(owner,document);
      if(live.current&&ticket===sequence.current)setView(result);
    } catch(error) {
      if(live.current&&ticket===sequence.current){
        setView(null);
        setError(error instanceof Error?error.message:'This memory is unavailable.');
      }
    } finally {if(live.current&&ticket===sequence.current)setLoading(false);}
  },[owner,document]);
  useEffect(()=>{
    live.current=true;
    void reload();
    return ()=>{live.current=false;};
  },[reload]);
  if(loading&&!view)return <p role="status">Opening this keepsake…</p>;
  if(error||!view)return <div role="alert"><p>{error||'This memory is unavailable.'}</p>
    <button className="dt-account-link" onClick={()=>void reload()}>Try again</button></div>;
  if(view.locked)return <div className="dt-account-card">
    <h2>A letter waiting for its day.</h2>
    <p>{view.opens&&view.opens>0?'Scheduled for '+localTime(view.opens)+'.':'This letter is still being prepared.'}</p>
    <button className="dt-account-link" disabled={loading} onClick={()=>void reload()}>Check opening time</button>
  </div>;
  try {
    if(view.kind==='letters')return <ReadLetter letter={validateDocument('letters',view.payload)} owner={view.owned}/>;
    if(view.kind==='books')return <BookReader book={validateDocument('books',view.payload)} onExit={()=>router.push(returnTo)} startWrapped/>;
    if(view.kind==='trees')return <SharedTree tree={validateDocument('trees',view.payload)}/>;
    return <ReadJourney journey={validateDocument('journeys',view.payload)} view={view} reload={()=>void reload()}/>;
  } catch {return <p role="alert">This memory could not be read. Your saved copy was kept.</p>;}
}
