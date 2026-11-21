import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { appOrigin, supabaseConfig } from './config';
import { spaces, type SpaceKind } from './identity';

export function accountClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const store = cookies();
  return createServerClient(config.url,config.key,{
    cookieOptions:{httpOnly:true,sameSite:'lax',secure:appOrigin().startsWith('https:')},
    cookies:{
      getAll:()=>store.getAll(),
      setAll:(updates)=>{
        try { for(const {name,value,options} of updates)store.set(name,value,options); }
        catch { /* Middleware refreshes sessions on read-only Server Components. */ }
      },
    },
  });
}

export function privateStorage() {
  const config = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  return config && secret ? createClient(config.url,secret,{auth:{autoRefreshToken:false,persistSession:false}}) : null;
}

export type Profile = {display_name:string; dear_id:string; onboarded:boolean; deleting_at:string|null; avatar:string|null};
export async function account() {
  const client = accountClient();
  if(!client)return null;
  const {data:{user}} = await client.auth.getUser();
  if(!user?.email_confirmed_at)return null;
  return {client,user};
}

export async function requireAccount() {
  const session = await account();
  if(!session)redirect('/login');
  const {data,error} = await session.client.from('dt_profiles')
    .select('display_name,dear_id,onboarded,deleting_at,avatar').eq('id',session.user.id).single();
  if(error || !data) throw new Error('Your private profile could not be loaded.');
  return {...session,profile:data as Profile};
}

export async function workspaceScope(kind:SpaceKind,mode?:string) {
  if(mode!=='mine')return undefined;
  const {user,profile} = await requireAccount();
  if(profile.deleting_at)redirect('/settings');
  return {owner:user.id,kind,path:spaces[kind].path};
}
