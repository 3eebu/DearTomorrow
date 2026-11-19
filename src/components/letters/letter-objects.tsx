'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { LIMITS, type Envelope, type Page, type Paper, type Stroke } from '@/lib/letters';
import type { TextRun } from '@/lib/memory-books';

export type Face = 'front' | 'back';
export type Phase = 'rest' | 'sealing' | 'opening' | 'returning';
export const motionMs = { sealing: 3160, opening: 2890, returning: 2600 };
export const paperColors: Record<Paper['material'],string> = {
  ivory:'#fcf3df', handmade:'#f1e6d3', parchment:'#e9d6ae', pink:'#fae7e4', lined:'#fff9eb', floral:'#faf0df', white:'#fffdf9', custom:'',
};
const fontStacks: Record<Page['font'],string> = { editorial:'"Playfair Display", Georgia, serif',
  hand:'"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive', classic:'Georgia, serif', simple:'inherit' };

export function useReducedMotion() {
  const [reduced,set]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>set(media.matches);sync();
    media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);
  },[]);
  return reduced;
}

export function Ornament({motif}:{motif:Paper['motif']}) {
  if(motif==='none')return null;
  return <span className={'lt-ornament lt-ornament-'+motif} aria-hidden="true">
    {motif==='branch'?<><i/><i/><i/><i/><i/></>:motif==='flower'?<><i/><i/><i/><i/><i/><i/></>:motif==='heart'?'♡':'✧ · ✦'}
  </span>;
}

function envelopeInk(hex:string){
  const channels=hex.slice(1).match(/.{2}/g)?.map(value=>parseInt(value,16))??[];
  return (channels[0]*.213+channels[1]*.715+channels[2]*.072)<116?'#fff4df':'#38271e';
}
function envStyle(design:Envelope) {
  return {'--lt-env':design.color,'--lt-env-ink':envelopeInk(design.color),'--lt-wax':design.back.wax} as CSSProperties;
}
function Address({design}:{design:Envelope}){
  const {front}=design;
  return <>
    {front.border&&<i className="lt-env-border"/>}
    {front.from&&<span className="lt-env-from">From {front.from}</span>}
    {front.stamp&&<span className="lt-env-stamp"><i aria-hidden="true">✦</i>{front.stamp}</span>}
    <span className="lt-env-address">{front.to||'For you'}{front.note&&<small>{front.note}</small>}</span>
    <span className="lt-postmark" aria-hidden="true"><i/><i/><i/></span>
  </>;
}
export function EnvelopeThumb({design}:{design:Envelope}) {
  return <span className="lt-env-thumb" data-material={design.material} style={envStyle(design)} aria-hidden="true"><Address design={design}/></span>;
}
function Wax({design}:{design:Envelope}) {
  const emblems={heart:'♥',flower:'✿',star:'✦',initials:design.back.initials||'DT'};
  return <span className="lt-wax"><i>{emblems[design.back.emblem]}</i></span>;
}
export function EnvelopeObject({design,paper,face,phase='rest',title}:{design:Envelope;paper:Paper;face:Face;phase?:Phase;title:string}){
  return <div aria-hidden="true" className="lt-object" data-face={face} data-phase={phase} data-flap={design.flap}
    data-material={design.material} style={{...envStyle(design),'--lt-sheet':paper.material==='custom'?paper.color:paperColors[paper.material]} as CSSProperties}>
    <div className="lt-object-shadow"/>
    <div className="lt-object-turn">
      <div className="lt-env-face lt-env-front"><Address design={design}/></div>
      <div className="lt-env-face lt-env-back">
        <div className="lt-env-interior"/>
        {phase!=='rest'&&<div className="lt-sheet-carriage"><div className="lt-folded-sheet">
          <div className="lt-fold-band lt-fold-top"><span>{title}</span><i/><i/></div>
          <div className="lt-fold-band lt-fold-middle"><i/><i/><i/></div>
          <div className="lt-fold-band lt-fold-bottom"><i/><i/><i/></div>
        </div></div>}
        <div className="lt-env-pocket"/>
        <div className="lt-env-flap"><div/></div>
        <Wax design={design}/>
        {design.ribbon&&<span className="lt-env-ribbon"><i/><b/></span>}
        {design.back.botanical&&<span className="lt-back-branch"><Ornament motif="branch"/></span>}
        {design.back.inscription&&<span className="lt-env-inscription">{design.back.inscription}</span>}
      </div>
    </div>
  </div>;
}

