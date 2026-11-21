import {AuthPage} from '@/components/accounts/auth-page';
export const metadata={title:'Create your account — Dear Tomorrow'};
export default function Page({searchParams}:{searchParams:{message?:string}}) {
  return <AuthPage mode="signup" message={searchParams.message}/>;
}
