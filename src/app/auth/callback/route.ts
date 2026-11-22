import {NextRequest,NextResponse} from 'next/server';
import {appOrigin,matchesHostedOrigin} from '@/lib/accounts/config';
import {accountClient,accountLanding} from '@/lib/accounts/server';

function redirectTo(path:string) {
  return NextResponse.redirect(new URL(path,appOrigin()),{
    headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'},
  });
}

export async function GET(request:NextRequest) {
  if(!matchesHostedOrigin(request.headers.get('host')))return redirectTo('/login?message=social-expired');
  const query = request.nextUrl.searchParams;
  if (query.has('error') || query.has('error_code')) {
    return redirectTo(query.get('error')==='access_denied'
      ? '/login?message=social-cancelled'
      : '/login?message=social-failed');
  }
  const [code,duplicate] = query.getAll('code');
  if (!code || duplicate!==undefined || code.length>1024) return redirectTo('/login?message=social-expired');

  const client = await accountClient({oauthExchange:true});
  if (!client) return redirectTo('/login?message=social-unavailable');
  try {
    const {data,error} = await client.auth.exchangeCodeForSession(code);
    if (error || !data.user) return redirectTo('/login?message=social-expired');
    const {data:{user}} = await client.auth.getUser();
    if (!user?.email_confirmed_at || user.id!==data.user.id) {
      await client.auth.signOut({scope:'local'});
      return redirectTo('/login?message=social-unverified');
    }
    const destination = await accountLanding(client,user.id);
    return redirectTo(destination ?? '/login?message=social-failed');
  } catch {
    return redirectTo('/login?message=social-failed');
  }
}
