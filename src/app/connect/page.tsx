import {redirect} from 'next/navigation';
import {requireAccount} from '@/lib/accounts/server';
import {AccountNotice,AccountShell} from '@/components/accounts/account-shell';
import {ConnectionFinder,ConnectionDetails,type ConnectionView} from '@/components/accounts/connection';
import {CloudBoundary} from '@/components/accounts/cloud-boundary';

export const metadata={title:'Find your person — Dear Tomorrow'};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:{message?:string}}) {
  const {client,profile,user}=await requireAccount();
  if(profile.deleting_at)redirect('/settings');
  const {data,error}=await client.rpc('dt_connection_view');
  const view=data as ConnectionView|null;
  return <AccountShell><CloudBoundary scope={{owner:user.id,kind:'letters',path:'/connect'}} navigation={false}>
    <div className="dt-account-heading"><h1>Find your person.</h1>
      <p>Enter their Dear Tomorrow ID to find them and ask if they&apos;d like to connect.</p></div>
    <AccountNotice message={searchParams.message??(error?'try':undefined)}/>
    {view&&!view.partner&&<ConnectionFinder/>}
    {view&&<ConnectionDetails view={view} path="connect"/>}
  </CloudBoundary></AccountShell>;
}
