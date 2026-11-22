const assert=require('node:assert/strict');
const {chromium}=require(process.env.ACCOUNTS_PLAYWRIGHT||'playwright');
const fs=require('node:fs/promises');
const path=require('node:path');

const base=process.env.ACCOUNTS_URL||'http://127.0.0.1:3002';
const shots=process.env.ACCOUNTS_SHOTS;
const expectGoogle=process.env.ACCOUNTS_EXPECT_GOOGLE==='true';

async function run() {
  const browser=await chromium.launch({executablePath:process.env.ACCOUNTS_CHROMIUM});
  const errors=[];
  try {
    for(const [width,height] of [[1440,1050],[820,1180],[390,844],[320,760]]) {
      const profile=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
      const page=await profile.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      for(const [route,title] of [['/signup','Some memories deserve a place of their own.'],['/login','Welcome back.'],['/forgot-password','Find your way back.']]) {
        const response=await page.goto(base+route,{waitUntil:'networkidle'});
        assert.equal(response.status(),200);
        await page.getByRole('heading',{name:title,exact:true}).waitFor();
        await page.getByLabel('Email address').focus();
        assert.equal(await page.getByLabel('Email address').evaluate(element=>element===document.activeElement),true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
        assert.equal(await page.locator('main input[name=username]').count(),0);
        const google=page.getByRole('button',{name:'Continue with Google',exact:true});
        assert.equal(await google.count(),expectGoogle&&route!=='/forgot-password'?1:0);
        if(expectGoogle&&route!=='/forgot-password') assert.ok(await google.isVisible());
        assert.equal(await page.getByRole('button',{name:'Continue with Apple',exact:true}).count(),0);
        if(shots&&route!=='/forgot-password') {
          await fs.mkdir(shots,{recursive:true});
          await page.evaluate(()=>{document.activeElement?.blur();return document.fonts.ready;});
          await page.screenshot({path:path.join(shots,route.slice(1)+'-'+width+'.png'),fullPage:true});
        }
      }
      for(const route of ['/my-space','/our-space','/settings','/connect','/welcome',
        '/my-space/memory/396cf2e5-0ad2-4cbb-8d48-7587ee731dfe','/our-space/memory/396cf2e5-0ad2-4cbb-8d48-7587ee731dfe',
        '/letters?space=mine','/memory-books?space=mine','/memory-tree?space=mine','/journey-letters?space=mine']) {
        await page.goto(base+route);
        await page.waitForURL('**/login');
      }
      await profile.close();
    }
    const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
    page.on('pageerror',error=>errors.push(error.message));
    for(const route of ['/','/about','/how-it-works','/letters','/memory-books','/memory-tree','/journey-letters']) {
      assert.equal((await page.goto(base+route)).status(),200,route);
      await page.locator('main h1').first().waitFor();
    }
    const unauthorized=await page.request.post(base+'/api/private-space',{
      headers:{origin:new URL(base).origin,'x-dear-account':'396cf2e5-0ad2-4cbb-8d48-7587ee731dfe'},
      data:{action:'scope',kind:'letters',content:true},
    });
    assert.equal(unauthorized.status(),401);
    assert.match(unauthorized.headers()['cache-control'],/no-store/);
    assert.equal((await page.request.post(base+'/api/private-space',{headers:{origin:'https://example.test'},data:{action:'scope'}})).status(),403);
    const callback=await page.request.get(base+'/auth/confirm?type=unsupported&token_hash=fictional&next=https://example.test',{maxRedirects:0});
    assert.equal(new URL(callback.headers().location).origin,new URL(base).origin);
    assert.equal(new URL(callback.headers().location).pathname,'/login');
    for(const [query,message] of [
      ['next=https://example.test','social-expired'],
      ['code=one&code=two','social-expired'],
      ['error=access_denied&error_description=untrusted&next=https://example.test','social-cancelled'],
      ['error_code=server_error','social-failed'],
    ]) {
      const result=await page.request.get(base+'/auth/callback?'+query,{maxRedirects:0});
      assert.equal(result.status(),307);
      assert.equal(result.headers().location,base+'/login?message='+message);
      assert.match(result.headers()['cache-control'],/no-store/);
      assert.equal(result.headers()['referrer-policy'],'no-referrer');
      assert.equal(result.headers()['set-cookie'],undefined);
    }
    const withoutVerifier=await page.request.get(base+'/auth/callback?code=00000000-0000-4000-8000-000000000000',{
      maxRedirects:0,
    });
    assert.equal(withoutVerifier.status(),307);
    assert.match(withoutVerifier.headers().location,/\/login\?message=social-(expired|unavailable)$/);
    assert.equal(new URL(withoutVerifier.headers().location).origin,new URL(base).origin);
    assert.equal(withoutVerifier.headers()['set-cookie'],undefined);
    assert.deepEqual(errors,[]);
    console.log('Guest and authenticated-route boundaries, fixed callback origin, and responsive signup, login, and recovery checked.');
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
