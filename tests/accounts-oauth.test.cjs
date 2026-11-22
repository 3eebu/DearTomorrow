const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname,'../src/lib/accounts/oauth.ts'),'utf8');
const {outputText} = ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
});
const helpers = {};
new Function('exports',outputText)(helpers);
const {oauthAuthorizeUrl,withoutProviderTokens} = helpers;
const project = 'https://project.example.test';
const authorize = project+'/auth/v1/authorize';

test('social initiation redirects to the configured Auth authorize endpoint only',()=>{
  const expected = authorize+'?provider=google&redirect_to=http%3A%2F%2F127.0.0.1%3A3002%2Fauth%2Fcallback';
  assert.equal(oauthAuthorizeUrl(project+'/',expected),expected);
  for (const url of [
    'https://other.example.test/auth/v1/authorize',
    project+'/auth/v1/token',
    authorize+'#misplaced',
    'https://example@project.example.test/auth/v1/authorize',
    'not a URL',
  ]) assert.equal(oauthAuthorizeUrl(project,url),null);
});

test('PKCE exchange passes only Supabase session data to the cookie-writing SDK',async()=>{
  const session = {access_token:'supabase-access',refresh_token:'supabase-refresh',user:{id:'test-user'}};
  const filtered = withoutProviderTokens(project,async()=>Response.json({
    ...session,provider_token:'provider-access',provider_refresh_token:'provider-refresh',
  },{headers:{'Content-Length':'100','Content-Encoding':'gzip'}}));
  const result = await filtered(new Request(project+'/auth/v1/token?grant_type=pkce',{method:'POST'}));
  assert.deepEqual(await result.json(),session);
  assert.equal(result.headers.has('content-length'),false);
  assert.equal(result.headers.has('content-encoding'),false);
});

test('failed Auth exchanges and unrelated responses remain untouched',async()=>{
  const denied = Response.json({code:'flow_state_not_found'},{status:404});
  const settings = Response.json({external:{google:true}});
  const filtered = withoutProviderTokens(project,async url=>String(url).includes('/settings') ? settings : denied);
  assert.equal(await filtered(project+'/auth/v1/settings'),settings);
  assert.equal(await filtered(project+'/auth/v1/token'),denied);
});
