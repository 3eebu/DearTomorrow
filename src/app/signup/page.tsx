import {AuthPage} from '@/components/accounts/auth-page';
export const metadata={title:'Create your account — Dear Tomorrow'};
export default async function Page({searchParams}:{searchParams:Promise<{message?:string}>}) {
  return <AuthPage mode="signup" message={(await searchParams).message}/>;
}
