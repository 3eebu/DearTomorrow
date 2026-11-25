import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireAccount} from '@/lib/accounts/server';
import {shareMemory} from '@/lib/accounts/actions';
import {spaces} from '@/lib/accounts/identity';
import {uuidPattern,type LibraryItem} from '@/lib/accounts/documents';
import {AccountNotice,AccountShell} from './account-shell';
import {CloudBoundary} from './cloud-boundary';
import type {ConnectionView} from './connection';
import {MemoryViewer} from './memory-viewer';

export async function MemoryPage({id,ours,message}:{id:string;ours:boolean;message?:string}) {
  const {client,user,profile}=await requireAccount();
  if(profile.deleting_at)redirect('/settings');
  if(!uuidPattern.test(id))notFound();
  const {data,error}=await client.rpc('dt_library',{include_shared:ours});
  if(error)throw new Error('Could not read this memory.');
  const item=(data as LibraryItem[]).find(item=>item.id===id);
  if(!item)notFound();
  const back=ours?'/our-space':'/my-space';
  const connection=item.owned&&!ours?(await client.rpc('dt_connection_view')).data as ConnectionView|null:null;
  const partner=connection?.partner;
  return <AccountShell><CloudBoundary scope={{owner:user.id,kind:item.kind,path:back}} navigation={false}>
    <div className="dt-account-actions"><Link href={back}>← {ours?'Our Space':'My Space'}</Link>
      {item.owned&&!ours&&<Link href={spaces[item.kind].path+'?space=mine'}>Open the {spaces[item.kind].name} workspace</Link>}</div>
    <div className="dt-account-heading"><h1>{item.title}</h1>
      <p>{ours?`From ${item.ownerName}`:item.shared?'Shared with your partner':'Private in My Space'}</p></div>
    <AccountNotice message={message}/>
    {item.owned&&!ours&&<section className="dt-account-card dt-stationery dt-stationery-card">
      <h2>Who can see this?</h2>
      {partner?<><p>{item.shared?`${partner.name} can view this keepsake.`:
        `Sharing gives ${partner.name} permission to view this keepsake. Timed envelopes open when their server-checked opening time arrives.`}</p>
        <form action={shareMemory} className="dt-account-actions">
          <input type="hidden" name="document" value={item.id}/>
          <button className={item.shared?'dt-account-secondary dt-tactile-secondary':'dt-account-primary dt-tactile-primary'} name="share" value={item.shared?'no':'yes'}>
            {item.shared?'Keep private':'Share with my partner'}</button>
        </form></>:<p>Only you can view this keepsake. <Link href="/connect">Connect with someone</Link> to share it.</p>}
    </section>}
    <div className="dt-account-reader"><MemoryViewer owner={user.id} document={item.id} returnTo={back}/></div>
  </CloudBoundary></AccountShell>;
}
