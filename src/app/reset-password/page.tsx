import {AuthPage} from '@/components/accounts/auth-page';
import {recoveryAccount} from '@/lib/accounts/server';
import {redirect} from 'next/navigation';
export const metadata={title:'Set a new password — Dear Tomorrow'};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{message?:string}>}) {
  if(!await recoveryAccount())redirect('/forgot-password?message=confirmation');
    return <AuthPage mode="reset" message={(await searchParams).message}/>;
}
