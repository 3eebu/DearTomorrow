export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? {url,key} : null;
}

export function appOrigin() {
  return new URL(process.env.DEAR_TOMORROW_APP_URL || 'http://127.0.0.1:3002').origin;
}
