'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { seasons, species, MAX_PHOTOS, type Chapter, type MemoryInput, type Photo, type Settings } from '@/lib/memory-tree';
import { preparePhoto } from '@/lib/memory-tree-storage';

export function GardenDialog({title,children,close,busy=false}:{title:string;children:ReactNode;close:()=>void;busy?:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null),label=useId();
  useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
  return <dialog className="mt-dialog" ref={dialog} aria-labelledby={label}
    onCancel={e=>{e.preventDefault();if(!busy)close();}}>
    <header><h2 id={label}>{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={close}>×</button></header>
    {children}
  </dialog>;
}
const speciesLabels={cherry:'Flowering cherry',oak:'English oak',willow:'Weeping willow'};
export function SettingsForm({initial,plant,busy,save}:{initial:Settings;plant:boolean;busy:boolean;save:(s:Settings)=>void}){
  const [settings,setSettings]=useState(initial);
  function field<K extends keyof Settings>(key:K,value:Settings[K]){setSettings(s=>({...s,[key]:value}));}
  return <form className="mt-form" onSubmit={e=>{e.preventDefault();save({...settings,name:settings.name.trim()});}}>
    <label>Tree name<input placeholder="Our Memory Tree" maxLength={80} value={settings.name} onChange={e=>field('name',e.target.value)}/></label>
    <div className="mt-fields">
      <label>Your name<input autoComplete="given-name" maxLength={60} value={settings.you} onChange={e=>field('you',e.target.value)}/></label>
      <label>Partner’s name<input maxLength={60} value={settings.partner} onChange={e=>field('partner',e.target.value)}/></label>
      <label>When your story began<input type="date" min="1900-01-01" max="2199-12-31" value={settings.start} onChange={e=>field('start',e.target.value)}/></label>
      <label>Tree species<select value={settings.species} onChange={e=>field('species',e.target.value as Settings['species'])}>{species.map(s=><option key={s} value={s}>{speciesLabels[s]}</option>)}</select></label>
    </div>
    {!plant&&<div className="mt-fields">
      <label>Season<select value={settings.season} onChange={e=>field('season',e.target.value as Settings['season'])}>{seasons.map(s=><option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select></label>
      <label className="mt-check"><input type="checkbox" checked={settings.south} onChange={e=>field('south',e.target.checked)}/> Southern Hemisphere</label>
    </div>}
    <button type="submit" className="mt-primary" disabled={busy}>{busy?'Saving…':plant?'Plant this tree':'Save appearance'}</button>
  </form>;
}

export const blankMemory=(date:string):MemoryInput=>({title:'',date,time:'',story:'',location:'',chapterId:'',tags:[],favorite:false,milestone:false,annual:false,photos:[]});
export function MemoryForm({initial,chapters,busy,save}:{initial:MemoryInput;chapters:Chapter[];busy:boolean;save:(m:MemoryInput)=>void}){
  const [memory,setMemory]=useState(initial),[tags,setTags]=useState(initial.tags.join(', ')),[loading,setLoading]=useState(false),[error,setError]=useState('');
  function field<K extends keyof MemoryInput>(key:K,value:MemoryInput[K]){setMemory(m=>({...m,[key]:value}));}
  async function includePhotos(files:File[]){
    setError('');setLoading(true);
    try {
      const room=MAX_PHOTOS-memory.photos.length;
      if(files.length>room)throw new Error('Each memory can hold up to four photographs.');
      const photos:Photo[]=[];
      for(const file of files)photos.push(await preparePhoto(file));
      setMemory(m=>({...m,photos:[...m.photos,...photos]}));
    }catch(error){setError(error instanceof Error?error.message:'Unable to open the photograph.');}
    finally{setLoading(false);}
  }
  return <form className="mt-form" onSubmit={e=>{e.preventDefault();
    if(!memory.title.trim()){setError('Give this memory a title.');return;}
    save({...memory,title:memory.title.trim(),tags:[...new Set(tags.split(',').map(t=>t.trim().slice(0,36)).filter(Boolean))].slice(0,12)});
  }}>
    <label>Title<input autoFocus required maxLength={140} value={memory.title} onChange={e=>field('title',e.target.value)}/></label>
    <label>Date<input required type="date" min="1900-01-01" max="2199-12-31" value={memory.date} onChange={e=>field('date',e.target.value)}/></label>
    <label>Story<textarea rows={5} maxLength={16000} value={memory.story} onChange={e=>field('story',e.target.value)}/></label>
    <label>Chapter<select value={memory.chapterId} onChange={e=>field('chapterId',e.target.value)}><option value="">Unassigned</option>{chapters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>Photographs<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={loading||busy||memory.photos.length>=MAX_PHOTOS}
      onChange={e=>{const files=Array.from(e.currentTarget.files??[]);e.currentTarget.value='';if(files.length)void includePhotos(files);}}/></label>
    {loading&&<p role="status">Preparing your photographs…</p>}
    {memory.photos.length>0&&<div className="mt-photos">{memory.photos.map(p=><figure key={p.id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.data} alt={p.name}/><button type="button" disabled={loading||busy} onClick={()=>field('photos',memory.photos.filter(photo=>photo!==p))}>Remove</button>
    </figure>)}</div>}
    <details open={initial.favorite||initial.milestone||initial.annual||Boolean(initial.location||initial.time||initial.tags.length)||undefined}>
      <summary>More details</summary><div className="mt-fields">
        <label>Time<input type="time" value={memory.time} onChange={e=>field('time',e.target.value)}/></label>
        <label>Location<input maxLength={140} value={memory.location} onChange={e=>field('location',e.target.value)}/></label>
        <label>Tags <small>Separated by commas</small><input maxLength={444} value={tags} onChange={e=>setTags(e.target.value)}/></label>
        {(['favorite','milestone','annual'] as const).map((key,i)=><label key={key} className="mt-check"><input type="checkbox" checked={memory[key]}
          onChange={e=>field(key,e.target.checked)}/>{['Favorite','Special milestone','Repeat annually'][i]}</label>)}
      </div>
    </details>
    {error&&<p role="alert">{error}</p>}
    <button className="mt-primary" disabled={busy||loading} type="submit">{busy?'Saving…':'Save memory'}</button>
  </form>;
}

export function ChaptersForm({initial,next,busy,save}:{initial:Chapter[];next:number;busy:boolean;save:(chapters:Chapter[],next:number)=>void}){
  const [chapters,setChapters]=useState(initial),[slot,setSlot]=useState(next);
  function change(index:number,update:Partial<Chapter>){setChapters(items=>items.map((c,i)=>i===index?{...c,...update}:c));}
  function move(index:number,by:number){const changed=[...chapters];const [chapter]=changed.splice(index,1);changed.splice(index+by,0,chapter);setChapters(changed);}
  return <form className="mt-form" onSubmit={e=>{e.preventDefault();save(chapters.map(c=>({...c,name:c.name.trim()})),slot);}}>
    <p>Removing a chapter moves its memories to Unassigned.</p>
    {chapters.map((c,i)=><div className="mt-chapter-row" key={c.id}>
      <input aria-label={'Chapter '+(i+1)+' name'} required pattern=".*\S.*" maxLength={70} value={c.name} onChange={e=>change(i,{name:e.target.value})}/>
      <input aria-label={'Color for '+c.name} type="color" value={c.color} onChange={e=>change(i,{color:e.target.value})}/>
      <button type="button" aria-label={'Move '+c.name+' up'} disabled={!i} onClick={()=>move(i,-1)}>↑</button>
      <button type="button" aria-label={'Move '+c.name+' down'} disabled={i===chapters.length-1} onClick={()=>move(i,1)}>↓</button>
      <button type="button" aria-label={'Remove '+c.name} onClick={()=>setChapters(chapters.filter(item=>item!==c))}>×</button>
    </div>)}
    <button type="button" disabled={chapters.length>=24||slot>=1_000_000} onClick={()=>{setChapters([...chapters,{id:crypto.randomUUID(),slot,name:'New chapter',color:'#806756'}]);setSlot(slot+1);}}>Add a chapter</button>
    <button type="submit" className="mt-primary" disabled={busy}>Save chapters</button>
  </form>;
}
