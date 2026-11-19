'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { chronological, displayDay, findMemories, localDay, newTree, nextAnniversary, putMemory, removeChapter, validDay,
  type Chapter, type Grove, type Memory, type MemoryInput, type Settings, type Tree, type View } from '@/lib/memory-tree';
import { downloadTree, importTree, loadGarden, saveGarden, type SavedGrove } from '@/lib/memory-tree-storage';
import { blankMemory, ChaptersForm, GardenDialog, MemoryForm, SettingsForm } from './tree-dialogs';
import { Calendar, MemoryIndex, MemoryRows, Photos, RelationshipNotes, sampleTree, seedling } from './tree-journal';
import { TreeStage, type Focus } from './tree-stage';
import './memory-tree.css';

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'The change could not be saved.';
type DialogMode='plant'|'appearance'|'chapters'|'memory'|'delete';
type Commit=(tree:Tree)=>Promise<boolean>;
export default function MemoryTreeWorkspace(){
  const [saved,setSaved]=useState<SavedGrove|null>(null),[demo,setDemo]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[draft,setDraft]=useState<Tree|null>(null),[busy,setBusy]=useState(false);
  const [startupFocus,setStartupFocus]=useState<Focus|null>(null);
  const pending=useRef(false),snapshot=useRef<SavedGrove|null>(null),fileInput=useRef<HTMLInputElement>(null);
  function show(records:SavedGrove){snapshot.current=records;setSaved(records);}
  useEffect(()=>{
    let current=true;
    loadGarden().then(records=>{if(current)show(records);},failure=>{if(current)setError(errorMessage(failure));})
      .finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[]);
  const active=saved?.grove.trees.find(t=>t.id===saved.grove.activeId);
  async function transact(change:(grove:Grove)=>Grove,backup?:Tree){
    if(pending.current||!snapshot.current)return false;
    pending.current=true;setBusy(true);setError('');
    const records=snapshot.current;
    try{
      const proposed=change(records.grove);
      const committed=await saveGarden(proposed,records.revision);
      show({revision:committed.revision,grove:proposed});setDraft(null);return true;
    }catch(failure){setError(errorMessage(failure));if(backup)setDraft(backup);return false;}
    finally{pending.current=false;setBusy(false);}
  }
  const commit:Commit=tree=>transact(grove=>{
    const exists=grove.trees.some(item=>item.id===tree.id);
    if(!exists&&grove.trees.length>=8)throw new Error('This browser can keep up to eight trees.');
    return {...grove,activeId:tree.id,trees:exists?grove.trees.map(t=>t.id===tree.id?tree:t):[...grove.trees,tree]};
  },tree);
  async function restore(file:File){
    if(!snapshot.current||pending.current)return;
    setError('');
    try{
      const backup=await importTree(file);
      if(await commit({...backup,id:crypto.randomUUID()})){setDemo(false);setStartupFocus(null);}
    }catch(failure){setError(errorMessage(failure));}
  }
  const tree=demo?sampleTree:active??seedling;
  return <section id="memory-tree" className="mt-workspace" aria-labelledby="mt-tree-title">
    <div className="mt-origin">
      {tree.settings.name&&<p className="mt-kicker">Memory Tree</p>}
      <h1 id="mt-tree-title">{tree.settings.name||'Our Memory Tree'}</h1>
      <p>{tree.settings.start?<><time dateTime={tree.settings.start}>{displayDay(tree.settings.start)}</time><span aria-hidden="true"> · </span></>:null}
        {demo?'A fictional example':active?tree.memories.length+' '+(tree.memories.length===1?'memory':'memories'):'A place for the moments you keep.'}</p>
    </div>
    {!demo&&saved&&<input ref={fileInput} hidden type="file" accept=".json,application/json" aria-label="Import Memory Tree backup"
      onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void restore(file);}}/>}
    {loading&&!demo?<p className="mt-status" role="status">Opening your Memory Tree…</p>:
      <TreeExperience key={tree.id} tree={tree} demo={demo} planted={!!active&&!demo} editable={!demo&&!!saved} busy={busy}
        error={error} draft={draft} commit={commit} initialFocus={startupFocus} onError={setError}
        exampleAction={<button className="mt-example-link" onClick={()=>{setDemo(!demo);setStartupFocus(null);}}>{demo?'Back to my tree':'Explore the example'}</button>}
        treeActions={!demo&&saved&&<>
          <button disabled={busy} onClick={()=>fileInput.current?.click()}>Import backup</button>
          {saved.grove.trees.length>1&&<label>Saved tree<select aria-label="Choose a saved tree" disabled={busy} value={saved.grove.activeId}
            onChange={e=>{const activeId=e.target.value;setStartupFocus(null);void transact(grove=>({...grove,activeId}));}}>
            {saved.grove.trees.map(t=><option value={t.id} key={t.id}>{t.settings.name||'Our Memory Tree'}</option>)}
          </select></label>}
        </>}
        onPlant={async settings=>{const planted=newTree(settings);if(await commit(planted)){setStartupFocus({id:'seed',grow:true});return true;}return false;}}/>}
  </section>;
}

