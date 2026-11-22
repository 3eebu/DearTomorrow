export const oauthCallbackPath = '/auth/callback';

export function oauthAuthorizeUrl(supabaseUrl:string, candidate:string) {
  try {
    const authEndpoint = new URL(supabaseUrl.replace(/\/$/, '') + '/auth/v1/authorize');
    const url = new URL(candidate);
    if (url.origin === authEndpoint.origin && url.pathname === authEndpoint.pathname &&
        !url.username && !url.password && !url.hash) return url.href;
  } catch {
    return null;
  }
  return null;
}

// The Auth client persists the token response. Keep Google and Apple API tokens
// out of that response before the SDK can serialize them into session cookies.
export function withoutProviderTokens(supabaseUrl:string, transport:typeof fetch = fetch):typeof fetch {
  const endpoint = new URL(supabaseUrl.replace(/\/$/, '') + '/auth/v1/token');
  return async (input,init) => {
    const response = await transport(input,init);
    const url = new URL(input instanceof Request ? input.url : input);
    if (!response.ok || url.origin !== endpoint.origin || url.pathname !== endpoint.pathname) return response;
    const payload = await response.json();
    delete payload.provider_token;
    delete payload.provider_refresh_token;
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return Response.json(payload,{status:response.status,headers});
  };
}
