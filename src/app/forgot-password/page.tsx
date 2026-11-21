import {AuthPage} from '@/components/accounts/auth-page';
export const metadata={title:'Password recovery — Dear Tomorrow'};
export default function Page({searchParams}:{searchParams:{message?:string}}) {
  return <AuthPage mode="forgot" message={searchParams.message}/>;
}