export function PaperSurface({paper,page,children}:{paper:Paper;page:Page;children:ReactNode}){
  return <div className="lt-paper" data-paper={paper.material} data-border={paper.border} data-texture={paper.texture}
    style={{'--lt-sheet':paper.material==='custom'?paper.color:paperColors[paper.material],'--lt-page-font':fontStacks[page.font],
      '--lt-page-ink':page.ink,'--lt-page-size':page.size+'px','--lt-page-space':page.spacing+'px','--lt-align':page.align} as CSSProperties}>
    {paper.watermark&&<div className="lt-watermark" aria-hidden="true">{paper.watermark}</div>}
    <Ornament motif={paper.motif==='none'&&paper.material==='floral'?'flower':paper.motif}/>
    <div className="lt-paper-content">{children}</div>
  </div>;
}
export function PageWords({page}:{page:Page}){
  const paragraphs:TextRun[][]=[[]];
  for(const run of page.runs??[{text:page.text}]) {
    run.text.split('\n').forEach((text,index)=>{
      if(index)paragraphs.push([]);
      if(text)paragraphs[paragraphs.length-1].push({...run,text});
    });
  }
  return <div className="lt-page-words">{paragraphs.map((row,i)=><p key={i}>{row.length?row.map((run,index)=><span key={index}
    style={{fontWeight:run.bold?700:undefined,fontStyle:run.italic?'italic':undefined,textDecoration:run.underline?'underline':undefined,color:run.color}}>{run.text}</span>):'\u00a0'}</p>)}</div>;
}
export function PagePhoto({photo}:{photo:NonNullable<Page['photo']>}){
  return <figure className="lt-page-photo" data-polaroid={photo.polaroid}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photo.data} alt={photo.caption||'Photograph attached to the letter'} decoding="async"/>
    {photo.caption&&<figcaption>{photo.caption}</figcaption>}
  </figure>;
}

function renderStrokes(canvas:HTMLCanvasElement,strokes:Stroke[]) {
  const brush=canvas.getContext('2d');
  if(!brush)return;
  brush.clearRect(0,0,canvas.width,canvas.height);
  brush.lineCap='round';brush.lineJoin='round';brush.lineWidth=3;
  for(const stroke of strokes){
    const [first,...rest]=stroke.points;
    if(!first)continue;
    brush.strokeStyle=stroke.ink;brush.fillStyle=stroke.ink;brush.beginPath();
    brush.moveTo(first[0]*canvas.width,first[1]*canvas.height);
    if(rest.length){
      for(const [x,y] of rest)brush.lineTo(x*canvas.width,y*canvas.height);
      brush.stroke();
    }else{brush.arc(first[0]*canvas.width,first[1]*canvas.height,1.5,0,Math.PI*2);brush.fill();}
  }
}

export function InkDrawing({strokes,active=false,ink,onChange}:{strokes:Stroke[];active?:boolean;ink?:string;onChange?:(value:Stroke[])=>void}){
  const canvas=useRef<HTMLCanvasElement>(null),draft=useRef<{id:number;stroke:Stroke}|null>(null);
  useEffect(()=>{if(canvas.current)renderStrokes(canvas.current,strokes);},[strokes]);
  function point(event:PointerEvent<HTMLCanvasElement>){
    const rect=event.currentTarget.getBoundingClientRect();
    const clamp=(n:number)=>Math.round(Math.min(1,Math.max(0,n))*10000)/10000;
    return [clamp((event.clientX-rect.left)/rect.width),clamp((event.clientY-rect.top)/rect.height)] as [number,number];
  }
  return <canvas ref={canvas} className="lt-drawing" data-active={active} width={900} height={245}
    role="img" aria-label={active?'Drawing area. Use a mouse, pen or touch.':'Hand-drawn decoration'}
    onPointerDown={e=>{
      if(!active||!onChange||draft.current||strokes.length>=LIMITS.strokes||e.button!==0)return;
      e.currentTarget.setPointerCapture(e.pointerId);draft.current={id:e.pointerId,stroke:{ink:ink??'#43302c',points:[point(e)]}};
      renderStrokes(e.currentTarget,[...strokes,draft.current.stroke]);
    }}
    onPointerMove={e=>{
      const pending=draft.current;
      if(!pending||pending.id!==e.pointerId||pending.stroke.points.length>=LIMITS.points)return;
      pending.stroke.points.push(point(e));renderStrokes(e.currentTarget,[...strokes,pending.stroke]);
    }}
    onPointerUp={e=>{
      const pending=draft.current;
      if(pending?.id!==e.pointerId)return;
      draft.current=null;onChange?.([...strokes,pending.stroke]);
    }}
    onPointerCancel={e=>{draft.current=null;renderStrokes(e.currentTarget,strokes);}}
  />;
}
