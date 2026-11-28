'use client';

import {useCallback,useEffect,useRef,type ReactNode} from 'react';
import {useFormStatus} from 'react-dom';

function SignupSubmit({enabled,release}:{enabled:boolean;release:()=>void}) {
  const {pending}=useFormStatus();
  useEffect(()=>{
    if(!pending)release();
  },[pending,release]);

  return <button className="dt-tactile-primary" type="submit" disabled={!enabled||pending} aria-busy={pending}>
    {pending?'Creating account…':'Create account'} <span aria-hidden="true">↗</span>
  </button>;
}

export function SignupForm({action,enabled,children}:{
  action:(data:FormData)=>Promise<void>;
  enabled:boolean;
  children:ReactNode;
}) {
  const submitted=useRef(false);
  const release=useCallback(()=>{submitted.current=false;},[]);

  return <form action={action} className="dt-account-form" onSubmit={event=>{
    if(!enabled||submitted.current) {
      event.preventDefault();
      return;
    }
    submitted.current=true;
  }}>
    {children}
    <SignupSubmit enabled={enabled} release={release}/>
  </form>;
}
