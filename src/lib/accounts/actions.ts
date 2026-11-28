'use server';

import {redirect} from 'next/navigation';
import {account,accountClient,accountLanding,privateStorage} from './server';
import {appOrigin,supabaseConfig} from './config';
import {oauthAuthorizeUrl,oauthCallbackPath} from './oauth';
import {availableSocialProviders} from './social-providers';
import {displayName,normalizeDearId} from './identity';
import {uuidPattern} from './documents';
import {removeOwnedMedia,saveImage} from './media';
import {recordAuthError,recordServiceEvent} from './service-events';
import {revalidatePath} from 'next/cache';
import type {User} from '@supabase/supabase-js';

function field(form:FormData,key:string) {
  const value=form.get(key);
  return typeof value==='string'?value:'';
}
function email(form:FormData) {
  const value=field(form,'email').trim();
  return value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?value:null;
}
const validPassword=(value:string)=>value.length>=10&&value.length<=128;
async function landing(client:NonNullable<Awaited<ReturnType<typeof accountClient>>>,user:User) {
  redirect(await accountLanding(client,user.id) ?? '/welcome');
}

export async function signInWithProvider(form:FormData) {
  const requested = field(form,'provider');
  const provider = (await availableSocialProviders()).find(value=>value===requested);
  const config = supabaseConfig();
  const client = await accountClient();
  if (!provider || !config || !client) redirect('/login?message=social-unavailable');
  const {data,error} = await client.auth.signInWithOAuth({
    provider,
    options:{redirectTo:new URL(oauthCallbackPath,appOrigin()).href,skipBrowserRedirect:true},
  });
  const destination = !error && data.url ? oauthAuthorizeUrl(config.url,data.url) : null;
  if (error) recordAuthError(error.status);
  if (!destination) redirect('/login?message=social-failed');
  redirect(destination);
}

export async function signUp(form:FormData) {
  const client=await accountClient();
  if(!client)redirect('/signup?message=unavailable');
  const name=displayName(field(form,'name')),address=email(form),password=field(form,'password');
  if(!name||!address||!validPassword(password))redirect('/signup?message=details');
  const {data,error}=await client.auth.signUp({email:address,password,options:{
    data:{display_name:name},emailRedirectTo:appOrigin()+'/auth/confirm',
  }});
  if(error)recordAuthError(error.status);
  if(error?.status===429)redirect('/signup?message=rate');
  if(error && error.status!==422)redirect('/signup?message=try');
  if(data.session&&data.user?.email_confirmed_at)await landing(client,data.user);
  redirect('/login?message=verification');
}
export async function signIn(form:FormData) {
  const client=await accountClient();
  if(!client)redirect('/login?message=unavailable');
  const address=email(form),password=field(form,'password');
  if(!address||!password||password.length>128)redirect('/login?message=credentials');
  const {data,error}=await client.auth.signInWithPassword({email:address,password});
  if(error)recordAuthError(error.status);
  if(error?.status===429)redirect('/login?message=rate');
  if(error||!data.user?.email_confirmed_at)redirect('/login?message=credentials');
  await landing(client,data.user);
}
export async function requestRecovery(form:FormData) {
  const client=await accountClient();
  if(!client)redirect('/forgot-password?message=unavailable');
  const address=email(form);
  if(!address)redirect('/forgot-password?message=details');
  const {error}=await client.auth.resetPasswordForEmail(address,{redirectTo:appOrigin()+'/auth/confirm'});
  if(error)recordAuthError(error.status);
  if(error?.status===429)redirect('/forgot-password?message=rate');
  redirect('/forgot-password?message=recovery');
}
export async function resetPassword(form:FormData) {
  const session=await account();
  if(!session)redirect('/forgot-password?message=confirmation');
  const password=field(form,'password');
  if(!validPassword(password))redirect('/reset-password?message=details');
  const {error}=await session.client.auth.updateUser({password});
  if(error)recordAuthError(error.status);
  if(error)redirect('/reset-password?message=try');
  await session.client.auth.signOut({scope:'global'});
  redirect('/login?message=changed');
}
export async function signOut() {
  const client=await accountClient();
  await client?.auth.signOut({scope:'local'});
  redirect('/');
}
export async function saveDisplayName(form:FormData) {
  const session=await account();
  if(!session)redirect('/login');
  const onboarding=field(form,'onboard')==='yes';
  const path=onboarding?'/welcome':'/settings';
  const name=displayName(field(form,'name'));
  if(!name)redirect(path+'?message=details');
  const {error}=await session.client.rpc('dt_profile_name',{name,finish:onboarding});
  if(error)redirect(path+'?message=try');
  redirect(onboarding?(field(form,'destination')==='connect'?'/connect':'/my-space'):'/settings?message=saved');
}

