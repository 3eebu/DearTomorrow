import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAccount} from '@/lib/accounts/server';
import {saveDisplayName} from '@/lib/accounts/actions';
import {AccountShell,AccountNotice} from '@/components/accounts/account-shell';
import {Portrait} from '@/components/accounts/connection';
import {GuestMigration} from '@/components/accounts/guest-migration';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';

export const metadata={title:'Welcome — Dear Tomorrow'};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{message?:string}>}) {
  const {profile,user}=await requireAccount();
  if(profile.deleting_at)redirect('/settings');
  return <AccountShell><CloudBoundary scope={{owner:user.id,kind:'letters',path:'/welcome'}} navigation={false}>
    <div className="dt-account-heading"><Portrait name={profile.display_name}/>
      <h1>Welcome to your little corner of Dear Tomorrow.</h1>
      <p>My Space is yours. You can connect with someone special whenever you feel ready.</p></div>
    <AccountNotice message={(await searchParams).message}/>
    <form className="dt-account-form" action={saveDisplayName}>
      <input type="hidden" name="onboard" value="yes"/>
      <label>Display name<input name="name" required maxLength={60} defaultValue={profile.display_name} autoComplete="nickname"/></label>
      <div className="dt-account-actions">
        <button className="dt-account-primary" name="destination" value="mine">Enter My Space</button>
        <button className="dt-account-secondary" name="destination" value="connect">Connect with someone special</button>
      </div>
    </form>
    <Link href="/settings#profile-photo">Add a profile photograph in settings</Link>
    <GuestMigration owner={user.id}/>
  </CloudBoundary></AccountShell>;
}
