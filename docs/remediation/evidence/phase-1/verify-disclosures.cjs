const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdir, mkdtemp, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { randomUUID, randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const requireApp = createRequire(path.join(process.cwd(), 'package.json'));
const { createClient } = requireApp('@supabase/supabase-js');
const { integrationTarget, loopbackOrigin } = requireApp(
  './tests/accounts-supabase-target.cjs',
);
const { chromium } = require(process.env.AUDIT_PW);

async function main() {
  const target = integrationTarget();
  assert.equal(target?.url, 'https://ryubhqpqfwuwrtyomsmz.supabase.co');
  const url = loopbackOrigin(process.env.AUDIT_URL);
  const stage = process.argv[2];
  assert.ok(['before', 'after'].includes(stage));
  const output = path.resolve('docs/remediation/evidence/phase-1');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.AUDIT_EDGE,
  });
  const admin = createClient(target.url, target.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = 'phase-one-' + randomUUID() + '@example.test';
  const password = randomBytes(28).toString('base64url') + '!A9';
  let user;
  const button = (p, name) =>
    p.getByRole('button', { name, exact: typeof name === 'string' }).first();
  const expectText = async (locator, pattern) => {
    await locator
      .filter({ hasText: pattern })
      .first()
      .waitFor({ state: 'visible', timeout: 7000 });
  };
  async function shot(locator, name) {
    await locator.screenshot({
      type: 'jpeg',
      quality: 84,
      path: path.join(output, stage + '-' + name + '.jpg'),
    });
  }
  async function picture(p, scope) {
    await p.goto(url + '/memory-books' + scope);
    await button(p, /Create a book/).click();
    await p
      .getByLabel('Book title', { exact: true })
      .fill('Fictional stationery');
    await button(p, /Continue/).click();
    await button(p, /Continue/).click();
    await button(p, /Create & edit my book/).click();
    await button(p, 'Photographs').click();
    return p.getByRole('complementary', { name: 'photos collection' });
  }
  try {
    const profile = await mkdtemp(path.join(tmpdir(), 'dt-phase1-guest-'));
    const openGuest = () =>
      chromium.launchPersistentContext(profile, {
        executablePath: process.env.AUDIT_EDGE,
        viewport: { width: 1440, height: 960 },
        acceptDownloads: true,
      });
    const guest = await openGuest();
    try {
      const p = await guest.newPage();
      p.setDefaultTimeout(9000);
      await p.goto(url);
      await expectText(
        p.locator('.dt-prototype-banner'),
        stage === 'before'
          ? /UNSAVED DEMO/
          : /GUEST KEEPSAKES SAVE IN THIS BROWSER/i,
      );
      await shot(p.locator('.dt-prototype-banner'), 'home');
      if (stage === 'after') {
        await button(p, /Create something/).click();
        const dialog = p.getByRole('dialog');
        await expectText(dialog, /clearing browser data can remove/i);
        assert.equal(
          await dialog
            .getByRole('link', { name: 'Storage and backups' })
            .getAttribute('href'),
          '/how-it-works#storage-and-backups',
        );
        await shot(dialog, 'home-create');
        await dialog.getByRole('link', { name: 'Storage and backups' }).click();
        await expectText(p.locator('#storage-and-backups'), /Export tree/);
        await p.setViewportSize({ width: 390, height: 844 });
        await p.goto(url);
        await button(p, 'Create').click();
        await expectText(
          p.getByRole('dialog'),
          /clearing browser data can remove/i,
        );
        await shot(p.getByRole('dialog'), 'home-create-390');
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
          0,
        );
        await p.setViewportSize({ width: 1440, height: 960 });
      }
      const guestPictures = await picture(p, '');
      await expectText(
        guestPictures,
        stage === 'before'
          ? /kept only on this device/
          : /saves in this browser/i,
      );
      await shot(guestPictures, 'guest-book');
      if (stage === 'after') {
        await p
          .getByRole('status')
          .filter({ hasText: 'Saved on this device' })
          .waitFor();
        await p.getByText('Book options', { exact: true }).click();
        const pending = p.waitForEvent('download');
        await button(p, 'Export backup').click();
        const downloaded = JSON.parse(
          await readFile(await (await pending).path(), 'utf8'),
        );
        assert.equal(downloaded.title, 'Fictional stationery');
        assert.equal(downloaded.pages.length, 2);
      }
    } finally {
      await guest.close();
    }
    if (stage === 'after') {
      const reopened = await openGuest();
      try {
        const p = await reopened.newPage();
        await p.goto(url + '/memory-books');
        await button(p, 'Read Fictional stationery').waitFor({ timeout: 9000 });
      } finally {
        await reopened.close();
      }
    }

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Fictional Phase 1 reviewer' },
    });
    assert.ok(!created.error && created.data.user.email === email);
    user = created.data.user;
    const mine = await browser.newContext({
      viewport: { width: 1440, height: 960 },
    });
    const q = await mine.newPage();
    q.setDefaultTimeout(9000);
    await q.goto(url + '/login');
    await q.getByLabel('Email address').fill(email);
    await q.getByLabel('Password', { exact: true }).fill(password);
    await button(q, 'Sign in').click();
    await q.waitForURL('**/welcome');
    await button(q, 'Enter My Space').click();
    await q.waitForURL('**/my-space');
    for (const [route, name] of [
      ['/letters', 'letters'],
      ['/memory-tree', 'tree'],
    ]) {
      await q.goto(url + route + '?space=mine');
      await expectText(
        q.locator('.dt-prototype-banner'),
        stage === 'before' ? /ON THIS DEVICE/ : /PRIVATE IN MY SPACE/i,
      );
      await shot(q.locator('.dt-prototype-banner'), 'cloud-' + name);
      if (stage === 'after' && name === 'tree') {
        await button(q, 'Plant a tree').click();
        await q.getByLabel('Tree name').fill('Fictional tree');
        await q.getByLabel('When your story began').fill('2020-02-29');
        await button(q, 'Plant this tree').click();
        await button(q, 'Add a memory').click();
        const dialog = q.getByRole('dialog');
        await expectText(dialog, /Photographs save privately in My Space/);
        await shot(dialog, 'cloud-tree-photo');
      }
      if (stage === 'after' && name === 'letters') {
        await button(q, /Write a letter/).click();
        await button(q, 'Extras').click();
        await expectText(
          q.getByText(/Attachments save privately in My Space/),
          /Attachments save privately in My Space/,
        );
        await q.getByText('Voice recording', { exact: true }).click();
        await expectText(
          q.getByText(/Recordings save privately in My Space/),
          /Recordings save privately in My Space/,
        );
        await shot(
          q.getByText('Photograph & drawing', { exact: true }).locator('..'),
          'cloud-letter-photo',
        );
        await q.goto(url + '/letters?space=mine');
        await button(q, 'Letters to Tomorrow').click();
        await button(q, 'Write a Letter to Tomorrow').click();
        // The timed letter's settings should distinguish opening from delivery.
        await expectText(
          q.getByText(/does not send it automatically/),
          /does not send it automatically/,
        );
      }
    }
    const cloudPictures = await picture(q, '?space=mine');
    await expectText(
      cloudPictures,
      stage === 'before'
        ? /kept only on this device/
        : /saves privately in My Space/i,
    );
    await shot(cloudPictures, 'cloud-book');
    if (stage === 'after') {
      await q.setViewportSize({ width: 390, height: 844 });
      await cloudPictures.waitFor({ state: 'hidden' });
      await button(q, 'Photographs').click();
      await expectText(cloudPictures, /saves privately in My Space/i);
      await shot(cloudPictures, 'cloud-book-390');
      assert.equal(
        await q.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        0,
      );
    }
    console.log(stage + ' screenshots and disclosure assertions passed');
  } finally {
    await browser.close();
    if (user) {
      const checked = await admin.auth.admin.getUserById(user.id);
      assert.equal(checked.data?.user?.email, email);
      assert.ok(
        !(await admin.rpc('dt_begin_delete', { actor: user.id })).error,
      );
      assert.ok(!(await admin.auth.admin.deleteUser(user.id)).error);
    }
  }
}
main().catch((error) => {
  console.error(
    'Phase 1 browser check stopped:',
    error.message.split('\n').slice(0, 5).join(' ').slice(0, 430),
  );
  process.exitCode = 1;
});
