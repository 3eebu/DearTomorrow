export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? {url,key} : null;
}

export function appOrigin() {
  const hosted=process.env.VERCEL==='1';
  const configured=process.env.DEAR_TOMORROW_APP_URL;
  if(hosted&&!configured)throw new Error('Set DEAR_TOMORROW_APP_URL for this Vercel environment.');
  const url=new URL(configured||'http://127.0.0.1:3002');
  const loopback=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||
    (url.protocol!=='https:'&&(!loopback||url.protocol!=='http:'))||(hosted&&loopback)) {
    throw new Error('DEAR_TOMORROW_APP_URL must be an HTTPS origin for staging. Loopback HTTP is supported locally.');
  }
  return url.origin;
}

export function matchesHostedOrigin(host:string|null) {
  return process.env.VERCEL!=='1'||host?.toLowerCase()===new URL(appOrigin()).host;
}
