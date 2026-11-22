import Link from 'next/link';
import {AccountShell,AccountNotice} from '@/components/accounts/account-shell';
import {ConnectionDetails,Portrait,type ConnectionView} from '@/components/accounts/connection';
import {CopyId} from '@/components/accounts/copy-id';
import {ExportCloud} from '@/components/accounts/guest-migration';
import {deleteAccount,saveAvatar,saveDisplayName,signOut} from '@/lib/accounts/actions';
import {privateStorage,requireAccount} from '@/lib/accounts/server';
import {mediaBucket} from '@/lib/accounts/media';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';

export const metadata={title:'Account settings — Dear Tomorrow'};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{message?:string}>}) {
  const {profile,user,client}=await requireAccount();
  const view=profile.deleting_at?null:(await client.rpc('dt_connection_view')).data as ConnectionView|null;
  let photo:string|null=null;
  if(!profile.deleting_at&&profile.avatar?.startsWith(user.id+'/avatar/')) {
    const image=await privateStorage()?.storage.from(mediaBucket).download(profile.avatar);
    if(image?.data&&/^image\/(jpeg|png|webp)$/.test(image.data.type))photo='data:'+image.data.type+';base64,'+Buffer.from(await image.data.arrayBuffer()).toString('base64');
  }
  return <AccountShell><CloudBoundary scope={{owner:user.id,kind:'letters',path:'/settings'}} navigation={false}>
    <div className="dt-account-heading"><h1>Account settings.</h1></div>
    <AccountNotice message={(await searchParams).message??(profile.deleting_at?'deletion_pending':undefined)}/>
    {!profile.deleting_at&&<>
      <div className="dt-account-grid">
        <section className="dt-account-section">
          <h2>Profile</h2><Portrait name={profile.display_name} photo={photo}/><p>{user.email}</p>
          <form action={saveDisplayName} className="dt-account-form">
            <label>Display name<input name="name" required maxLength={60} defaultValue={profile.display_name}/></label>
            <button className="dt-account-primary">Save display name</button>
          </form>
          <form id="profile-photo" action={saveAvatar} className="dt-account-form">
            <label>Profile photograph (optional)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"/></label>
            <small>JPEG, PNG, or WebP up to 750 KB.</small>
            <div className="dt-account-actions"><button className="dt-account-secondary" name="operation" value="save">Save photograph</button>
              {profile.avatar&&<button className="dt-account-link" name="operation" value="remove">Remove photograph</button>}</div>
          </form>
        </section>
        <section className="dt-account-section">
          <h2>Your Dear Tomorrow ID</h2>
          <CopyId code={profile.dear_id}/>
          <p>Share this permanent ID with someone special so they can find your account.</p>
        </section>
      </div>
      {view&&<ConnectionDetails view={view} path="settings"/>}
      <section className="dt-account-section">
        <h2>Privacy and data</h2>
        <p>My Space belongs to you. Shared items give your partner permission to view them until you revoke access or disconnect.</p>
        <div className="dt-account-actions"><ExportCloud owner={user.id}/><Link href="/my-space">Manage your memories</Link></div>
        <p>Memories saved in guest mode stay on this device, including when you sign out.</p>
      </section>
    </>}
    <section className="dt-account-section">
      <h2>Account access</h2>
      <form action={signOut}><button className="dt-account-secondary">Sign out</button></form>
      <details className="dt-account-danger" open={!!profile.deleting_at||undefined}><summary>{profile.deleting_at?'Finish deleting account':'Delete account'}</summary>
        <p>This permanently deletes your profile, owned cloud memories, uploaded files, and partner connection. Guest memories and previously downloaded copies stay on their devices.</p>
        <form action={deleteAccount} className="dt-account-form">
          <label>Current password<input name="password" required type="password" autoComplete="current-password" maxLength={128}/></label>
          <label>Type DELETE to confirm<input name="confirmation" required pattern="DELETE" autoComplete="off"/></label>
          <button className="dt-account-primary">Permanently delete account</button>
        </form>
      </details>
    </section>
  </CloudBoundary></AccountShell>;
}
