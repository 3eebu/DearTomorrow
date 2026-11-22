import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {appOrigin,matchesHostedOrigin,supabaseConfig} from './lib/accounts/config';

export async function proxy(request:NextRequest) {
  if(!matchesHostedOrigin(request.headers.get('host'))) {
    const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
    if(request.method!=='GET'&&request.method!=='HEAD')return new NextResponse('Open the configured staging address.',{status:421,headers});
    const canonical=new URL(appOrigin());
    canonical.pathname=request.nextUrl.pathname;
    return NextResponse.redirect(canonical,{headers});
  }
  const config=supabaseConfig();
  let response=NextResponse.next({request});
  if(!config || !request.cookies.getAll().some(cookie=>cookie.name.startsWith('sb-')))return response;
  const client=createServerClient(config.url,config.key,{
    cookieOptions:{httpOnly:true,sameSite:'lax',secure:appOrigin().startsWith('https:')},
    cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll:values=>{
        for(const {name,value} of values)request.cookies.set(name,value);
        response=NextResponse.next({request});
        for(const {name,value,options} of values)response.cookies.set(name,value,options);
      },
    },
  });
  await client.auth.getUser();
  response.headers.set('Cache-Control','private, no-store');
  return response;
}

export const config={matcher:['/login','/signup','/settings/:path*','/my-space/:path*','/our-space/:path*',
  '/connect','/welcome','/reset-password','/letters','/memory-books','/memory-tree','/journey-letters']};
