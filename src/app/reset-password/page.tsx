import {AuthPage} from '@/components/accounts/auth-page';
import {account} from '@/lib/accounts/server';
import {redirect} from 'next/navigation';
export const metadata={title:'Set a new password — Dear Tomorrow'};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:{message?:string}}) {
  if(!await account())redirect('/forgot-password?message=confirmation');
  return <AuthPage mode="reset" message={searchParams.message}/>;
}
