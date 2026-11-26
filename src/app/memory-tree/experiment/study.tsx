'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { stage as nameForCount } from '@/lib/memory-tree';
import { startScene, type Measurements, type StudyOptions, type TimeOfDay } from './renderer';
import styles from './study.module.css';

const counts=[0,1,3,9,24,80,200];
export function LandscapeStudy(){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [options,setOptions]=useState<StudyOptions>({stage:6,lighting:'Daylight',paused:false});
  const live=useRef(options);
  const [stats,setStats]=useState<Measurements|null>(null);
  const [error,setError]=useState(false);
  const [attempt,retry]=useState(0);
  useEffect(()=>{
    live.current=options;
    canvas.current?.dispatchEvent(new Event('studychange'));
  },[options]);
  useEffect(()=>{
    const element=canvas.current!;
    const controller=new AbortController();
    function failed(){if(!controller.signal.aborted)setError(true);}
    function lost(e:Event){e.preventDefault();failed();controller.abort();}
    const restored=()=>{setError(false);setStats(null);retry(a=>a+1);};
    element.addEventListener('webglcontextlost',lost);
    element.addEventListener('webglcontextrestored',restored);
    startScene(element,()=>live.current,setStats,controller.signal).catch(failed);
    return ()=>{controller.abort();element.removeEventListener('webglcontextlost',lost);element.removeEventListener('webglcontextrestored',restored);};
  },[attempt]);
  return <main className={styles.page}>
    <div className={styles.header}>
      <Link href="/memory-tree">← Memory Tree</Link>
      <h1>The living landscape</h1>
      <span>Environment study</span>
    </div>
    <figure className={styles.figure}>
      <div className={styles.stage}>
        <canvas ref={canvas} key={attempt} aria-label={`${counts.map(nameForCount)[options.stage]} in a mountain meadow, ${options.lighting.toLowerCase()}`}
          className={stats && !error ? styles.ready : undefined} data-ready={!!stats&&!error}/>
      </div>
      <figcaption className={styles.controls}>
        <fieldset disabled={error}><legend>Light</legend><div className={styles.segments}>
          {(['Daylight','Sunset','Night'] as TimeOfDay[]).map(lighting=><button key={lighting} aria-pressed={options.lighting===lighting}
            onClick={()=>setOptions(o=>({...o,lighting}))}>{lighting}</button>)}
        </div></fieldset>
        <label className={styles.growth}>Growth
          <select disabled={error} value={options.stage} onChange={e=>setOptions(o=>({...o,stage:Number(e.target.value)}))}>
            {counts.map((n,i)=><option key={n} value={i}>{nameForCount(n)}</option>)}
          </select>
        </label>
        <button className={styles.motion} disabled={error} onClick={()=>setOptions(o=>({...o,paused:!o.paused}))}>
          {options.paused?'Resume wind':'Pause wind'}</button>
      </figcaption>
    </figure>
    {error?<p role="status" className={styles.status}>Showing the original painting. The live renderer is unavailable. <button onClick={()=>{setStats(null);setError(false);retry(a=>a+1);}}>Try again</button></p>
      :<details className={styles.metrics}><summary>Rendering details</summary>
        <p>{stats?`${stats.leaves.toLocaleString()} leaves · ${stats.clusters.toLocaleString()} foliage clusters · ${stats.limbs.toLocaleString()} woody segments · ${stats.grass.toLocaleString()} meadow instances · ${stats.calls} draw calls · ${stats.width} × ${stats.height} pixels`:'Preparing the live scene…'}</p>
      </details>}
  </main>;
}
