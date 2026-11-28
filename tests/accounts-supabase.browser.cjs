const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { integrationTarget, loopbackOrigin:localOrigin } = require('./accounts-supabase-target.cjs');

const app = process.env.ACCOUNTS_URL || 'http://127.0.0.1:3002';
const inbox = process.env.DT_TEST_MAILPIT_URL || 'http://127.0.0.1:54324';
const shots = process.env.ACCOUNTS_SHOTS;
const runId = randomUUID().slice(0, 10);
const password = () => randomBytes(24).toString('base64url') + '!a9';
const accounts = [
  { email: `dear-tomorrow-${runId}-a@example.test`, password: password() },
  { email: `dear-tomorrow-${runId}-b@example.test`, password: password() },
];
const name = 'Sam';
const updatedName = 'Sam Rivers';
const title = `A fictional memory book ${runId}`;
const guestTitle = `A private guest book ${runId}`;
const photoName = 'book-photo.png';
const bucketName = 'dear-tomorrow-private';
let stage = 'checking the local environment';

async function emailLink(address, type) {
  const search = inbox + '/api/v1/search?query=' + encodeURIComponent('to:' + address);
  for (let attempt = 0; attempt < 35; attempt++) {
    const response = await fetch(search);
    assert.equal(response.status, 200, 'Mailpit search should be available');
    const { messages = [] } = await response.json();
    for (const entry of messages) {
      const message = await fetch(inbox + '/api/v1/message/' + encodeURIComponent(entry.ID));
      assert.equal(message.status, 200);
      const { HTML = '' } = await message.json();
      for (const [, destination] of HTML.matchAll(/href="([^"]+)"/gi)) {
        const link = new URL(destination.replace(/&amp;/g, '&'), app);
        if (link.pathname !== '/auth/confirm' || link.searchParams.get('type') !== type) continue;
        assert.equal(link.origin, localOrigin(app), 'Mail should link to the local app origin');
        assert.ok(link.searchParams.has('token_hash'), 'The mail should contain a token hash');
        return link.href;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error('The expected email did not arrive in Mailpit.');
}

async function signIn(page, account) {
  await page.goto(app + '/login');
  await page.getByLabel('Email address').fill(account.email);
  await page.getByLabel('Password', {exact:true}).fill(account.password);
  await page.getByRole('button', {name:'Sign in', exact:true}).click();
  await page.waitForURL('**/my-space');
}

async function createBook(page,bookTitle,savedLabel,withPhoto=false) {
  await page.getByRole('button', {name:/Create a book/}).click();
  await page.getByLabel('Book title', {exact:true}).fill(bookTitle);
  await page.getByRole('button', {name:/Continue/}).click();
  await page.getByRole('button', {name:/Continue/}).click();
  await page.getByRole('button', {name:/Create & edit my book/}).click();
  await page.getByRole('status').filter({hasText:savedLabel}).waitFor();
  if (withPhoto) {
    await page.getByRole('button', {name:'Photographs',exact:true}).click();
    await page.locator('input[type=file][accept^="image/jpeg"]').setInputFiles(path.join(__dirname,'fixtures',photoName));
    await page.getByRole('button', {name:'Insert '+photoName,exact:true}).waitFor();
    await page.getByRole('status').filter({hasText:new RegExp('^'+savedLabel+'$')}).waitFor();
  }
}

async function openBookWithPhoto(page,bookTitle) {
  await page.getByRole('button',{name:'Open '+bookTitle,exact:true}).click();
  await page.getByRole('button',{name:'Close book',exact:true}).waitFor();
  const photo=page.getByRole('img',{name:photoName,exact:true}).first();
  await photo.waitFor();
  assert.ok(await photo.evaluate(async img=>{
    await img.decode();
    return img.naturalWidth>0;
  }),'The reader should render a decodable photo.');
}

async function main() {
  const target=integrationTarget();
  if (!target) {
    console.log('Skipped authenticated browser verification. Configure local Supabase and Mailpit or an approved hosted development target.');
    return;
  }
  const {url:supabase,secret,hosted}=target;
  localOrigin(app);
  if (!hosted) localOrigin(inbox);
  // Load the same environment as Next.js using Node's --env-file before running this script.
  assert.ok(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') === supabase,
    'Point the Next.js preview at the approved Supabase project before running this test.');
  assert.ok(process.env.DEAR_TOMORROW_APP_URL === localOrigin(app),
    'Use the same loopback origin for the Next.js app and browser test.');

  const { createClient } = require('@supabase/supabase-js');
  const { chromium } = require(process.env.ACCOUNTS_PLAYWRIGHT || 'playwright');
  const admin = createClient(supabase, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  async function generatedLink(account, type) {
    const confirmation=type==='email';
    const options={redirectTo:app+'/auth/confirm'};
    const {data,error}=await admin.auth.admin.generateLink(confirmation
      ? {type:'signup',email:account.email,password:account.password,options:{...options,data:{display_name:name}}}
      : {type:'recovery',email:account.email,options});
    if (error) {
      console.error('Auth link request failed:', error.name, error.status, error.code);
      throw error;
    }
    assert.ok(data.properties?.hashed_token, 'Supabase should issue a valid test link.');
    if (confirmation) {
      account.id=data.user.id;
      assert.ok(!data.user.email_confirmed_at, 'Generated signup should start unconfirmed.');
    }
    const link=new URL('/auth/confirm',app);
    link.searchParams.set('token_hash',data.properties.hashed_token);
    link.searchParams.set('type',type);
    return link.href;
  }
  const browser = await chromium.launch({ executablePath: process.env.ACCOUNTS_CHROMIUM });
  async function profile(width, height) {
    const context = await browser.newContext({
      viewport: {width,height}, isMobile:width<500, hasTouch:width<500, reducedMotion:'reduce',
    });
    return context.newPage();
  }
  async function sessionId(page) {
    const session = await page.request.get(app + '/api/account-session');
    assert.equal(session.status(),200);
    return (await session.json()).id;
  }
  function privateRequest(page,account,data) {
    return page.request.post(app+'/api/private-space',{
      headers:{origin:localOrigin(app),'x-dear-account':account.id},data,
    });
  }
  async function documentId(page,bookTitle) {
    const href=await page.getByRole('link',{name:new RegExp('Open '+bookTitle)}).getAttribute('href');
    assert.ok(href);
    return href.split('/').pop();
  }
  try {
    const [a, b] = await Promise.all([profile(1440,1000),profile(390,844)]);
    stage = 'saving a guest Memory Book on the device';
    await a.goto(app+'/memory-books');
    await createBook(a,guestTitle,'Saved on this device',true);
    await a.getByRole('button',{name:'Back to library',exact:true}).click();
    await a.getByRole('heading',{name:guestTitle,exact:true}).waitFor();

    for (const [index, page] of [a,b].entries()) {
      stage = `signup and confirming fictional account ${index+1}`;
      const account = accounts[index];
      await page.goto(app + '/signup');
      const submit=page.getByRole('button', {name:'Create account', exact:true});
      await submit.waitFor();
      assert.ok(await submit.isEnabled(), 'Signup should be enabled with Supabase configured.');
      if (!hosted) {
        await page.getByLabel('Display name').fill(name);
        await page.getByLabel('Email address').fill(account.email);
        await page.getByLabel('Password', {exact:true}).fill(account.password);
        await submit.click();
        await page.waitForURL('**/login?message=verification');
      }
      assert.equal(await sessionId(page), null);
      const confirmation=await (hosted ? generatedLink(account,'email') : emailLink(account.email,'email'));
      if (hosted && index===0) {
        await page.goto(app+'/login');
        await page.getByLabel('Email address').fill(account.email);
        await page.getByLabel('Password',{exact:true}).fill(account.password);
        await page.getByRole('button',{name:'Sign in',exact:true}).click();
        await page.waitForURL('**/login?message=credentials');
        assert.equal(await sessionId(page),null);
      }
      await page.goto(confirmation);
      await page.waitForURL('**/welcome');
      const id = await sessionId(page);
      assert.ok(id, 'A confirmed account should have a session');
      if (account.id) assert.equal(id,account.id);
      account.id = id;
      await page.getByRole('button', {name:'Enter My Space'}).click();
      await page.waitForURL('**/my-space');
      await page.reload();
      assert.equal(await sessionId(page), account.id);
      if (index===0) {
        const consumed=await page.request.get(confirmation,{maxRedirects:0});
        assert.equal(new URL(consumed.headers().location,app).searchParams.get('message'),'confirmation');
      }
      await page.goto(app + '/settings');
      account.code = await page.locator('.dt-account-id-card code').innerText();
      assert.match(account.code, /^[2-9A-H]{8}(?:-[2-9A-H]{8}){2}$/);
    }
    assert.notEqual(accounts[0].code, accounts[1].code);

    stage = 'copying a permanent ID and saving a profile update';
    await a.context().grantPermissions(['clipboard-read','clipboard-write'], {origin:localOrigin(app)});
    await a.getByRole('button', {name:'Copy ID',exact:true}).click();
    await a.getByRole('status').filter({hasText:'ID copied.'}).waitFor();
    assert.ok(await a.evaluate(code=>navigator.clipboard.readText().then(text=>text===code),accounts[0].code));
    await a.getByLabel('Display name').fill(updatedName);
    await a.getByRole('button', {name:'Save display name'}).click();
    await a.waitForURL('**/settings?message=saved');
    assert.equal(await a.locator('.dt-account-id-card code').innerText(), accounts[0].code);

    stage = 'requesting and accepting the connection';
    await b.goto(app + '/connect');
    await b.getByLabel('Dear Tomorrow ID').fill(accounts[0].code);
    await b.getByRole('button', {name:'Find account'}).click();
    await b.getByRole('heading', {name:updatedName, exact:true}).waitFor();
    await b.getByRole('button', {name:'Send connection request'}).click();
    await b.getByRole('status').filter({hasText:'is pending'}).waitFor();
    await a.goto(app + '/connect');
    await a.getByRole('button', {name:'Accept', exact:true}).click();
    await a.waitForURL('**/our-space?welcome=1');
    await b.goto(app + '/our-space');
    await b.getByRole('heading', {name:'Shared memories'}).waitFor();

    stage = 'copying a guest book with a photo into My Space without creating duplicates';
    await a.goto(app + '/my-space');
    await a.getByRole('button',{name:'Copy memories to My Space'}).click();
    await a.getByRole('status').filter({hasText:/1 brought into My Space\. 0 already verified\. 0 couldn’t/}).waitFor();
    await a.getByRole('button',{name:'Retry copy'}).click();
    await a.getByRole('status').filter({hasText:/0 brought into My Space\. 1 already verified\. 0 couldn’t/}).waitFor();
    await a.reload();
    const privateId=await documentId(a,guestTitle);
    const guestCopy=await privateRequest(a,accounts[0],{action:'read',document:privateId});
    assert.equal(guestCopy.status(),200);
    const guestCloud=await guestCopy.json();
    assert.equal(guestCloud.title,guestTitle);
    assert.ok(Object.values(guestCloud.payload.assets).some(asset=>asset.name===photoName&&asset.data.startsWith('data:image/')));
    await a.goto(app+'/memory-books');
    await a.getByRole('heading',{name:guestTitle,exact:true}).waitFor();
    await a.getByRole('button',{name:'Read '+guestTitle,exact:true}).click();
    await openBookWithPhoto(a,guestTitle);

    stage = 'saving a Memory Book with a photo through the cloud editor';
    await a.goto(app+'/my-space');
    await a.locator('main a[href="/memory-books?space=mine"]').first().click();
    await a.waitForURL('**/memory-books?space=mine');
    await createBook(a,title,'Saved to My Space',true);
    await a.goto(app + '/my-space');
    await a.getByRole('link', {name:new RegExp('Open '+title)}).click();
    await a.waitForURL('**/my-space/memory/*');
    const memoryId = new URL(a.url()).pathname.split('/').pop();
    assert.equal((await privateRequest(b,accounts[1],{action:'read',document:memoryId})).status(),404);
    assert.equal((await privateRequest(b,accounts[1],{action:'read',document:privateId})).status(),404);
    await a.getByRole('button', {name:'Share with my partner'}).click();
    await a.getByRole('button', {name:'Keep private'}).waitFor();
    stage = 'checking library isolation and rendering the shared photo in the partner reader';
    await b.goto(app+'/our-space');
    await b.getByRole('link',{name:new RegExp('Open '+title)}).waitFor();
    assert.equal(await b.getByRole('link',{name:new RegExp('Open '+guestTitle)}).count(),0);
    assert.equal((await privateRequest(b,accounts[1],{action:'read',document:privateId})).status(),404);
    const shared = app + '/our-space/memory/' + memoryId;
    await b.goto(shared);
    await openBookWithPhoto(b,title);
    const readAsPartner=()=>privateRequest(b,accounts[1],{action:'read',document:memoryId});
    const sharedCopy=await readAsPartner();
    assert.equal(sharedCopy.status(),200);
    const sharedCloud=await sharedCopy.json();
    const asset=Object.values(sharedCloud.payload.assets).find(item=>item.name===photoName);
    assert.ok(asset?.data.startsWith('data:image/'));
    assert.ok(!asset.data.includes('/storage/v1/'),'The image should arrive through the authorized app.');

    stage = 'checking a second login and authenticated viewport layouts';
    const second = await profile(820,1100);
    await signIn(second, accounts[0]);
    await second.getByRole('link', {name:new RegExp('Open '+title)}).waitFor();
    for (const [width,height] of [[1440,1000],[820,1100],[390,844],[320,760]]) {
      await b.setViewportSize({width,height});
      for (const route of ['/settings','/my-space','/our-space']) {
        await b.goto(app + route);
        await b.locator('main h1').waitFor();
        assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth),width,route);
        if (shots) {
          await mkdir(shots,{recursive:true});
          await b.screenshot({path:path.join(shots,`authenticated-${route.slice(1)}-${width}.png`)});
        }
      }
    }

    stage = 'revoking access to the shared book';
    assert.equal((await readAsPartner()).status(),200);
    await a.getByRole('button', {name:'Keep private'}).click();
    await a.getByRole('button', {name:'Share with my partner'}).waitFor();
    assert.equal((await readAsPartner()).status(),404);
    await a.getByRole('button', {name:'Share with my partner'}).click();
    await a.getByRole('button', {name:'Keep private'}).waitFor();
    assert.equal((await readAsPartner()).status(),200);

    stage = 'revoking access by disconnecting';
    await a.goto(app + '/settings');
    await a.getByText('Disconnect from '+name,{exact:true}).click();
    await a.getByRole('button', {name:'Confirm disconnect'}).click();
    await a.waitForURL('**/settings?message=saved');
    assert.equal((await readAsPartner()).status(),404);

    stage = 'signing out and resetting a password';
    await b.goto(app + '/settings');
    await b.getByRole('main').getByRole('button', {name:'Sign out',exact:true}).click();
    await b.waitForURL(app+'/');
    await b.goto(app + '/settings');
    await b.waitForURL('**/login');
    assert.equal((await readAsPartner()).status(),401);
    await b.goto(app + '/forgot-password');
    if (!hosted) {
      await b.getByLabel('Email address').fill(accounts[1].email);
      await b.getByRole('button', {name:'Send recovery link'}).click();
      await b.waitForURL('**/forgot-password?message=recovery');
    }
    await b.goto(await (hosted ? generatedLink(accounts[1],'recovery') : emailLink(accounts[1].email,'recovery')));
    await b.waitForURL('**/reset-password');
    accounts[1].password = password();
    await b.getByLabel('New password',{exact:true}).fill(accounts[1].password);
    await b.getByRole('button', {name:'Save new password'}).click();
    await b.waitForURL('**/login?message=changed');
    await signIn(b,accounts[1]);
    console.log(hosted
      ? 'Hosted Auth confirmation and recovery links verified without sending emails.'
      : 'Local signup and recovery emails arrived through Mailpit and their links worked.');
    console.log('Verified sessions, IDs, pairing, a shared cloud Memory Book and photo, isolation of another book, explicit revocation, disconnect, and new-password login.');
    console.log('Verified guest book and photo migration, preservation of the local copy, and an idempotent retry.');
  } finally {
    await browser.close();
    for (const {email,id} of accounts) {
      // Never delete a user unless it matches a fictional address generated by this run.
      if (!id) continue;
      const {data,error} = await admin.auth.admin.getUserById(id);
      if (error || data.user?.email !== email) throw new Error('Could not confirm fictional test user ownership for cleanup.');
      const bucket=admin.storage.from(bucketName);
      const {data:books,error:listError}=await bucket.list(id+'/books');
      if (listError) throw new Error('Could not list test media for cleanup.');
      for (const book of books) {
        const prefix=id+'/books/'+book.name;
        const {data:files,error:fileError}=await bucket.list(prefix);
        if (fileError) throw new Error('Could not list test attachments for cleanup.');
        if (files.length && (await bucket.remove(files.map(file=>prefix+'/'+file.name))).error) {
          throw new Error('Could not remove test attachments.');
        }
      }
      if (data.user.email_confirmed_at && (await admin.rpc('dt_begin_delete',{actor:id})).error) {
        throw new Error('Could not close the fictional account.');
      }
      if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Could not remove the fictional account.');
    }
  }
}

main().catch(error=>{
  // Browser assertion messages can include a one-time email link or password.
  const location=String(error.stack).match(/accounts-supabase\.browser\.cjs:\d+:\d+/)?.[0];
  const reason=String(error.message).includes('strict mode violation')?'ambiguous locator':error.name;
  console.error(`Authenticated browser verification stopped while ${stage} (${reason}${location?' at '+location:''}).`);
  process.exitCode=1;
});
