import {AuthPage} from '@/components/accounts/auth-page';
export const metadata={title:'Password recovery — Dear Tomorrow'};
export default async function Page({searchParams}:{searchParams:Promise<{message?:string}>}) {
  return <AuthPage mode="forgot" message={(await searchParams).message}/>;
}
