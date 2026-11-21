import {NextRequest,NextResponse} from 'next/server';
import {appOrigin} from '@/lib/accounts/config';
import {accountClient} from '@/lib/accounts/server';

export async function GET(request:NextRequest) {
  const token_hash=request.nextUrl.searchParams.get('token_hash');
  const type=request.nextUrl.searchParams.get('type');
  const client=accountClient();
  let destination='/login?message=confirmation';
  if(client && token_hash && token_hash.length<=512 && (type==='email'||type==='recovery')) {
    const {error}=await client.auth.verifyOtp({token_hash,type});
    if(!error)destination=type==='recovery'?'/reset-password':'/welcome';
  }
  return NextResponse.redirect(new URL(destination,appOrigin()),{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
