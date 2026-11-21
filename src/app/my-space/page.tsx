import Link from 'next/link';
import {redirect} from 'next/navigation';
import {AccountShell,AccountNotice} from '@/components/accounts/account-shell';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';
import {GuestMigration} from '@/components/accounts/guest-migration';
import {SpaceItems} from '@/components/accounts/space-library';
import {requireAccount} from '@/lib/accounts/server';
import {spaces} from '@/lib/accounts/identity';
import type {LibraryItem} from '@/lib/accounts/documents';
import type {ConnectionView} from '@/components/accounts/connection';

export const metadata={title:'My Space — Dear Tomorrow'};
export const dynamic='force-dynamic';
export default async function Page() {
  const {profile,user,client}=await requireAccount();
  if(profile.deleting_at)redirect('/settings');
  const [library,connection]=await Promise.all([client.rpc('dt_library'),client.rpc('dt_connection_view')]);
  const items=(library.data??[]) as LibraryItem[];
  const partner=(connection.data as ConnectionView|null)?.partner;
  const drafts=items.filter(item=>item.draft);
  return <AccountShell><CloudBoundary scope={{owner:user.id,kind:'letters',path:'/my-space'}} navigation={false}>
    <div className="dt-account-heading"><p>My Space · {profile.display_name}</p><h1>A little place for everything that matters.</h1>
      <div className="dt-account-actions"><Link href={partner?'/our-space':'/connect'}>{partner?'Open Our Space':'Find your person'}</Link><Link href="/settings">Settings</Link></div></div>
    <AccountNotice message={library.error?'try':undefined}/>
    <GuestMigration owner={user.id}/>
    <div className="dt-account-grid">
      <section className="dt-account-section"><h2>Your library</h2><ul className="dt-account-rooms">{Object.values(spaces).map(space=>
        <li key={space.path}><Link href={space.path+'?space=mine'}><strong>{space.name} <span aria-hidden="true">↗</span></strong><span>{space.note}</span></Link></li>
      )}</ul></section>
      <section className="dt-account-section"><h2>Recent creations</h2>
        {items.length?<SpaceItems items={items.slice(0,8)}/>:<div className="dt-space-empty"><span aria-hidden="true">✦</span><h3>Your first keepsake starts here.</h3><p>Choose a way to hold on to a little piece of your story.</p><nav aria-label="Create a keepsake">
          <Link href="/letters"><strong>Write a Letter</strong><span>Put something into words</span></Link>
          <Link href="/memory-books"><strong>Make a Memory Book</strong><span>Gather moments together</span></Link>
          <Link href="/memory-tree"><strong>Grow your Memory Tree</strong><span>Give each memory a leaf</span></Link>
          <Link href="/journey-letters"><strong>Begin a Journey Letter</strong><span>Write for a moment ahead</span></Link>
        </nav></div>}
        {drafts.length>0&&<details><summary>Saved drafts · {drafts.length}</summary><SpaceItems items={drafts}/></details>}
      </section>
    </div>
    {items.length>8&&<details className="dt-account-section"><summary>All memories · {items.length}</summary><SpaceItems items={items}/></details>}
  </CloudBoundary></AccountShell>;
}
