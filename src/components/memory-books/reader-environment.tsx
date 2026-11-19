'use client';
import {useEffect,useState} from 'react';
import s from './reader-environment.module.css';
export function useEnvironment(id:string){const [scene,setScene]=useState('morning');useEffect(()=>{try{const v=sessionStorage.getItem('dt-scene:'+id);if(v&&['morning','candle','rain'].includes(v))setScene(v);}catch{}},[id]);return {scene,choose:(v:string)=>{setScene(v);try{sessionStorage.setItem('dt-scene:'+id,v);}catch{}}};}
export function ReaderEnvironment({ scene, choose }: { scene: string; choose: (value: string) => void }) {
  const [paused, setPaused] = useState(false);
  return <>
    <nav className={s.picker} aria-label="Reading environment">
      {[['morning', 'Morning Sun'], ['candle', 'Candlelight'], ['rain', 'Rainy Afternoon']].map(([value, label]) =>
        <button key={value} aria-pressed={scene === value} onClick={() => choose(value)}>{label}</button>
      )}
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>Pause scene motion</button>
    </nav>
    <div className={s.decor} data-paused={paused} aria-hidden="true">
      <div className={s.table}/>
      {scene === 'candle' ? <div className={s.candle}>
        <i className={s.glow}/><i className={s.flame}/><i className={s.wick}/><div className={s.wax}/><div className={s.saucer}/>
      </div> : scene === 'rain' ? <div className={s.window}><i className={s.rainDrops}/></div> :
        <div className={s.sun}/>}
    </div>
  </>;
}
