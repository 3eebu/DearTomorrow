const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const requireApp = createRequire(path.join(process.cwd(), 'package.json'));
const { createClient } = requireApp('@supabase/supabase-js');
const { integrationTarget, loopbackOrigin } = requireApp(
  './tests/accounts-supabase-target.cjs',
);
const { chromium } = require(process.env.AUDIT_PW);
const phase = process.argv[2],
  axe = process.env.AUDIT_AXE,
  directory = path.resolve('docs/remediation/evidence/phase-2');
async function main() {
  const target = integrationTarget();
  assert.equal(target?.url, 'https://ryubhqpqfwuwrtyomsmz.supabase.co');
  const origin = loopbackOrigin(process.env.AUDIT_URL);
  const admin = createClient(target.url, target.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = 'phase2-' + randomUUID() + '@example.test',
    password = randomBytes(29).toString('base64url') + '!A9';
  let user;
  const browser = await chromium.launch({
    executablePath: process.env.AUDIT_EDGE,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const p = await context.newPage();
  p.setDefaultTimeout(9000);
  const results = { phase, scans: [], actions: [], zoom: [] };
  const btn = (name, page = p) =>
    page.getByRole('button', { name, exact: typeof name === 'string' }).first();
  async function go(route) {
    await p.goto(origin + route);
    await p.evaluate(() => document.fonts.ready);
  }
  async function scan(state) {
    await p.addScriptTag({ path: axe });
    const result = await p.evaluate(async () => {
      const r = await axe.run({
        runOnly: ['color-contrast', 'label-content-name-mismatch'],
      });
      return {
        failures: r.violations.flatMap((v) =>
          v.nodes.map((n) => ({
            rule: v.id,
            target: n.target,
            metrics: n.any.find((c) => c.data?.contrastRatio)?.data,
          })),
        ),
        manual: r.incomplete.flatMap((v) =>
          v.nodes.map((n) => ({
            rule: v.id,
            target: n.target,
            reason: n.any[0]?.data?.messageKey,
          })),
        ),
      };
    });
    results.scans.push({ state, width: p.viewportSize().width, ...result });
  }
  async function studio() {
    await btn(/Create a book/).click();
    await p
      .getByLabel('Book title', { exact: true })
      .fill('Fictional audit book');
    await btn(/Continue/).click();
    await btn(/Continue/).click();
    await btn(/Create & edit my book/).click();
    await p.getByRole('textbox', { name: 'Book title' }).waitFor();
  }
  try {
    await fs.mkdir(directory, { recursive: true });
    if (phase === 'after') {
      for (const [width, route] of [
        [320, '/'],
        [375, '/about'],
        [390, '/journey-letters'],
        [768, '/how-it-works'],
        [820, '/letters'],
        [390, '/memory-books'],
        [390, '/login'],
      ]) {
        await p.setViewportSize({ width, height: 844 });
        await go(route);
        const menu = btn('Menu');
        await menu.focus();
        await p.keyboard.press('Enter');
        const nav = p.getByRole('navigation', { name: 'Primary navigation' });
        assert.equal(await menu.getAttribute('aria-expanded'), 'true');
        const focus = await menu.evaluate((e) => ({
          visible: e.matches(':focus-visible'),
          style: getComputedStyle(e).outlineStyle,
          h: e.getBoundingClientRect().height,
        }));
        assert.ok(focus.visible && focus.style !== 'none' && focus.h >= 44);
        assert.ok(
          (
            await p
              .getByRole('link', { name: 'Dear Tomorrow home' })
              .first()
              .boundingBox()
          ).height >= 44,
        );
        if (route === '/about')
          await p.screenshot({
            type: 'jpeg',
            quality: 75,
            path: path.join(directory, 'after-mobile-menu.jpg'),
          });
        for (const [label, href] of [
          ['Memory Books', '/memory-books'],
          ['Memory Tree', '/memory-tree'],
          ['Letters', '/letters'],
          ['Journey Letters', '/journey-letters'],
        ]) {
          const link = nav.getByRole('link', { name: label, exact: true });
          assert.equal(await link.getAttribute('href'), href);
          assert.ok((await link.boundingBox()).height >= 44);
        }
        await p.keyboard.press('Tab');
        assert.ok(
          await nav.evaluate((e) => e.contains(document.activeElement)),
        );
        await p.keyboard.press('Escape');
        assert.equal(await menu.getAttribute('aria-expanded'), 'false');
        assert.ok(await menu.evaluate((e) => document.activeElement === e));
        await menu.tap();
        await nav
          .getByRole('link', { name: 'Memory Books', exact: true })
          .tap();
        await p.waitForURL('**/memory-books');
        assert.equal(await btn('Menu').getAttribute('aria-expanded'), 'false');
        await p.getByRole('link', { name: 'Dear Tomorrow home' }).first().tap();
        await p.waitForURL(origin + '/');
        results.actions.push({
          route,
          width,
          menu: focus,
          escape: true,
          touchNavigation: true,
          home: true,
        });
      }
      for (const route of ['/', '/about', '/memory-books', '/login']) {
        await p.setViewportSize({ width: 390, height: 844 });
        await go(route);
        const measured = await p.evaluate(() => {
          document.documentElement.style.zoom = '2';
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            heading: document.querySelector('h1')?.getBoundingClientRect()
              .height,
          };
        });
        results.zoom.push({ route, ...measured });
        assert.equal(measured.overflow, 0);
      }
      await p.setViewportSize({ width: 390, height: 844 });
      await go('/');
      const replay = btn('Replay montage');
      assert.ok((await replay.boundingBox()).height >= 44);
      await replay.focus();
      await p.keyboard.press('Enter');
      await p
        .getByText(/Montage replay 1 started/)
        .waitFor({ state: 'attached' });
      results.actions.push({ replay: true });
      await btn('Create').tap();
      const dialog = p.getByRole('dialog');
      await dialog.waitFor();
      for (let i = 0; i < 9; i++) {
        await p.keyboard.press('Tab');
        assert.ok(
          await dialog.evaluate((e) => e.contains(document.activeElement)),
        );
      }
      await p.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.ok(
        await btn('Create').evaluate((e) => document.activeElement === e),
      );
      results.actions.push({ dialogKeyboard: true });
    }
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Fictional Reviewer' },
    });
    assert.ok(!created.error && created.data.user.email === email);
    user = created.data.user;
    await go('/login');
    await p.getByLabel('Email address').fill(email);
    await p.getByLabel('Password', { exact: true }).fill(password);
    await btn('Sign in').click();
    await p.waitForURL('**/welcome');
    await scan('welcome');
    await btn('Enter My Space').click();
    await p.waitForURL('**/my-space');
    if (phase === 'after') {
      await go('/');
      const account = p.getByRole('navigation', { name: 'Account' });
      await account.getByText('Fictional Reviewer', { exact: true }).tap();
      await account.getByRole('link', { name: 'Settings', exact: true }).tap();
      await p.waitForURL('**/settings');
      assert.ok(
        !(await account
          .getByRole('link', { name: 'Settings', exact: true })
          .isVisible()),
      );
      results.actions.push({ accountSettingsFromHome: true });
    }
    for (const width of [390, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      for (const route of [
        '/my-space',
        '/our-space',
        '/connect',
        '/settings',
        '/memory-books?space=mine',
      ]) {
        await go(route);
        await scan(route);
        if (route === '/my-space') {
          const account = p.getByRole('navigation', { name: 'Account' });
          await account
            .getByRole('link', { name: 'My Space', exact: true })
            .waitFor();
          await account
            .getByText('Fictional Reviewer', { exact: true })
            .click();
          assert.ok(
            await account
              .getByRole('link', { name: 'Settings', exact: true })
              .isVisible(),
          );
          await account
            .getByText('Fictional Reviewer', { exact: true })
            .click();
        }
      }
      if (width === 390) {
        await studio();
      } else {
        await btn('Studio ↗').first().click();
      }
      await p
        .getByRole('status')
        .filter({ hasText: 'Saved to My Space' })
        .waitFor();
      await scan('Book Studio');
      await btn('Photographs').click();
      await scan('Book Studio photographs');
      await btn('Little Surprises').click();
      await scan('Book Studio surprises');
      await p.screenshot({
        type: 'jpeg',
        quality: 75,
        path: path.join(directory, phase + '-studio-' + width + '.jpg'),
      });
      if (phase === 'after') {
        await btn('Back to library').click();
        await btn(/Read Fictional audit book/).click();
        await btn(/Open Fictional audit book/).waitFor();
        assert.equal(await btn('Menu').count(), 0);
        await btn('← Library').click();
        await btn('Menu').waitFor();
        results.actions.push({ immersiveReaderExit: true, width });
      }
    }
  } finally {
    await browser.close();
    if (user) {
      const confirmed = await admin.auth.admin.getUserById(user.id);
      assert.equal(confirmed.data?.user?.email, email);
      assert.ok(
        !(await admin.rpc('dt_begin_delete', { actor: user.id })).error,
      );
      assert.ok(!(await admin.auth.admin.deleteUser(user.id)).error);
    }
    await fs.writeFile(
      path.join(directory, phase + '-auth-nav.json'),
      JSON.stringify(results, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        phase,
        scans: results.scans.map((r) => [
          r.state,
          r.width,
          r.failures.length,
          r.manual.length,
        ]),
        actions: results.actions.length,
        zoom: results.zoom,
      }),
    );
  }
}
main().catch((e) => {
  console.error(e.message.split('\n')[0]);
  process.exitCode = 1;
});