function TreeExperience({tree,demo,planted,editable,busy,error,draft,commit,initialFocus,onError,onPlant,exampleAction,treeActions}:{
  tree:Tree;demo:boolean;planted:boolean;editable:boolean;busy:boolean;error:string;draft:Tree|null;commit:Commit;
  initialFocus:Focus|null;onError:(s:string)=>void;onPlant:(s:Settings)=>Promise<boolean>;
  exampleAction:ReactNode;treeActions:ReactNode;
}){
  const [today]=useState(localDay);
  const ordered=useMemo(()=>chronological(tree.memories),[tree.memories]);
  const [view,setView]=useState<View>(tree.settings.view);
  const stageAnchor=useRef<HTMLDivElement>(null),scrollToStage=useRef(false);
  useEffect(()=>{
    if(view==='tree'&&scrollToStage.current){
      scrollToStage.current=false;stageAnchor.current?.scrollIntoView({block:'start'});
    }
  },[view]);
  const [selected,setSelected]=useState(ordered[0]?.id??''),[day,setDay]=useState(ordered[0]?.date??today);
  const [month,setMonth]=useState((ordered[0]?.date??today).slice(0,7));
  const [focus,setFocus]=useState<Focus|null>(initialFocus);
  const [mode,setMode]=useState<DialogMode|null>(null),[editing,setEditing]=useState<{id?:string;input:MemoryInput}|null>(null);
  const [query,setQuery]=useState(''),[chapter,setChapter]=useState(''),[favorites,setFavorites]=useState(false),[milestones,setMilestones]=useState(false);
  const [demoPaused,setDemoPaused]=useState(false);
  const match=useMemo(()=>findMemories(tree,query,chapter,favorites,milestones),[tree,query,chapter,favorites,milestones]);
  const selection=ordered.find(m=>m.id===selected);
  const selectionIndex=selection?ordered.indexOf(selection):-1;
  const inDay=(date:string)=>ordered.filter(m=>m.date===date || (m.annual&&date>=m.date&&
    nextAnniversary(m.date,date.slice(0,4)+'-01-01')===date));
  function selectDate(date:string){
    setDay(date);setMonth(date.slice(0,7));
    const memory=inDay(date).find(m=>m.id===selected)??inDay(date)[0];
    setSelected(memory?.id??'');setFocus(memory?{id:memory.id}:null);
  }
  function choose(m:Memory,bringToTree=false,displayDate=m.date){
    setSelected(m.id);setDay(displayDate);setMonth(displayDate.slice(0,7));setFocus({id:m.id});
    if(bringToTree){
      if(view==='tree')stageAnchor.current?.scrollIntoView({block:'start'});
      else {scrollToStage.current=true;changeView('tree');}
    }
  }
  function changeView(v:View){
    if(view===v)return;
    setView(v);
    if(editable&&planted&&!busy)void commit({...tree,settings:{...tree.settings,view:v}});
  }
  function open(m?:Memory,duplicate=false){
    if(!planted){setMode('plant');return;}
    setEditing({id:duplicate?undefined:m?.id,input:m?{...m,title:duplicate?(m.title+' (copy)').slice(0,140):m.title}:blankMemory(validDay(day)?day:today)});
    setMode('memory');onError('');
  }
  async function saveMemory(input:MemoryInput){
    try{
      const next=putMemory({...tree,settings:{...tree.settings,view:editing?.id?view:'tree'}},input,editing?.id);
      const saved=editing?.id?next.memories.find(m=>m.id===editing.id)!:next.memories[next.memories.length-1];
      if(await commit(next)){
        choose(saved);
        if(!editing?.id){
          setFocus({id:saved.id,grow:true});
          setView('tree');
        }
        setMode(null);
      }
    }catch(failure){onError(errorMessage(failure));}
  }
  async function saveChapters(chapters:Chapter[],nextBranch:number){
    const changed=tree.chapters.reduce((t,c)=>chapters.some(item=>item.id===c.id)?t:removeChapter(t,c.id),tree);
    if(await commit({...changed,chapters,nextBranch})){if(chapter&&!chapters.some(c=>c.id===chapter))setChapter('');setMode(null);}
  }
  async function remove(){
    if(!selection)return;
    if(await commit({...tree,memories:tree.memories.filter(m=>m.id!==selection.id)})){
      const next=ordered[selectionIndex+1]??ordered[selectionIndex-1];
      if(next)choose(next);else {setSelected('');setFocus({id:'seed'});}
      setMode(null);
    }
  }
  const screenTree=demo?{...tree,settings:{...tree.settings,paused:demoPaused}}:tree;
  const calendarMemories=view==='calendar'?inDay(day):[];
  const displayError=error&&<div role="alert" className="mt-error">{error}
    {draft&&<button type="button" onClick={()=>downloadTree(draft,(draft.settings.name||'Memory Tree')+' draft')}>Export draft</button>}</div>;
  return <>
    <div className="mt-toolbar">
      <div className="mt-toolbar-aside">{exampleAction}</div>
      <nav aria-label="Memory Tree views">{(['tree','timeline','calendar'] as const).map(v=><button aria-pressed={view===v} key={v}
        disabled={busy} onClick={()=>changeView(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</nav>
      <div className="mt-toolbar-actions">
        {editable&&<details className="mt-menu mt-tree-menu">
          <summary>Tree options</summary>
          <div className="mt-menu-actions">
            {planted&&<><button disabled={busy} onClick={e=>{e.currentTarget.closest('details')!.open=false;setMode('appearance');}}>Appearance</button>
              <button disabled={busy} onClick={e=>{e.currentTarget.closest('details')!.open=false;setMode('chapters');}}>Chapters</button>
              <button onClick={()=>downloadTree(tree,tree.settings.name||'Memory Tree')}>Export tree</button></>}
            {treeActions}
          </div>
        </details>}
        {editable&&<button className="mt-primary" disabled={busy} onClick={()=>open()}>{planted?'Add a memory':'Plant a tree'}</button>}
      </div>
    </div>
    {!mode&&displayError}
    <div id="mt-tree-stage" ref={stageAnchor} hidden={view!=='tree'}>
      <TreeStage tree={screenTree} today={today} focus={focus} selected={selected}
        onChoose={id=>{const m=ordered.find(m=>m.id===id);if(m)choose(m);}} onBranch={id=>setChapter(id)}
        controls={demo||planted} onPause={()=>{if(demo)setDemoPaused(!demoPaused);
          else if(!busy)void commit({...tree,settings:{...tree.settings,paused:!tree.settings.paused}});}}/>
      {!tree.memories.length&&<div className="mt-seed-note">
        <p>{planted?'Your first memory will grow the first leaf.':'Every tree begins with a seed.'}</p>
        {planted&&<button className="mt-link" onClick={()=>setFocus({id:'seed',grow:true})}>Replay planting</button>}
      </div>}
    </div>
    <div className="mt-journal">
      <section className="mt-index" aria-label={view==='calendar'?'Calendar and day memories':'Browse memories'}>
        {view==='calendar'?<>
          <Calendar tree={tree} today={today} day={day} month={month} selectDay={selectDate} selectMonth={m=>selectDate(m+'-01')}/>
          <div className="mt-section-title"><h2>{displayDay(day)}</h2>
            {planted&&<button className="mt-link" onClick={()=>open()}>Add on this date</button>}</div>
          {calendarMemories.length?<MemoryRows memories={calendarMemories} selected={selected} choose={m=>choose(m,false,day)}/>:<p>No memories on this date.</p>}
        </>:<>
          <h2>{view==='timeline'?'Your timeline':'Find a memory'}</h2>
          {tree.memories.length>0?<><div className="mt-filters">
            <label>Search<input type="search" value={query} placeholder="Title, story or tag" onChange={e=>setQuery(e.target.value)}/></label>
            <label>Chapter<select value={chapter} onChange={e=>{setChapter(e.target.value);if(view==='tree'&&e.target.value)setFocus({id:e.target.value,chapter:true});}}><option value="">All chapters</option>
              {tree.chapters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}<option value="unassigned">Unassigned</option></select></label>
            <label className="mt-check"><input type="checkbox" checked={favorites} onChange={e=>setFavorites(e.target.checked)}/>Favorites</label>
            <label className="mt-check"><input type="checkbox" checked={milestones} onChange={e=>setMilestones(e.target.checked)}/>Milestones</label>
          </div><MemoryIndex key={[view,query,chapter,favorites,milestones].join('|')} items={match} chapters={tree.chapters}
            selected={selected} view={view} choose={m=>choose(m)} jump={m=>choose(m,true)}/></>:<p>Saved memories will appear here.</p>}
        </>}
      </section>
      {selection&&<article className="mt-keepsake" aria-labelledby="mt-selected-title">
        <div className="mt-keepsake-meta"><time dateTime={selection.date+(selection.time?'T'+selection.time:'')}>{displayDay(selection.date)}</time>
          {selection.favorite&&<span aria-label="Favorite">♥</span>}{selection.milestone&&<span>✦ Milestone</span>}</div>
        <h2 id="mt-selected-title" tabIndex={-1}>{selection.title}</h2>
        <p className="mt-chapter-name">{[tree.chapters.find(c=>c.id===selection.chapterId)?.name,selection.time,selection.location].filter(Boolean).join(' · ')}</p>
        {selection.story&&<p className="mt-story">{selection.story}</p>}
        {!!selection.photos.length&&<Photos memory={selection}/>}
        {!!selection.tags.length&&<p className="mt-tags">{selection.tags.join(' · ')}</p>}
        <div className="mt-detail-actions">
          <button disabled={selectionIndex<=0} onClick={()=>choose(ordered[selectionIndex-1])}>← Earlier</button>
          <button disabled={selectionIndex===ordered.length-1} onClick={()=>choose(ordered[selectionIndex+1])}>Later →</button>
          <button className="mt-link" onClick={()=>choose(selection,true)}>Find this leaf ↗</button>
        </div>
        {planted&&<div className="mt-detail-actions">
          <button disabled={busy} onClick={()=>open(selection)}>Edit</button>
          <button disabled={busy} onClick={()=>open(selection,true)}>Duplicate</button>
          <button onClick={()=>downloadTree({version:1,memory:selection},selection.title)}>Export memory</button>
          <button disabled={busy} onClick={()=>setMode('delete')}>Delete</button>
        </div>}
      </article>}
    </div>
    {(demo||planted)&&<RelationshipNotes tree={tree} today={today} ordered={ordered}/>}
    {mode&&<GardenDialog title={mode==='plant'?'Plant your Memory Tree':mode==='appearance'?'Tree appearance':mode==='chapters'?'Relationship chapters':
      mode==='delete'?'Delete this memory?':editing?.id?'Edit memory':'Add a memory'} close={()=>setMode(null)} busy={busy}>
      {displayError}
      {mode==='plant'&&<SettingsForm initial={tree.settings} plant busy={busy} save={settings=>void onPlant(settings)}/>}
      {mode==='appearance'&&<SettingsForm initial={{...tree.settings,view}} plant={false} busy={busy} save={async settings=>{
        if(await commit({...tree,settings}))setMode(null);
      }}/>}
      {mode==='chapters'&&<ChaptersForm initial={tree.chapters} next={tree.nextBranch} busy={busy} save={(c,n)=>void saveChapters(c,n)}/>}
      {mode==='memory'&&editing&&<MemoryForm initial={editing.input} chapters={tree.chapters} busy={busy} save={m=>void saveMemory(m)}/>}
      {mode==='delete'&&<><p>“{selection?.title}” and its photographs will be removed from this tree.</p>
        <button disabled={busy} className="mt-primary" onClick={()=>void remove()}>Delete memory</button></>}
    </GardenDialog>}
  </>;
}
