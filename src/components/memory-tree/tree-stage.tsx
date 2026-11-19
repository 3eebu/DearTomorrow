'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildTree } from '@/lib/memory-tree-geometry';
import { makeRenderer, type Camera, type TreeRenderer } from '@/lib/memory-tree-renderer';
import { displayDay, stage, type Tree } from '@/lib/memory-tree';

export type Focus = { id:string; grow?:boolean; chapter?:boolean };
const speciesNames={cherry:'Flowering cherry',oak:'English oak',willow:'Weeping willow'};
type Props={tree:Tree; today:string; selected:string; focus:Focus|null; onChoose:(id:string)=>void; onBranch:(id:string)=>void;
  onPause:()=>void; controls:boolean};
export function TreeStage({tree,today,selected,focus,onChoose,onBranch,onPause,controls}:Props) {
  const frame=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<TreeRenderer|null>(null);
  const [available,setAvailable]=useState(false),[failed,setFailed]=useState(false),[generation,restart]=useState(0);
  const [reduced,setReduced]=useState(false),[animating,setAnimating]=useState(false),[hover,setHover]=useState(0);
  const paused=useRef(true),visible=useRef(true),lastTree=useRef(''),endGrowth=useRef<{at:number;pick:number;returnTo:Camera}|null>(null);
  const [pan,setPan]=useState(false),[expanded,setExpanded]=useState(false);
  const contacts=useRef(new Map<number,{x:number;y:number}>()),moved=useRef(0),lastHover=useRef(0);
  const {seed,chapters,memories,settings}=tree;
  const {species,season,south}=settings;
  const model=useMemo(()=>buildTree({seed,chapters,memories,settings:{species,season,south}},today),
    [seed,chapters,memories,species,season,south,today]);
  const stop=useCallback(()=>{
    if(endGrowth.current){renderer.current?.restore(endGrowth.current.returnTo);renderer.current?.growth(0,1);endGrowth.current=null;}
    setAnimating(false);
  },[]);
  useEffect(()=>{
    const mq=matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>setReduced(mq.matches);sync();mq.addEventListener('change',sync);return()=>mq.removeEventListener('change',sync);
  },[]);
  useEffect(()=>{paused.current=reduced||settings.paused;if(paused.current)stop();},[reduced,settings.paused,stop]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    let engine:TreeRenderer;
    try {engine=makeRenderer(el);}catch{setFailed(true);return;}
    renderer.current=engine;lastTree.current='';setAvailable(true);setFailed(false);
    const resize=new ResizeObserver(()=>engine.resize());resize.observe(el);engine.resize();
    const obs=new IntersectionObserver(([entry])=>{visible.current=entry.isIntersecting;});obs.observe(el);
    let request=0,last=0;
    const loop=(now:number)=>{
      if(visible.current && !document.hidden && now-last>=32){
        last=now;const growth=endGrowth.current;
        if(growth){engine.growth(growth.pick,Math.min(1,(now-growth.at)/1750));if(now-growth.at>=2650)stop();}
        engine.tick(now,!paused.current,paused.current);
      }
      request=requestAnimationFrame(loop);
    };request=requestAnimationFrame(loop);
    const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(request);setFailed(true);setAvailable(false);};
    const restored=()=>restart(n=>n+1);
    el.addEventListener('webglcontextlost',lost);el.addEventListener('webglcontextrestored',restored);
    return()=>{cancelAnimationFrame(request);resize.disconnect();obs.disconnect();el.removeEventListener('webglcontextlost',lost);el.removeEventListener('webglcontextrestored',restored);engine.dispose();renderer.current=null;};
  },[generation,stop]);
  useEffect(()=>{
    if(!available)return;
    renderer.current?.update(model,tree.id!==lastTree.current);
    if(tree.id!==lastTree.current){lastTree.current=tree.id;setHover(0);}
  },[available,generation,model,tree.id]);
  useEffect(()=>{renderer.current?.select((memories.find(m=>m.id===selected)?.slot??-1)+1);},[available,memories,selected]);
  const current=useRef({model,memories});current.current={model,memories};
  useEffect(()=>{
    const r=renderer.current;if(!r||!available||!focus)return;
    stop();
    if(focus.chapter){
      const branch=Array.from(current.current.model.branches.values()).find(c=>c.id===focus.id);
      if(branch)r.focus(branch.point);
      return;
    }
    const m=current.current.memories.find(item=>item.id===focus.id);
    const leaf=m&&current.current.model.leaves.get(m.slot+1);
    if(!leaf && focus.id!=='seed')return;
    if(focus.grow && !paused.current){
      const pose=r.pose();endGrowth.current={at:performance.now(),pick:leaf?.pick??-1,returnTo:pose};
      r.growth(leaf?.pick??-1,0);setAnimating(true);
    }
    if(leaf)r.focus(leaf.tip);else r.fit();
  },[focus,available,stop]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    function wheel(e:WheelEvent){if(document.activeElement!==el && !e.ctrlKey)return;e.preventDefault();renderer.current?.zoom(Math.exp(Math.max(-170,Math.min(170,e.deltaY))*.002));}
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
  },[]);
  useEffect(()=>{if(!expanded)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[expanded]);
  const byPick=(pick:number)=>memories.find(m=>m.slot+1===pick);
  const hovered=byPick(hover);
  const selectedMemory=memories.find(m=>m.id===selected);
  return <div ref={frame} className={'mt-stage'+(expanded?' mt-expanded':'')} data-motion={!(reduced||settings.paused)}>
    <div className="mt-specimen" data-fallback={failed}>
    <canvas ref={canvas} tabIndex={available?0:-1} aria-label="Three-dimensional Memory Tree. Arrow keys rotate, Shift and arrows pan, plus and minus zoom, Home resets the view."
      onKeyDown={e=>{const r=renderer.current;if(!r)return;
        const xy:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
        if(xy[e.key]){const [x,y]=xy[e.key];if(e.shiftKey)r.pan(x*23,y*23);else r.orbit(x*.18,y*.13);}
        else if(e.key==='+'||e.key==='=')r.zoom(.8);else if(e.key==='-')r.zoom(1.25);else if(e.key==='Home')r.reset();else return;e.preventDefault();}}
      onPointerDown={e=>{if(!available)return;e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);
        const map=contacts.current;if(!map.size)moved.current=0;else moved.current=20;map.set(e.pointerId,{x:e.clientX,y:e.clientY});}}
      onPointerMove={e=>{
        const map=contacts.current,prev=map.get(e.pointerId),r=renderer.current;if(!r||!available)return;
        if(!prev){if(e.pointerType==='mouse'&&performance.now()-lastHover.current>110){
          lastHover.current=performance.now();const id=r.pick(e.clientX,e.clientY);r.hover(id);setHover(id);}return;}
        const dx=e.clientX-prev.x,dy=e.clientY-prev.y;moved.current+=Math.abs(dx)+Math.abs(dy);
        const other=Array.from(map.entries()).find(([id])=>id!==e.pointerId)?.[1];
        if(other){const before=Math.hypot(other.x-prev.x,other.y-prev.y),after=Math.hypot(other.x-e.clientX,other.y-e.clientY);
          if(before>3&&after>3)r.zoom(before/after);r.pan(dx*.5,dy*.5);}
        else if(pan||e.shiftKey||e.buttons===2)r.pan(dx,dy);else r.orbit(-dx*.009,dy*.008);
        map.set(e.pointerId,{x:e.clientX,y:e.clientY});}}
      onContextMenu={e=>e.preventDefault()} onPointerCancel={e=>contacts.current.delete(e.pointerId)}
      onPointerLeave={()=>{renderer.current?.hover(0);setHover(0);}}
      onPointerUp={e=>{if(!contacts.current.delete(e.pointerId)||moved.current>7)return;
        const id=renderer.current?.pick(e.clientX,e.clientY)??0,leaf=model.leaves.get(id),branch=model.branches.get(id);
        if(leaf)onChoose(leaf.id);else if(branch){renderer.current?.focus(branch.point);onBranch(branch.id);}}}/>
    {failed&&<p className="mt-graphics-error" role="status">3D graphics are unavailable. Open any memory in the journal below, or use Timeline and Calendar.</p>}
    {hovered&&<div className="mt-tooltip" aria-hidden="true">{hovered.title}<small>{displayDay(hovered.date)}</small></div>}
    </div>
    <div className="mt-stage-caption">
      <p>{stage(memories.length)} <span aria-hidden="true">·</span> {speciesNames[species]}</p>
      {selectedMemory&&<button className="mt-selected-leaf" onClick={async()=>{
        if(document.fullscreenElement)await document.exitFullscreen();
        setExpanded(false);document.getElementById('mt-selected-title')?.focus({preventScroll:true});
        document.getElementById('mt-selected-title')?.scrollIntoView({block:'center'});
      }}>
        <span>{selectedMemory.title}</span><span aria-hidden="true">↗</span>
      </button>}
    </div>
    {available&&<div className="mt-camera" role="group" aria-label="Tree camera controls">
      <button aria-label="Rotate left" title="Rotate left" onClick={()=>renderer.current?.orbit(-.47,0)}>↶</button>
      <button aria-label="Rotate right" title="Rotate right" onClick={()=>renderer.current?.orbit(.47,0)}>↷</button>
      <button aria-label="Zoom out" title="Zoom out" onClick={()=>renderer.current?.zoom(1.33)}>−</button>
      <button aria-label="Zoom in" title="Zoom in" onClick={()=>renderer.current?.zoom(.75)}>+</button>
      <button onClick={()=>{setPan(false);renderer.current?.reset();}}>Reset</button>
      <details className="mt-menu mt-view-menu">
        <summary>View options</summary>
        <div className="mt-menu-actions">
          <button onClick={()=>setPan(!pan)} aria-pressed={pan}>Pan</button>
          <button onClick={()=>renderer.current?.fit()}>Fit tree</button>
          <button onClick={()=>{if(expanded)setExpanded(false);else if(document.fullscreenElement)void document.exitFullscreen();
            else if(frame.current?.requestFullscreen)void frame.current.requestFullscreen().catch(()=>setExpanded(true));else setExpanded(true);}}>Fullscreen tree</button>
          {controls&&<button disabled={reduced} onClick={onPause}>{reduced?'Reduced motion':settings.paused?'Resume motion':'Pause motion'}</button>}
        </div>
      </details>
      {animating&&<button className="mt-skip" onClick={stop}>Skip growth</button>}
    </div>}
  </div>;
}
