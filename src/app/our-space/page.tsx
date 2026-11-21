import Link from 'next/link';
import {redirect} from 'next/navigation';
import {AccountShell,AccountNotice} from '@/components/accounts/account-shell';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';
import type {ConnectionView} from '@/components/accounts/connection';
import {SpaceItems} from '@/components/accounts/space-library';
import {requireAccount} from '@/lib/accounts/server';
import type {LibraryItem} from '@/lib/accounts/documents';

export const metadata={title:'Our Space — Dear Tomorrow'};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:{welcome?:string}}) {
  const {profile,user,client}=await requireAccount();
  if(profile.deleting_at)redirect('/settings');
  const connection=await client.rpc('dt_connection_view');
  const partner=(connection.data as ConnectionView|null)?.partner;
  if(!partner)return <AccountShell><div className="dt-account-heading"><h1>Our Space.</h1><p>Your shared space opens after you both agree to connect.</p>
    <div className="dt-account-actions"><Link href="/connect">View connection requests</Link><Link href="/my-space">Back to My Space</Link></div></div></AccountShell>;
  const shared=await client.rpc('dt_library',{include_shared:true});
  const items=(shared.data??[]) as LibraryItem[];
  return <AccountShell><CloudBoundary scope={{owner:user.id,kind:'letters',path:'/our-space'}} navigation={false}>
    <div className="dt-account-pair">
      <p>{profile.display_name} &amp; {partner.name}</p>
      <svg viewBox="0 0 240 38" aria-hidden="true">
        <path d="M4 22c39-28 65 9 112-3 29-7 42-16 83-6 15 4 23 2 37-3M4 13c45 20 70-21 116 5 37 20 65 7 116 1" stroke="currentColor" fill="none"/>
        <circle cx="119" cy="19" r="3.1" fill="#804852"/>
      </svg>
      <h1>{searchParams.welcome==='1'?'Your stories are now connected.':'All the little things that make us, us.'}</h1>
      <p>Connected on {new Date(partner.since).toLocaleDateString('en-US',{dateStyle:'long',timeZone:'UTC'})}</p>
    </div>
    <section className="dt-account-section"><h2>Shared memories</h2><AccountNotice message={shared.error?'try':undefined}/>
      {items.length?<SpaceItems items={items} ours/>:<div className="dt-space-empty dt-shared-empty"><span aria-hidden="true">✧</span><h3>A shared page, still waiting for its first story.</h3>
        <p>{profile.display_name} and {partner.name}, your memories stay yours until you choose one to share. When you’re ready, open My Space and share a keepsake here.</p>
        <div className="dt-account-actions"><Link href="/my-space">Open My Space</Link></div></div>}
      {items.length>0&&<div className="dt-account-actions"><Link href="/my-space">Choose something from My Space</Link><Link href="/settings">Connection settings</Link></div>}
    </section>
  </CloudBoundary></AccountShell>;
}
