'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatRange, editText } from '@/lib/studio-content';
import { readPhoto } from '@/lib/memory-book-storage';
import { kinds, letterFonts, LIMITS, motifs, newPage, papers, sealLetter, validPhoto, waxColors, type Collection,
  type Envelope, type Letter, type Page, type Paper } from '@/lib/letters';
import { validZone, wallOptions } from '@/lib/letter-time';
import { EnvelopeObject, InkDrawing, PagePhoto, PageWords, PaperSurface, type Face } from './letter-objects';
import { VoiceAttachment } from './letter-attachments';

type Patch = (change:(letter:Letter)=>Letter) => void;
type SaveStatus = 'saved' | 'typing' | 'saving' | 'error';
type Tool = 'Writing' | 'Paper' | 'Envelope' | 'Extras';
const tools:Tool[]=['Writing','Paper','Envelope','Extras'];
const message=(reason:unknown)=>reason instanceof Error?reason.message:'Unable to save this letter.';

export function LetterStudio({initial,collections,save,exit,sealed,backup,journey=false,cloud=false}:{
  initial:Letter; collections:Collection[];save:(doc:Letter)=>Promise<void>;exit:()=>void;
  sealed:(doc:Letter)=>void;backup:(doc:Letter)=>void;journey?:boolean;cloud?:boolean;
}){
  const [letter,setLetter]=useState(initial);
  const [index,setIndex]=useState(0),[tool,setTool]=useState<Tool>('Writing'),[face,setFace]=useState<Face>('front');
  const [status,setStatus]=useState<SaveStatus>('saved'),[saveError,setSaveError]=useState(''),[error,setError]=useState('');
  const [finalizing,setFinalizing]=useState(false),[audioBusy,setAudioBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false);
  const [preview,setPreview]=useState(false),[drawing,setDrawing]=useState(false),[confirmRemove,setConfirmRemove]=useState(false);
  const current=useRef(initial),saved=useRef(initial),queue=useRef(Promise.resolve()),saveRef=useRef(save);
  const request=useRef(false),done=useRef(false),mounted=useRef(true);
  const textarea=useRef<HTMLTextAreaElement>(null),range=useRef({start:0,end:0});
  saveRef.current=save;
  const dispatch=useCallback<Patch>(change=>{
    if(request.current)return;
    const next=change(current.current);
    current.current={...next,updatedAt:Math.max(next.createdAt,Date.now())};
    setStatus('typing');setError('');setLetter(current.current);
  },[]);
  const write=useCallback((doc:Letter)=>{
    const result=queue.current.then(async()=>{
      if(doc===saved.current||done.current)return true;
      if(mounted.current){setStatus('saving');setSaveError('');}
      try{
        await saveRef.current(doc);
        saved.current=doc;
        if(mounted.current&&current.current===doc)setStatus('saved');
        return true;
      }catch(reason){
        if(mounted.current){setStatus('error');setSaveError(message(reason));}
        return false;
      }
    });
    queue.current=result.then(()=>{});
    return result;
  },[]);
  useEffect(()=>{
    if(letter===saved.current||request.current)return;
    const delay=window.setTimeout(()=>void write(letter),650);
    return()=>window.clearTimeout(delay);
  },[letter,write]);
  useEffect(()=>{
    mounted.current=true;
    function warn(event:BeforeUnloadEvent){
      if(!done.current&&saved.current!==current.current){event.preventDefault();event.returnValue=true;}
    }
    function visibility(){
      if(!done.current&&!request.current&&document.visibilityState==='hidden'&&saved.current!==current.current)void write(current.current);
    }
    function leave(event:MouseEvent){
      if (done.current || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
      if(!target||target.target==='_blank'||target.hasAttribute('download')||target.origin!==location.origin||
        target.pathname===location.pathname||saved.current===current.current)return;
      event.preventDefault();
      const destination=target.href;
      void write(current.current).then(ok=>{if(ok&&saved.current===current.current){done.current=true;window.location.assign(destination);}});
    }
    window.addEventListener('beforeunload',warn);
    document.addEventListener('visibilitychange',visibility);
    document.addEventListener('click',leave,true);
    return()=>{
      mounted.current=false;
      window.removeEventListener('beforeunload',warn);
      document.removeEventListener('visibilitychange',visibility);
      document.removeEventListener('click',leave,true);
      if(!done.current&&!request.current&&saved.current!==current.current)void write(current.current);
    };
  },[write]);

  const page=letter.pages[index];
  const pending=finalizing||audioBusy||photoBusy;
  const pageChange=(update:(p:Page)=>Page,id=page.id)=>dispatch(l=>({...l,pages:l.pages.map(p=>p.id===id?update(p):p)}));
  const field=(patch:Partial<Letter>)=>dispatch(l=>({...l,...patch}));
  const pageFields=(patch:Partial<Page>)=>pageChange(p=>({...p,...patch}));
  const changePaper=(patch:Partial<Paper>)=>dispatch(l=>({...l,paper:{...l.paper,...patch}}));
  const go=(next:number)=>{setIndex(next);setConfirmRemove(false);setDrawing(false);range.current={start:0,end:0};};
  async function finish(seal:boolean){
    if(request.current||pending)return;
    request.current=true;setFinalizing(true);setError('');
    try {
      const next=seal?sealLetter(current.current,Date.now()):current.current;
      if(await write(next)){
        done.current=true;
        if(seal)sealed(next);else exit();
      }
    }catch(reason){setError(message(reason));}
    finally{request.current=false;if(mounted.current)setFinalizing(false);}
  }
  function format(style:'bold'|'italic'|'underline'){
    const {start,end}=range.current;
    const left=end>start?start:0,right=end>start?end:page.text.length;
    const runs=page.runs??[{text:page.text}];
    let cursor=0;
    const affected=runs.filter(run=>{const from=cursor;cursor+=run.text.length;return cursor>left&&from<right;});
    if(!affected.length)return;
    const next=formatRange(page.text,page.runs,left,right,{[style]:!affected.every(run=>run[style])});
    if(next.length>LIMITS.runs){setError('This page has reached its mixed-formatting limit. Continue on another page.');return;}
    pageFields({runs:next});
    setPreview(true);
  }
  function removePage(){
    const goal=Math.max(0,index-1);
    dispatch(l=>({...l,pages:l.pages.filter(p=>p.id!==page.id)}));go(goal);
  }
  async function attach(file:File,id:string){
    setPhotoBusy(true);setError('');
    try{
      const data=await readPhoto(file);
      if(!validPhoto(data))throw new Error('This prepared photo is too large. Choose a smaller photograph.');
      pageChange(p=>({...p,photo:{data,caption:p.photo?.caption??'',polaroid:p.photo?.polaroid??true}}),id);
    }catch(reason){setError(message(reason));}
    finally{setPhotoBusy(false);}
  }
  return <section className="lt-studio" aria-labelledby="lt-studio-title">
    <div className="lt-workbench-heading">
      <div><h1 id="lt-studio-title" tabIndex={-1} data-letters-heading>Letter Studio</h1><p role="status">{status==='saved'?(cloud?'Draft saved to My Space':'Draft saved on this device'):status==='typing'?'Unsaved changes…':status==='saving'?(cloud?'Syncing draft…':'Saving draft…'):'Draft needs saving'}</p></div>
      <div className="lt-actions">
        <button disabled={pending} onClick={()=>void finish(false)}>{journey?'Save and return to journey':'Save and return to box'}</button>
        <button className="lt-primary" disabled={pending} onClick={()=>void finish(true)}>Seal letter <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    {(saveError||error)&&<div className="lt-notice" role="alert">
      {error||saveError}
      {saveError&&<div className="lt-actions"><button onClick={()=>void write(current.current)}>Retry save</button>
        <button onClick={()=>backup(current.current)}>Export this draft</button></div>}
    </div>}
    <div className="lt-studio-grid" data-tool={tool.toLowerCase()}>
      <div className="lt-editor-desk">
        {tool==='Envelope'?<div className="lt-envelope-preview">
          <EnvelopeObject design={letter.envelope} paper={letter.paper} face={face} title={letter.title}/>
          <div className="lt-action-center"><button onClick={()=>setFace(face==='front'?'back':'front')}>{face==='front'?'Preview envelope back':'Preview envelope front'} ↻</button></div>
        </div>:<>
          <div className="lt-page-strip">
            <div className="lt-actions" aria-label="Studio page controls">
              <button aria-label="Previous writing page" disabled={index===0||pending} onClick={()=>go(index-1)}>←</button>
              <span>Page {index+1} of {letter.pages.length}</span>
              <button aria-label="Next writing page" disabled={index===letter.pages.length-1||pending} onClick={()=>go(index+1)}>→</button>
              <button disabled={letter.pages.length>=LIMITS.pages||pending} onClick={()=>{
                dispatch(l=>({...l,pages:[...l.pages,newPage()]}));go(letter.pages.length);setPreview(false);
              }}>Add page</button>
            </div>
            <button aria-pressed={preview} onClick={()=>{setPreview(!preview);if(preview)window.requestAnimationFrame(()=>textarea.current?.focus());}}>
              {preview?'Write on paper':'Preview page'}</button>
          </div>
          <PaperSurface paper={letter.paper} page={page}>
            {preview?<PageWords page={page}/>:<textarea key={page.id} ref={textarea} className="lt-paper-writing" aria-label="Write on the letter"
              disabled={finalizing} rows={12} maxLength={LIMITS.words} placeholder="Dear you," value={page.text}
              onSelect={event=>{range.current={start:event.currentTarget.selectionStart,end:event.currentTarget.selectionEnd};}}
              onChange={event=>{
                const text=event.currentTarget.value;
                pageChange(p=>({...p,text,runs:editText(p.text,text,p.runs)}));
              }}/>}
            {page.photo&&<PagePhoto photo={page.photo}/>}
            {page.signature&&<p className="lt-signature">{page.signature}</p>}
            {(drawing||page.drawing.length>0)&&<InkDrawing key={page.id} strokes={page.drawing} active={drawing&&!finalizing}
              ink={page.ink} onChange={value=>pageFields({drawing:value})}/>}
            {drawing&&<div className="lt-actions"><button onClick={()=>pageFields({drawing:page.drawing.slice(0,-1)})} disabled={!page.drawing.length}>Undo stroke</button>
              <button onClick={()=>setDrawing(false)}>Finish drawing</button></div>}
          </PaperSurface>
        </>}
      </div>
      <aside className="lt-inspector" aria-label="Letter Studio tools">
        <nav aria-label="Studio tools" className="lt-inspector-nav">{tools.map(name=><button key={name} aria-pressed={tool===name} disabled={audioBusy||finalizing}
          onClick={()=>{setTool(name);setDrawing(false);}}>{name}</button>)}</nav>
        <fieldset className="lt-fields" disabled={finalizing}>
        {tool==='Writing'&&<>
          <label>Letter title<input value={letter.title} maxLength={120} onChange={e=>field({title:e.target.value})}/></label>
          {!journey&&<><label>Letter type<select value={letter.kind} onChange={e=>field({kind:e.target.value as Letter['kind']})}>
            {Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <label>Collection<select value={letter.collectionId} onChange={e=>field({collectionId:e.target.value})}><option value="">No collection</option>
            {collections.map(collection=><option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
          {letter.kind==='when'&&<label>Open when… <input value={letter.label} maxLength={120} onChange={e=>field({label:e.target.value})} placeholder="you miss me"/></label>}
          {letter.kind==='tomorrow'&&<Schedule letter={letter} change={timing=>field({timing})}/>}</>}
          <details open><summary>Writing style</summary><div className="lt-fields">
            <label>Font<select value={page.font} onChange={e=>pageFields({font:e.target.value as Page['font']})}>
              {Object.entries(letterFonts).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
            <div className="lt-field-pair"><label>Font size<input type="number" min={16} max={34} value={page.size}
              onChange={e=>pageFields({size:Math.max(16,Math.min(34,Number(e.target.value)))})}/></label>
              <label>Ink color<input type="color" value={page.ink} onChange={e=>pageFields({ink:e.target.value})}/></label></div>
            <label>Alignment<select value={page.align} onChange={e=>pageFields({align:e.target.value as Page['align']})}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <label>Paragraph spacing<input type="range" min={0} max={24} step={2} value={page.spacing} onChange={e=>pageFields({spacing:Number(e.target.value)})}/></label>
            <div className="lt-actions" aria-label="Text formatting">
              <button disabled={!page.text} onClick={()=>format('bold')}>Bold</button>
              <button disabled={!page.text} onClick={()=>format('italic')}>Italic</button>
              <button disabled={!page.text} onClick={()=>format('underline')}>Underline</button>
            </div>
            <small>Select words on the paper to format them. With no selection, the style applies to the whole page.</small>
            <label>Signature<input value={page.signature} maxLength={100} placeholder="With love," onChange={e=>pageFields({signature:e.target.value})}/></label>
          </div></details>
          {letter.pages.length>1&&<details><summary>Arrange pages</summary>
            <div className="lt-actions">
              <button disabled={index===0} onClick={()=>{
                dispatch(l=>{const pages=[...l.pages];[pages[index-1],pages[index]]=[pages[index],pages[index-1]];return {...l,pages};});go(index-1);
              }}>Move page earlier</button>
              <button disabled={index===letter.pages.length-1} onClick={()=>{
                dispatch(l=>{const pages=[...l.pages];[pages[index+1],pages[index]]=[pages[index],pages[index+1]];return {...l,pages};});go(index+1);
              }}>Move page later</button>
              {!confirmRemove?<button onClick={()=>setConfirmRemove(true)}>Remove page…</button>:
                <><button onClick={removePage}>Remove this page</button><button onClick={()=>setConfirmRemove(false)}>Keep page</button></>}
            </div>
          </details>}
        </>}
        {tool==='Paper'&&<>
          <label>Stationery<select value={letter.paper.material} onChange={e=>changePaper({material:e.target.value as Paper['material']})}>
            {Object.entries(papers).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          {letter.paper.material==='custom'&&<label>Paper color<input type="color" value={letter.paper.color} onChange={e=>changePaper({color:e.target.value})}/></label>}
          <label className="lt-check"><input type="checkbox" checked={letter.paper.texture} onChange={e=>changePaper({texture:e.target.checked})}/> Paper texture</label>
          <label className="lt-check"><input type="checkbox" checked={letter.paper.border} onChange={e=>changePaper({border:e.target.checked})}/> Ruled border</label>
          <label>Decoration<select value={letter.paper.motif} onChange={e=>changePaper({motif:e.target.value as Paper['motif']})}>
            {Object.entries(motifs).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <label>Watermark initials<input maxLength={6} value={letter.paper.watermark} onChange={e=>changePaper({watermark:e.target.value})}/></label>
        </>}
        {tool==='Envelope'&&<EnvelopeTools design={letter.envelope} face={face} setFace={setFace} change={patch=>dispatch(l=>({...l,envelope:{...l.envelope,...patch}}))}/>}
        {tool==='Extras'&&<>
          <details open><summary>Photograph & drawing</summary><div className="lt-fields">
            <label>Page photograph<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={event=>{
              const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(file)void attach(file,page.id);
            }}/></label>
            {photoBusy&&<small role="status">Preparing the photograph…</small>}
            {page.photo&&<><label>Photo caption<input maxLength={160} value={page.photo.caption} onChange={e=>pageFields({photo:{...page.photo!,caption:e.target.value}})}/></label>
              <label className="lt-check"><input type="checkbox" checked={page.photo.polaroid} onChange={e=>pageFields({photo:{...page.photo!,polaroid:e.target.checked}})}/> Polaroid frame</label>
              <button onClick={()=>pageFields({photo:null})}>Remove photo</button></>}
            <button aria-pressed={drawing} disabled={page.drawing.length>=LIMITS.strokes} onClick={()=>setDrawing(!drawing)}>{drawing?'Stop drawing':'Draw on this page'}</button>
            {!!page.drawing.length&&<button onClick={()=>pageFields({drawing:page.drawing.slice(0,-1)})}>Remove last drawing stroke</button>}
          </div></details>
          <details><summary>Hidden message & date</summary><div className="lt-fields">
            <label>Hidden message<textarea rows={4} maxLength={6000} value={letter.hidden} onChange={e=>field({hidden:e.target.value})}/></label>
            <label>Special date<input type="date" min="1900-01-01" max="2199-12-31" value={letter.specialDate} onChange={e=>field({specialDate:e.target.value})}/></label>
          </div></details>
          <details><summary>Voice recording</summary><div className="lt-fields">
            <VoiceAttachment asset={letter.voice} onChange={voice=>field({voice})} busy={setAudioBusy}/>
            <label>Transcript<textarea rows={3} maxLength={12000} value={letter.transcript} onChange={e=>field({transcript:e.target.value})}/></label>
          </div></details>
        </>}
        </fieldset>
      </aside>
    </div>
  </section>;
}

function Schedule({letter,change}:{letter:Letter;change:(timing:Letter['timing'])=>void}){
  const {timing}=letter;
  const options=useMemo(()=>wallOptions(timing.wall,timing.zone),[timing.wall,timing.zone]);
  const zones=useMemo(()=>Array.from(new Set(['UTC',timing.zone,'America/New_York','America/Los_Angeles','Europe/London','Asia/Karachi',
    ...(typeof Intl.supportedValuesOf==='function'?Intl.supportedValuesOf('timeZone'):[])])).filter(validZone).sort(),[timing.zone]);
  function set(update:Partial<Letter['timing']>){change({...timing,...update});}
  return <div className="lt-fields lt-schedule">
    <label>Intended opening time<input type="datetime-local" min="1900-01-01T00:00" max="2199-12-31T23:59" value={timing.wall} onChange={e=>set({wall:e.target.value})}/></label>
    <label>Opening time zone<select value={timing.zone} onChange={e=>set({zone:e.target.value})}>
      {zones.map(zone=><option key={zone} value={zone}>{zone.replaceAll('_',' ')}</option>)}</select></label>
    {options.length>1&&<label>This hour occurs twice. Use<select value={timing.occurrence} onChange={e=>set({occurrence:e.target.value as 'earlier'|'later'})}>
      <option value="earlier">The first occurrence</option><option value="later">The second occurrence</option></select></label>}
    {timing.wall&&!options.length&&<small role="status">That local time does not exist. Choose a different time.</small>}
    <small>This is a local scheduling simulation. The countdown follows the device clock.</small>
  </div>;
}
function EnvelopeTools({design,face,setFace,change}:{design:Envelope;face:Face;setFace:(f:Face)=>void;change:(patch:Partial<Envelope>)=>void}){
  const front=(patch:Partial<Envelope['front']>)=>change({front:{...design.front,...patch}});
  const back=(patch:Partial<Envelope['back']>)=>change({back:{...design.back,...patch}});
  return <>
    <div className="lt-actions" aria-label="Envelope sides">
      <button aria-pressed={face==='front'} onClick={()=>setFace('front')}>Front</button>
      <button aria-pressed={face==='back'} onClick={()=>setFace('back')}>Back</button>
    </div>
    <div className="lt-field-pair">
      <label>Envelope color<input type="color" value={design.color} onChange={e=>change({color:e.target.value})}/></label>
      <label>Material<select value={design.material} onChange={e=>change({material:e.target.value as Envelope['material']})}>
        <option value="cotton">Cotton paper</option><option value="linen">Woven linen</option><option value="kraft">Kraft paper</option>
      </select></label>
    </div>
    {face==='front'?<>
      <label>Recipient<input value={design.front.to} maxLength={70} onChange={e=>front({to:e.target.value})}/></label>
      <label>Sender<input value={design.front.from} maxLength={70} onChange={e=>front({from:e.target.value})}/></label>
      <label>Front inscription<textarea rows={2} maxLength={180} value={design.front.note} onChange={e=>front({note:e.target.value})}/></label>
      <label>Stamp wording<input value={design.front.stamp} maxLength={24} onChange={e=>front({stamp:e.target.value})}/></label>
      <label className="lt-check"><input type="checkbox" checked={design.front.border} onChange={e=>front({border:e.target.checked})}/> Decorative border</label>
    </>:<>
      <label>Flap shape<select value={design.flap} onChange={e=>change({flap:e.target.value as Envelope['flap']})}>
        <option value="pointed">Pointed</option><option value="wallet">Wallet</option><option value="curved">Curved</option></select></label>
      <label>Back inscription<input value={design.back.inscription} maxLength={160} onChange={e=>back({inscription:e.target.value})}/></label>
      <div className="lt-field-pair"><label>Wax palette<select value={Object.values(waxColors).includes(design.back.wax)?design.back.wax:'custom'}
        onChange={e=>{if(e.target.value!=='custom')back({wax:e.target.value});else back({wax:'#8b5263'});}}>
        {Object.entries(waxColors).map(([name,color])=><option key={name} value={color}>{name}</option>)}<option value="custom">Custom</option></select></label>
        <label>Wax color<input type="color" value={design.back.wax} onChange={e=>back({wax:e.target.value})}/></label></div>
      <label>Seal emblem<select value={design.back.emblem} onChange={e=>back({emblem:e.target.value as Envelope['back']['emblem']})}>
        <option value="initials">Initials</option><option value="heart">Heart</option><option value="flower">Flower</option><option value="star">Star</option></select></label>
      {design.back.emblem==='initials'&&<label>Seal initials<input value={design.back.initials} maxLength={4} onChange={e=>back({initials:e.target.value})}/></label>}
      <label className="lt-check"><input type="checkbox" checked={design.ribbon} onChange={e=>change({ribbon:e.target.checked})}/> Ribbon</label>
      <label className="lt-check"><input type="checkbox" checked={design.back.botanical} onChange={e=>back({botanical:e.target.checked})}/> Botanical sprig</label>
    </>}
  </>;
}