export async function findAccount(raw:string):Promise<{name?:string;match?:string;error?:string}> {
  const session=await account();
  if(!session)return {error:'Sign in and verify your email to look someone up.'};
  const code=typeof raw==='string'&&raw.length<=80?normalizeDearId(raw):null;
  if(!code)return {error:'Enter a valid Dear Tomorrow ID.'};
  const {data,error}=await session.client.rpc('dt_find_account',{code});
  if(error||!data)return {error:'Account lookup is temporarily unavailable.'};
  return data;
}
export async function sendRequest(match:string):Promise<{ok?:boolean;error?:string}> {
  const session=await account();
  if(!session||typeof match!=='string'||!uuidPattern.test(match))return {error:'Find the account again to send a request.'};
  const {data,error}=await session.client.rpc('dt_connection_action',{operation:'send',reference:match});
  if(error||!data)return {error:'This request could not be sent.'};
  revalidatePath('/connect');
  return data;
}
export async function manageConnection(form:FormData) {
  const session=await account();
  if(!session)redirect('/login');
  const operation=field(form,'operation'), reference=field(form,'reference');
  const path=field(form,'path')==='settings'?'/settings':'/connect';
  const hasReference=['accept','decline','cancel'].includes(operation);
  if((hasReference&&!uuidPattern.test(reference))||
    (!hasReference&&!['disconnect','open_requests','close_requests'].includes(operation)))redirect(path+'?message=try');
  const {data,error}=await session.client.rpc('dt_connection_action',{operation,reference:hasReference?reference:null});
  if(error||data?.error)redirect(path+'?message=request');
  if(data?.paired)redirect('/our-space?welcome=1');
  redirect(path+'?message=saved');
}
export async function shareMemory(form:FormData) {
  const session=await account();
  if(!session)redirect('/login');
  const document=field(form,'document');
  if(!uuidPattern.test(document))redirect('/my-space');
  const path='/my-space/memory/'+document;
  const {error}=await session.client.rpc('dt_share',{document,allow_share:field(form,'share')==='yes'});
  redirect(path+(error?'?message=try':'?message=saved'));
}
export async function saveAvatar(form:FormData) {
  const session=await account();
  if(!session)redirect('/login');
  const remove=field(form,'operation')==='remove';
  let asset:string|null=null;
  if(!remove) {
    const store=privateStorage(), file=form.get('photo');
    if(!store||!(file instanceof File)||!file.size||file.size>750_000)redirect('/settings?message=photo');
    try {asset=await saveImage(Buffer.from(await file.arrayBuffer()),file.type,session.user.id,store);}
    catch {redirect('/settings?message=photo');}
  }
  const {error}=await session.client.rpc('dt_profile_avatar',{asset});
  redirect(error?'/settings?message=photo':'/settings?message=saved');
}
export async function deleteAccount(form:FormData) {
  const session=await account();
  if(!session||!session.user.email)redirect('/login');
  const store=privateStorage();
  const password=field(form,'password');
  if(!store)redirect('/settings?message=unavailable');
  if(field(form,'confirmation')!=='DELETE'||!password||password.length>128)redirect('/settings?message=delete');
  const {data,error}=await session.client.auth.signInWithPassword({email:session.user.email,password});
  if(error||data.user?.id!==session.user.id)redirect('/settings?message=delete');
  const {error:closing}=await store.rpc('dt_begin_delete',{actor:session.user.id});
  if(closing) {
    recordServiceEvent('account.cleanup_failed');
    redirect('/settings?message=try');
  }
  try {await removeOwnedMedia(session.user.id,store);}
  catch {
    recordServiceEvent('account.cleanup_failed');
    redirect('/settings?message=deletion_pending');
  }
  const {error:failure}=await store.auth.admin.deleteUser(session.user.id);
  if(failure) {
    recordServiceEvent('account.cleanup_failed');
    redirect('/settings?message=deletion_pending');
  }
  await session.client.auth.signOut({scope:'local'});
  redirect('/');
}
