import {AuthPage} from '@/components/accounts/auth-page';
export const metadata={title:'Sign in — Dear Tomorrow'};
export default function Page({searchParams}:{searchParams:{message?:string}}) {
  return <AuthPage mode="login" message={searchParams.message}/>;
}
