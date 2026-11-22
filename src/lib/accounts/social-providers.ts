import 'server-only';
import {supabaseConfig} from './config';

const providers = ['google','apple'] as const;
export type SocialProvider = (typeof providers)[number];

export async function availableSocialProviders():Promise<SocialProvider[]> {
  const config = supabaseConfig();
  const optedIn = {
    google: process.env.DEAR_TOMORROW_GOOGLE_SIGN_IN === 'true',
    apple: process.env.DEAR_TOMORROW_APPLE_SIGN_IN === 'true',
  };
  if (!config || !providers.some(provider=>optedIn[provider])) return [];
  try {
    const response = await fetch(config.url.replace(/\/$/, '') + '/auth/v1/settings',{
      headers:{apikey:config.key},cache:'no-store',signal:AbortSignal.timeout(3500),
    });
    if (!response.ok) return [];
    const settings = await response.json();
    return providers.filter(provider=>optedIn[provider] && settings.external?.[provider] === true);
  } catch {
    return [];
  }
}
