'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {signOut} from '@/lib/accounts/actions';

type User = {id:string;name:string;paired:boolean;deleting:boolean};
export function AccountNav({enabled}:{enabled:boolean}) {
  const [user,setUser]=useState<User|null>(null);
  const pathname=usePathname();
  useEffect(()=>{
    if(!enabled)return;
    let pending:AbortController|undefined;
    function refresh() {
      if(document.hidden)return;
      pending?.abort();
      const request=new AbortController();
      pending=request;
      void fetch('/api/account-session',{cache:'no-store',signal:request.signal}).then(async response=>{
        if(!response.ok)throw new Error('Session unavailable');
        const data=await response.json();
        if(!request.signal.aborted)setUser(data.id?data:null);
      }).catch(()=>{if(!request.signal.aborted)setUser(null);});
    }
    refresh();
    window.addEventListener('pageshow',refresh);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{pending?.abort();window.removeEventListener('pageshow',refresh);window.removeEventListener('focus',refresh);
      document.removeEventListener('visibilitychange',refresh);};
  },[enabled,pathname]);
  return <nav className="dt-account-nav" aria-label="Account">
    {user?<>{!user.deleting&&<><Link href="/my-space">My Space</Link>{user.paired&&<Link href="/our-space">Our Space</Link>}</>}
      <details key={pathname}><summary>{user.name}</summary><div><Link href="/settings">Settings</Link>
        {!user.deleting&&!user.paired&&<Link href="/connect">Find your person</Link>}
        <form action={signOut}><button>Sign out</button></form>
      </div></details>
    </>:<><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link></>}
  </nav>;
}
