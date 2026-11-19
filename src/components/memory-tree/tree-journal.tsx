'use client';

import { useMemo, useState } from 'react';
import { dayNumber, daysInMonth, displayDay, initialSettings, localDay, newTree, nextAnniversary,
  type Chapter, type Memory, type Tree } from '@/lib/memory-tree';

const sampleTitles=[
  'A hello in the rain','The long way home','Two cups, one umbrella','Grilled peaches','The first photograph',
  'Wednesday at the market','Cherries from the roadside','Keys to the little flat','The missed train',
  'Birthday by candlelight','The coat you lent me','When the ferry was late','New Year at the kitchen window',
  'Our first spring','A shelf for the cookbooks','Breakfast on the steps','The night they played our song',
  'Your grandmother’s recipe','Red leaves on the footpath','Friday on the sofa','The morning after the flood',
  'Our first mountain trail','Postcards from Porto','The book you read aloud','A picnic behind the museum',
  'Boxes in the hallway','The quiet beach','The dinner we nearly burned','Coffee in the snow',
  'Dancing while the kettle boiled','One more day by the sea','A promise we kept',
];
const sampleStories=[
  'We stood there long after the rain stopped. Neither of us wanted to be the first to say goodbye.',
  'We took the scenic route and arrived after dark. All I remember is how much we laughed.',
  'I wrote it down on the back of a receipt because I knew I would want to remember the small details.',
  'There was a moment when everything went quiet. I looked up and you were already looking at me.',
  'We tucked a little piece of that afternoon away to bring out on days when we needed it.',
  'It was an ordinary day, right up until it became the one we kept telling people about.',
];
export const seedling=newTree({...initialSettings},'unplanted',1581479201);
export const sampleTree:Tree={
  ...newTree({...initialSettings,name:'The Orchard Years',start:'2020-02-16',season:'spring'},'example',247379339),
  nextLeaf:sampleTitles.length,
  memories:sampleTitles.map((title,i)=>({id:'sample-'+i,slot:i,title,date:localDay(new Date(2020,1+Math.floor(i*.85),16+i%4,12)),
    time:i===0?'16:40':'',story:sampleStories[i%sampleStories.length],chapterId:'branch-'+(i%6),location:'',
    tags:i%7===0?['together']:[],photos:[],favorite:i%5===0,milestone:i%7===0,annual:i===0})),
};
sampleTree.memories[1].date=sampleTree.memories[0].date;

export function MemoryRows({memories,selected,choose}:{memories:Memory[];selected:string;choose:(m:Memory)=>void}){
  return <ul className="mt-rows">{memories.map(m=><li key={m.id}><button onClick={()=>choose(m)}
    aria-current={m.id===selected?'true':undefined}>
    <time dateTime={m.date}>{displayDay(m.date)}</time><span>{m.title}{m.milestone&&<small aria-label="Milestone"> ✦</small>}</span><span aria-hidden="true">↗</span>
  </button></li>)}</ul>;
}

export function Calendar({tree,today,month,day,selectMonth,selectDay}:{tree:Tree;today:string;month:string;day:string;selectMonth:(s:string)=>void;selectDay:(s:string)=>void}){
  const [year,number]=month.split('-').map(Number);
  const count=daysInMonth(year,number),start=new Date(year,number-1,1,12).getDay();
  const entries=useMemo(()=>{
    const days=new Map<string,Memory[]>();
    function add(key:string,m:Memory){const current=days.get(key)??[];if(!current.includes(m))days.set(key,[...current,m]);}
    for(const m of tree.memories){
      if(m.date.startsWith(month))add(m.date,m);
      if(m.annual&&year>=Number(m.date.slice(0,4))){
        const anniversary=nextAnniversary(m.date,year+'-01-01');
        if(anniversary.startsWith(month))add(anniversary,m);
      }
    }
    return days;
  },[tree.memories,year,month]);
  const colors=new Map(tree.chapters.map(c=>[c.id,c.color]));
  function shift(delta:number){selectMonth(localDay(new Date(year,number-1+delta,1,12)).slice(0,7));}
  return <section className="mt-calendar" aria-label="Memory calendar">
    <div className="mt-calendar-nav">
      <button aria-label="Previous month" onClick={()=>shift(-1)} disabled={month==='1900-01'}>←</button>
      <label>Month <select value={number} onChange={e=>selectMonth(year+'-'+e.target.value.padStart(2,'0'))}>
        {Array.from({length:12},(_,i)=><option value={i+1} key={i}>{new Date(2020,i,10,12).toLocaleDateString('en-US',{month:'long'})}</option>)}
      </select></label>
      <label>Year <select value={year} onChange={e=>selectMonth(e.target.value+month.slice(4))}>
        {Array.from({length:300},(_,i)=><option key={i}>{1900+i}</option>)}
      </select></label>
      <button aria-label="Next month" onClick={()=>shift(1)} disabled={month==='2199-12'}>→</button>
      <button onClick={()=>selectDay(today)}>Today</button>
    </div>
    <div className="mt-days">
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(name=><span key={name}>{name}</span>)}
      {Array.from({length:start},(_,i)=><div key={'pad'+i}/>)}
      {Array.from({length:count},(_,i)=>{
        const date=month+'-'+String(i+1).padStart(2,'0'),memories=entries.get(date)??[];
        return <button key={date} type="button" aria-pressed={date===day} aria-current={date===today?'date':undefined}
          aria-label={displayDay(date)+(memories.length?', '+memories.length+' '+(memories.length===1?'memory':'memories'):'')}
          onClick={()=>selectDay(date)}><span>{i+1}</span><span className="mt-day-marks" aria-hidden="true">
          {memories.slice(0,3).map(m=><i key={m.id} style={{color:colors.get(m.chapterId)??'#76565f'}}>{m.milestone?'✦':'●'}</i>)}
        </span></button>;
      })}
    </div>
  </section>;
}

