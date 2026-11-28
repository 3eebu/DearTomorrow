import {NextRequest,NextResponse} from 'next/server';
import {appOrigin,matchesHostedOrigin} from '@/lib/accounts/config';
import {accountClient} from '@/lib/accounts/server';
import {recordAuthError} from '@/lib/accounts/service-events';
import {recoveryCookie,recoveryCookieOptions,recoveryProof} from '@/lib/accounts/recovery';

export async function GET(request:NextRequest) {
  const token_hash=request.nextUrl.searchParams.get('token_hash');
  const type=request.nextUrl.searchParams.get('type');
  const client=matchesHostedOrigin(request.headers.get('host'))?await accountClient():null;
  let destination='/login?message=confirmation';
  let proof:string|null=null;
  if(client && token_hash && token_hash.length<=512 && (type==='email'||type==='recovery')) {
    const {data,error}=await client.auth.verifyOtp({token_hash,type});
    if(error)recordAuthError(error.status);
    if(!error&&type==='email')destination='/welcome';
    if(!error&&type==='recovery'&&data.session&&data.user?.email_confirmed_at) {
      proof=recoveryProof(data.session.access_token);
      destination=proof?'/reset-password':'/forgot-password?message=unavailable';
    }
  }
  const response=NextResponse.redirect(new URL(destination,appOrigin()),{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
  if(proof)response.cookies.set(recoveryCookie,proof,recoveryCookieOptions());
  return response;
}
