const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');

const { DT_TEST_SUPABASE_URL: supabase, DT_TEST_SUPABASE_SECRET: secret } = process.env;
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
let stage = 'checking the local environment';

function localOrigin(value) {
  const url = new URL(value);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Use a disposable loopback stack.');
  return url.origin;
}

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

async function main() {
  if (!supabase || !secret) {
    console.log('Skipped authenticated browser verification. Configure a disposable local Supabase stack and Mailpit.');
    return;
  }
  for (const address of [app, inbox, supabase]) localOrigin(address);
  // Run this test from the same environment as the Next.js server.
  const { loadEnvConfig } = require('@next/env');
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ''), localOrigin(supabase),
    'Point the Next.js preview at the disposable Supabase project before running this test.');
  assert.equal(process.env.DEAR_TOMORROW_APP_URL, localOrigin(app),
    'Use the same origin for the Next.js app and browser test.');

  const { createClient } = require('@supabase/supabase-js');
  const { chromium } = require(process.env.ACCOUNTS_PLAYWRIGHT || 'playwright');
  const admin = createClient(supabase, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.equal((await admin.auth.admin.listUsers({ page:1, perPage:1 })).error, null, 'Local Auth admin should be available.');
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
  try {
    const [a, b] = await Promise.all([profile(1440,1000),profile(390,844)]);
    for (const [index, page] of [a,b].entries()) {
      stage = `signup and confirming fictional account ${index+1}`;
      const account = accounts[index];
      await page.goto(app + '/signup');
      await page.getByLabel('Display name').fill(name);
      await page.getByLabel('Email address').fill(account.email);
      await page.getByLabel('Password', {exact:true}).fill(account.password);
      await page.getByRole('button', {name:'Create account', exact:true}).click();
      await page.waitForURL('**/login?message=verification');
      assert.equal(await sessionId(page), null);
      await page.goto(await emailLink(account.email, 'email'));
      await page.waitForURL('**/welcome');
      account.id = await sessionId(page);
      assert.ok(account.id, 'A confirmed account should have a session');
      await page.getByRole('button', {name:'Enter My Space'}).click();
      await page.waitForURL('**/my-space');
      await page.reload();
      assert.equal(await sessionId(page), account.id);
      await page.goto(app + '/settings');
      account.code = await page.locator('.dt-account-id-card code').innerText();
      assert.match(account.code, /^[2-9A-H]{8}(?:-[2-9A-H]{8}){2}$/);
    }
    assert.notEqual(accounts[0].code, accounts[1].code);

    stage = 'copying a permanent ID and saving a profile update';
    await a.context().grantPermissions(['clipboard-read','clipboard-write'], {origin:localOrigin(app)});
    await a.getByRole('button', {name:'Copy your Dear Tomorrow ID'}).click();
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

    stage = 'saving a Memory Book through the cloud editor';
    await a.goto(app + '/my-space');
    await a.getByRole('link', {name:/Make a Memory Book/}).click();
    await a.waitForURL('**/memory-books?space=mine');
    await a.getByRole('button', {name:/Create a book/}).click();
    await a.getByLabel('Book title').fill(title);
    await a.getByRole('button', {name:/Continue/}).click();
    await a.getByRole('button', {name:/Continue/}).click();
    await a.getByRole('button', {name:/Create & edit my book/}).click();
    await a.getByRole('status').filter({hasText:'Saved to My Space'}).waitFor();
    await a.goto(app + '/my-space');
    await a.getByRole('link', {name:new RegExp('Open '+title)}).click();
    await a.getByRole('button', {name:'Share with my partner'}).click();
    await a.getByRole('button', {name:'Keep private'}).waitFor();
    const memoryId = new URL(a.url()).pathname.split('/').pop();
    const shared = app + '/our-space/memory/' + memoryId;
    await b.goto(shared);
    await b.getByRole('button', {name:'Open '+title, exact:true}).click();
    await b.getByRole('button', {name:'Close book', exact:true}).waitFor();

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

    stage = 'revoking access by disconnecting';
    await a.goto(app + '/settings');
    await a.getByText('Disconnect from '+name,{exact:true}).click();
    await a.getByRole('button', {name:'Confirm disconnect'}).click();
    await a.waitForURL('**/settings?message=saved');
    const unavailable = await b.request.post(app + '/api/private-space', {
      headers:{origin:localOrigin(app),'x-dear-account':accounts[1].id},
      data:{action:'read',document:memoryId},
    });
    assert.equal(unavailable.status(),404);

    stage = 'signing out and resetting a password through Mailpit';
    await b.goto(app + '/settings');
    await b.getByRole('main').getByRole('button', {name:'Sign out',exact:true}).click();
    await b.waitForURL(app+'/');
    await b.goto(app + '/settings');
    await b.waitForURL('**/login');
    await b.goto(app + '/forgot-password');
    await b.getByLabel('Email address').fill(accounts[1].email);
    await b.getByRole('button', {name:'Send recovery link'}).click();
    await b.waitForURL('**/forgot-password?message=recovery');
    await b.goto(await emailLink(accounts[1].email, 'recovery'));
    await b.waitForURL('**/reset-password');
    accounts[1].password = password();
    await b.getByLabel('New password').fill(accounts[1].password);
    await b.getByRole('button', {name:'Save new password'}).click();
    await b.waitForURL('**/login?message=changed');
    await signIn(b,accounts[1]);
    console.log('Verified real email confirmation, sessions, IDs, pairing, shared cloud Memory Book, disconnect, and password recovery.');
  } finally {
    await browser.close();
    for (const {email,id} of accounts) {
      // Never delete a user unless it matches a fictional address generated by this run.
      if (!id) continue;
      const {data,error} = await admin.auth.admin.getUserById(id);
      if (error || data.user?.email !== email) continue;
      await admin.rpc('dt_begin_delete',{actor:id});
      await admin.auth.admin.deleteUser(id);
    }
  }
}

main().catch(error=>{
  // Browser assertion messages can include a one-time email link or password.
  console.error(`Authenticated browser verification stopped while ${stage} (${error.name}).`);
  process.exitCode=1;
});
