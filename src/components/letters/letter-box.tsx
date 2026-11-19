'use client';
import { useMemo, useState } from 'react';
import { defaultEnvelope, kinds, stateLabel, type Collection, type Envelope, type Kind, type LetterSummary, type Preferences } from '@/lib/letters';
import { type Shelf } from '@/lib/letter-storage';
import { EnvelopeThumb } from './letter-objects';

type Filter = 'all'|'when'|'tomorrow'|'draft'|'favorite'|'archived';
const filters:Record<Filter,string>={'all':'All letters','when':'Open When','tomorrow':'Letters to Tomorrow',
  draft:'Drafts',favorite:'Favorites',archived:'Archived'};
const art:Envelope[]=[
  {...defaultEnvelope,color:'#be8484',front:{...defaultEnvelope.front,to:'Always, yours.',stamp:'DT'}},
  {...defaultEnvelope,color:'#81927d',material:'linen',front:{...defaultEnvelope.front,to:'An ordinary day',border:true,stamp:'WITH LOVE'}},
  {...defaultEnvelope,color:'#ebd9b7',material:'kraft',front:{...defaultEnvelope.front,to:'For tomorrow',from:'Someone who loves you',stamp:'DEAR TOMORROW'}},
];

export function LetterBox({shelf,loading,busy,write,pick,organize,example,importFile,manage,occasion,preferences,exportGroup}:{
  shelf:Shelf|null;loading:boolean;busy:boolean;write:(kind?:Kind)=>void;pick:(item:LetterSummary)=>void;organize:(item:LetterSummary)=>void;example:()=>void;
  importFile:()=>void;manage:()=>void;occasion:()=>void;preferences:(patch:Partial<Preferences>)=>void;exportGroup:(id:string)=>void;
}){
  const [open,setOpen]=useState(false),[filter,setFilter]=useState<Filter>('all'),[query,setQuery]=useState('');
  const [collection,setCollection]=useState(''),[sort,setSort]=useState('recent'),[limit,setLimit]=useState(15);
  const displayed=useMemo(()=>{
    const word=query.trim().toLocaleLowerCase();
    const matches=(row:LetterSummary)=>{
      if(row.archived!==(filter==='archived')||collection&&row.collectionId!==collection)return false;
      if((filter==='when'||filter==='tomorrow')&&row.kind!==filter)return false;
      if(filter==='draft'&&row.state!=='draft'||filter==='favorite'&&!row.favorite)return false;
      const names=[row.title,row.label,row.excerpt,row.envelope.front.to,row.envelope.front.from,shelf?.collections.find(c=>c.id===row.collectionId)?.name];
      return !word||names.some(name=>name?.toLocaleLowerCase().includes(word));
    };
    return (shelf?.summaries??[]).filter(matches).sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):
      sort==='oldest'?a.createdAt-b.createdAt:b.updatedAt-a.updatedAt);
  },[shelf,filter,query,collection,sort]);
  const now=Date.now();
  const layout=shelf?.preferences.layout??'envelopes';
  const boxLetters=(shelf?.summaries??[]).filter(item=>!item.archived).sort((a,b)=>a.updatedAt-b.updatedAt).slice(-3);
  const stack=boxLetters.length?boxLetters.map(item=>item.envelope):art;
  return <>
    <div className="lt-box-hero">
      <div className="lt-box-copy">
        <h1 tabIndex={-1} data-letters-heading>Letters.</h1>
        <p>For the words you want someone to hold on to.</p>
        <div className="lt-actions">
          <button className="lt-primary" disabled={!shelf||busy} onClick={()=>write()}>Write a letter <span aria-hidden="true">↗</span></button>
          <button className="lt-link" onClick={example}>Open an example</button>
        </div>
      </div>
      <button type="button" className="lt-box-photo" data-open={open} onClick={()=>setOpen(!open)}
        aria-expanded={open} aria-controls="lt-box-note">
        <span className="lt-box-art" aria-hidden="true">
          <span className="lt-box-floor"/>
          <span className="lt-box-inner"/>
          <span className="lt-box-stack">{stack.map((envelope,index)=><span key={index}><EnvelopeThumb design={envelope}/></span>)}</span>
          <span className="lt-box-rim"/>
          <span className="lt-box-lid">
            <span className="lt-box-lid-face"><i/><strong>Dear Tomorrow</strong><i/><b/></span>
            <span className="lt-box-lid-lining"/>
          </span>
        </span>
        <span className="lt-box-photo-label">{open?'Close the keepsake box':'Lift the lid'} <span aria-hidden="true">{open?'↘':'↗'}</span></span>
      </button>
    </div>
    <div className="lt-library" aria-labelledby="lt-box-title">
      <div className="lt-library-header">
        <div><h2 id="lt-box-title">Your Letter Box</h2>{shelf&&<p id="lt-box-note" hidden={!open}>{shelf.summaries.length===0?'Make room for your first letter.':
          shelf.summaries.length+(shelf.summaries.length===1?' letter rests here.':' letters rest here.')}</p>}</div>
        <div className="lt-actions">
          <button onClick={occasion} disabled={!shelf||busy}>Occasion stationery</button>
          <button onClick={importFile} disabled={!shelf||busy}>Import backup</button>
          <button onClick={manage} disabled={!shelf||busy}>Collections</button>
        </div>
      </div>
      {loading&&<p className="lt-empty" role="status">Opening your Letter Box…</p>}
      {shelf&&<>
        <nav className="lt-box-nav" aria-label="Letter box filters">
          {(Object.keys(filters) as Filter[]).map(value=><button key={value} aria-pressed={filter===value}
            onClick={()=>{setFilter(value);setLimit(15);}}>{filters[value]}</button>)}
        </nav>
        <div className="lt-box-filters">
          <label>Find a letter<input type="search" placeholder="Title, recipient, or words" value={query} onChange={e=>{setQuery(e.target.value);setLimit(15);}}/></label>
          <label>Collection<select value={collection} onChange={e=>{setCollection(e.target.value);setLimit(15);}}><option value="">All collections</option>
            {shelf.collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Sort by<select value={sort} onChange={e=>{setSort(e.target.value);setLimit(15);}}>
            <option value="recent">Recently edited</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label>
          <button onClick={()=>preferences({layout:layout==='envelopes'?'list':'envelopes'})}>{layout==='envelopes'?'Use list view':'Show envelopes'}</button>
        </div>
        {collection&&shelf.summaries.some(item=>item.collectionId===collection)&&
          <button className="lt-link" disabled={busy} onClick={()=>exportGroup(collection)}>Export this collection ↗</button>}
        {!displayed.length?<div className="lt-empty">
          <h3>{filter==='archived'?'No archived letters':query||collection?'No matching letters':filter==='when'?'For when they need you':
            filter==='tomorrow'?'For a day still to come':filter==='draft'?'No drafts waiting':filter==='favorite'?'No favorites yet':'The box is empty'}</h3>
          {filter==='when'&&!query&&!collection&&<button disabled={busy} onClick={()=>write('when')}>Write an Open When letter</button>}
          {filter==='tomorrow'&&!query&&!collection&&<button disabled={busy} onClick={()=>write('tomorrow')}>Write a Letter to Tomorrow</button>}
          {filter==='all'&&!query&&!collection&&<p>Sealed letters and unfinished drafts will be here when you come back.</p>}
        </div>:<ul className={layout==='envelopes'?'lt-letter-grid':'lt-letter-list'}>
          {displayed.slice(0,limit).map(item=><li key={item.id}>
            <button type="button" disabled={busy} onClick={()=>pick(item)}>
              {layout==='envelopes'&&<EnvelopeThumb design={item.envelope}/>}
              <span className="lt-letter-line">
                <strong>{item.title||'Untitled letter'}</strong>
                <small>{item.kind==='when'&&item.label?'Open when '+item.label:kinds[item.kind]} · {stateLabel(item,now)}</small>
              </span>
              <span className="lt-letter-arrow" aria-label={item.favorite?'Favorite':undefined}>{item.favorite?'♥':'↗'}</span>
            </button>
            <button className="lt-organize" aria-label={'Organize '+(item.title||'Untitled letter')} disabled={busy} onClick={()=>organize(item)}>···</button>
          </li>)}
        </ul>}
        {limit<displayed.length&&<button onClick={()=>setLimit(limit+15)}>Show more letters</button>}
      </>}
    </div>
  </>;
}

export function CollectionsEditor({initial,save,busy}:{initial:Collection[];save:(values:Collection[])=>void;busy:boolean}){
  const [values,setValues]=useState(initial),[error,setError]=useState('');
  return <form className="lt-fields" onSubmit={e=>{
    e.preventDefault();
    const next=values.map(c=>({...c,name:c.name.trim()}));
    if(next.some(c=>!c.name)){setError('Give each collection a name.');return;}
    if(new Set(next.map(c=>c.name.toLowerCase())).size!==next.length){setError('Use a different name for each collection.');return;}
    save(next);
  }}>
    {values.map((c,i)=><label key={c.id}>Collection {i+1}<input required maxLength={70} value={c.name} onChange={e=>{
      setValues(items=>items.map(group=>group.id===c.id?{...group,name:e.target.value}:group));setError('');
    }}/></label>)}
    <button type="button" disabled={values.length>=32||busy} onClick={()=>setValues([...values,{id:crypto.randomUUID(),name:''}])}>Add collection</button>
    {error&&<p role="alert">{error}</p>}
    <button className="lt-primary" type="submit" disabled={busy}>Save collections</button>
  </form>;
}
