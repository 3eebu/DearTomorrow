'use client';
import { useState } from 'react';
import { StationeryConfirm } from '@/components/stationery-dialog';
import { uid, type BookPage, type MemoryBookDocument } from '@/lib/memory-books';
import s from './studio.module.css';
export function StudioBookSettings({book,page,commit,changePage,addPage,go}:{book:MemoryBookDocument;page:BookPage;commit:(b:MemoryBookDocument,key?:string)=>void;changePage:(p:BookPage,key?:string)=>void;addPage:(copy?:boolean)=>void;go:(id:string)=>void}) {
  const index=book.pages.indexOf(page);
  const [removal,setRemoval]=useState<{kind:'page'}|{kind:'chapter';id:string}|null>(null);
  function confirmRemoval() {
    if (removal?.kind === 'page' && book.pages.length > 1) {
      commit({...book,pages:book.pages.filter(item=>item.id!==page.id)});
      go(book.pages[index===0?1:index-1].id);
    } else if (removal?.kind === 'chapter') {
      const {id}=removal;
      commit({...book,chapters:book.chapters.filter(chapter=>chapter.id!==id),
        pages:book.pages.map(item=>item.chapterId===id?{...item,chapterId:''}:item)});
    }
    setRemoval(null);
  }
  return <div className={s.inspectorContent}>
    <details open><summary>Pages & chapters</summary><div className={s.actionRow}><button onClick={()=>addPage()}>＋ Blank page</button><button onClick={()=>addPage(true)}>Duplicate page</button><button disabled={book.pages.length===1} onClick={()=>setRemoval({kind:'page'})}>Delete page…</button>{[-1,1].map(delta=><button key={delta} disabled={index+delta<0||index+delta>=book.pages.length} onClick={()=>{const pages=[...book.pages];pages.splice(index,1);pages.splice(index+delta,0,page);commit({...book,pages});}}>{delta<0?'Move earlier':'Move later'}</button>)}</div><label>This page belongs to<select value={page.chapterId} onChange={ev=>changePage({...page,chapterId:ev.target.value})}><option value="">No chapter</option>{book.chapters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>{book.chapters.map((c,i)=><div className={s.chapter} key={c.id}><input aria-label={`Chapter ${i+1} title`} maxLength={120} value={c.title} onChange={ev=>commit({...book,chapters:book.chapters.map(v=>v.id===c.id?{...v,title:ev.target.value}:v)},c.id)}/><button aria-label={`Move chapter ${i+1} earlier`} disabled={!i} onClick={()=>{const chapters=[...book.chapters];chapters.splice(i,1);chapters.splice(i-1,0,c);commit({...book,chapters});}}>↑</button><button aria-label={`Remove chapter ${i+1}`} onClick={()=>setRemoval({kind:'chapter',id:c.id})}>×</button></div>)}<button disabled={book.chapters.length>=100} onClick={()=>commit({...book,chapters:[...book.chapters,{id:uid(),title:'A new chapter'}]})}>＋ Add chapter</button><p className={s.help}>Chapters label pages. The page strip follows the actual reading order.</p></details>
    <details><summary>Book & cover</summary><label>Subtitle<input maxLength={200} value={book.subtitle} onChange={ev=>commit({...book,subtitle:ev.target.value},'subtitle')}/></label><label>Inside-cover dedication<textarea maxLength={2000} value={book.dedication} onChange={ev=>commit({...book,dedication:ev.target.value},'dedication')}/></label><label>Cover colour<input type="color" value={book.cover.color} onChange={ev=>commit({...book,cover:{...book.cover,color:ev.target.value}},'cover')}/></label><label>Cover material<select value={book.cover.material} onChange={ev=>commit({...book,cover:{...book.cover,material:ev.target.value as MemoryBookDocument['cover']['material']}})}><option value="linen">Woven linen</option><option value="leather">Leather inspired</option><option value="smooth">Smooth hardcover</option></select></label><div className={s.fields}>{(['widthMm','heightMm'] as const).map(key=><label key={key}>{key==='widthMm'?'Width':'Height'} (mm)<input type="number" min={100} max={320} value={book[key]} onChange={ev=>{const n=ev.target.valueAsNumber;if(n>=100&&n<=320)commit({...book,[key]:n},key);}}/></label>)}</div><p className={s.help}>Dimensions describe one page. Relative positions are retained when proportions change. Review text wrapping afterward.</p></details>
    <details><summary>Keyboard companions</summary><p className={s.help}>⌘ / Ctrl Z: Undo · ⇧ Z or Ctrl Y: Redo<br/>⌘ / Ctrl C, V, D: Copy, paste, duplicate objects<br/>⌘ / Ctrl A: Select page objects<br/>⌘ / Ctrl G: Group · ⇧ G: Ungroup<br/>Arrows: nudge · Shift: larger nudge<br/>Shift-click: add to selection<br/>Shift-drag a handle: keep proportions<br/>Alt-drag: temporarily ignore snapping<br/>Escape: cancel a drag · Delete: remove unlocked objects</p></details>
    {removal && <StationeryConfirm title={removal.kind==='page'?'Delete this page?':'Remove this chapter label?'}
      message={removal.kind==='page'?'The objects on this page will go with it. You can undo this action.':'All its pages will be kept.'}
      action={removal.kind==='page'?'Delete page':'Remove chapter'} onClose={()=>setRemoval(null)} onConfirm={confirmRemoval}/>}
  </div>;
}
