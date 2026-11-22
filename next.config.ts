import type {NextConfig} from 'next';
import {appOrigin,supabaseConfig} from './src/lib/accounts/config';

if(process.env.VERCEL==='1') {
  appOrigin();
  const supabase=supabaseConfig();
  const serviceKey=process.env.SUPABASE_SECRET_KEY;
  if(!supabase||!serviceKey) {
    throw new Error('Configure the Supabase URL, publishable key and server-only secret for this Vercel environment.');
  }
  const url=new URL(supabase.url);
  if(url.protocol!=='https:'||url.href!==url.origin+'/') {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL to the HTTPS project origin.');
  }
  const legacyRole=(key:string)=>{
    try { return JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role; }
    catch { return null; }
  };
  if(!supabase.key.startsWith('sb_publishable_')&&legacyRole(supabase.key)!=='anon') {
    throw new Error('Use only a publishable or legacy anon key in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  if(!serviceKey.startsWith('sb_secret_')&&legacyRole(serviceKey)!=='service_role') {
    throw new Error('Use the server-only Supabase secret or legacy service role key in SUPABASE_SECRET_KEY.');
  }
}

const config:NextConfig={
  poweredByHeader:false,
  async headers() {
    return [{source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      ...(process.env.VERCEL_ENV==='preview'?[{key:'X-Robots-Tag',value:'noindex, nofollow'}]:[]),
    ]}];
  },
};

export default config;
