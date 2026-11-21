'use client';
import Link from 'next/link';
import {useEffect,useState,type ReactNode} from 'react';
import type {CloudScope} from '@/lib/accounts/documents';

export function CloudBoundary({scope,children,navigation=true}:{scope?:CloudScope;children:ReactNode;navigation?:boolean}) {
  const [state,setState]=useState<'ready'|'checking'|'changed'|'offline'>('ready');
  useEffect(()=>{
    if(!scope)return;
    let active=true;
    let current=0;
    async function check() {
      const ticket=++current;
      setState('checking');
      try {
        const response=await fetch('/api/account-session',{cache:'no-store'});
        if(!response.ok)throw new Error('Session check failed.');
        const result=await response.json();
        if(active&&ticket===current)setState(result.id===scope?.owner?'ready':'changed');
      } catch {if(active&&ticket===current)setState('offline');}
    }
    function visibility() {if(document.hidden)setState('checking');else void check();}
    function restore(event:PageTransitionEvent) {if(event.persisted)void check();}
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pageshow',restore);
    window.addEventListener('focus',check);
    window.addEventListener('online',check);
    return ()=>{active=false;document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pageshow',restore);window.removeEventListener('focus',check);window.removeEventListener('online',check);};
  },[scope]);
  if(!scope)return children;
  if(state==='changed')return <p className="dt-space-note" role="alert">This tab belongs to a previous session. <Link href="/my-space">Reopen My Space</Link>.</p>;
  return <>
    {navigation&&<div className="dt-space-note"><Link href="/my-space">← My Space</Link><span>Cloud library</span><Link href={scope.path}>On this device</Link></div>}
    {state!=='ready'&&<p className="dt-space-note" role="status">{state==='offline'?'Offline. Reconnect to confirm your session.':'Checking your account…'}</p>}
    <div className="dt-cloud-content" hidden={state!=='ready'}>{children}</div>
  </>;
}