const batch=18;
export function MemoryIndex({items,chapters,selected,view,choose,jump}:{items:Memory[];chapters:Chapter[];selected:string;view:'tree'|'timeline';choose:(m:Memory)=>void;jump:(m:Memory)=>void}){
  const [page,setPage]=useState(0);
  const last=Math.max(0,Math.ceil(items.length/batch)-1),index=Math.min(page,last);
  const visible=items.slice(index*batch,(index+1)*batch),groups=new Map<string,Memory[]>();
  for(const m of visible){const month=m.date.slice(0,7);const group=groups.get(month)??[];group.push(m);groups.set(month,group);}
  return <>
    {!visible.length&&<p>No memories found.</p>}
    {view==='tree'?<MemoryRows memories={visible} selected={selected} choose={choose}/>:
    Array.from(groups,([month,memories])=><details className="mt-period" key={month} open>
      <summary>{new Date(month+'-01T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</summary>
      {memories.map(m=><article key={m.id} className="mt-timeline-memory">
        <button className="mt-link" onClick={()=>choose(m)} aria-current={selected===m.id?'true':undefined}>{m.title} {m.milestone?'✦':''}</button>
        <time dateTime={m.date}>{displayDay(m.date)}</time>
        {m.chapterId&&<small>{chapters.find(c=>c.id===m.chapterId)?.name}</small>}
        {m.story&&<p>{m.story}</p>}
        {!!m.photos.length&&<Photos memory={m}/>}
        <button className="mt-link" onClick={()=>jump(m)}>Find this leaf ↗</button>
      </article>)}
    </details>)}
    {last>0&&<div className="mt-pager"><button disabled={index===0} onClick={()=>setPage(index-1)}>Previous</button>
      <span>{index+1} of {last+1}</span><button disabled={index===last} onClick={()=>setPage(index+1)}>Next</button></div>}
  </>;
}
export function Photos({memory}:{memory:Memory}){
  return <div className="mt-photos">{memory.photos.map(photo=><figure key={photo.id}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photo.data} alt={photo.name} loading="lazy" decoding="async"/>
  </figure>)}</div>;
}
export function RelationshipNotes({tree,today,ordered}:{tree:Tree;today:string;ordered:Memory[]}){
  const dates=ordered.filter(m=>m.annual).map(m=>({m,date:m.date>=today?m.date:nextAnniversary(m.date,today)})).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
  return <details className="mt-notes"><summary>Your story in dates</summary><dl>
    {tree.settings.start&&<><dt>Days since it began</dt><dd>{Math.max(0,dayNumber(today)-dayNumber(tree.settings.start)).toLocaleString()}</dd></>}
    <dt>Memories</dt><dd>{ordered.length}</dd><dt>Chapters</dt><dd>{tree.chapters.length}</dd>
    <dt>Milestones</dt><dd>{ordered.filter(m=>m.milestone).length}</dd>
    {!!ordered.length&&<><dt>First memory</dt><dd>{displayDay(ordered[0].date)}</dd><dt>Latest memory</dt><dd>{displayDay(ordered[ordered.length-1].date)}</dd></>}
    {dates.map(({m,date})=><div key={m.id}><dt>{m.title}</dt><dd>{displayDay(date)}</dd></div>)}
  </dl></details>;
}
