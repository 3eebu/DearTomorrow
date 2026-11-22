import {AuthPage} from '@/components/accounts/auth-page';
export const metadata={title:'Sign in — Dear Tomorrow'};
export default async function Page({searchParams}:{searchParams:Promise<{message?:string}>}) {
  return <AuthPage mode="login" message={(await searchParams).message}/>;
}
