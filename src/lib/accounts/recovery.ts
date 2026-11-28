import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {appOrigin} from './config';

export const recoveryCookie='dt-password-recovery';
const lifetimeSeconds=15*60;
export function recoveryCookieOptions() {
  return {httpOnly:true,sameSite:'lax' as const,secure:appOrigin().startsWith('https:'),path:'/',maxAge:lifetimeSeconds};
}
function signature(accessToken:string,expires:number,secret:string) {
  return createHmac('sha256',secret).update('dt-password-recovery\n'+expires+'\n'+accessToken).digest('hex');
}
export function recoveryProof(accessToken:string,now=Date.now()) {
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!secret)return null;
  const expires=now+lifetimeSeconds*1000;
  return expires+'.'+signature(accessToken,expires,secret);
}
export function verifiesRecovery(proof:string|undefined,accessToken:string,now=Date.now()) {
  const secret=process.env.SUPABASE_SECRET_KEY;
  const match=/^(\d{13})\.([0-9a-f]{64})$/.exec(proof??'');
  if(!secret||!match)return false;
  const expires=Number(match[1]);
  return expires>now&&expires<=now+lifetimeSeconds*1000&&
    timingSafeEqual(Buffer.from(match[2],'hex'),Buffer.from(signature(accessToken,expires,secret),'hex'));
}
