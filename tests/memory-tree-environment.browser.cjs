const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.MEMORY_TREE_PLAYWRIGHT || 'playwright');

const base = process.env.MEMORY_TREE_URL || 'http://127.0.0.1:3002';
const dev = process.env.MEMORY_TREE_ENVIRONMENT === 'development';
const screenshots = process.env.MEMORY_TREE_SCREENSHOTS;
const button = (page, name) => page.getByRole('button', { name, exact: true });
const landscape = page => page.getByRole('group', { name: 'Memory Tree landscape' });

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.MEMORY_TREE_CHROMIUM, args: ['--disable-webgl'] });
  const errors = [];
  try {
    if (screenshots) await fs.mkdir(screenshots, { recursive: true });
    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 800], [820, 1180], [390, 844], [320, 760]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 600,
        isMobile: width < 600, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      page.on('pageerror', error => errors.push(error.message));
      assert.equal((await page.goto(base + '/memory-tree')).status(), 200);
      const frame = landscape(page);
      await frame.waitFor();
      await frame.locator('img').evaluate(img => img.decode());
      assert.equal(await button(page, 'Landscape').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.getByText('Environment studio', { exact: true }).count(), 0);
      const image = await frame.evaluate(el => {
        const img = el.querySelector('img');
        const crop = el.getBoundingClientRect(), world = img.getBoundingClientRect();
        const asset = performance.getEntriesByName(img.currentSrc)[0];
        const style = getComputedStyle(el);
        return { asset: new URL(img.currentSrc).pathname.split('/').pop(), width: crop.width, left: crop.left,
          height: crop.height, pixels: [img.naturalWidth, img.naturalHeight], ms: asset?.duration,
          bytes: asset?.encodedBodySize, overflow: document.documentElement.scrollWidth > innerWidth,
          crownFits: world.left + world.width * .17 >= crop.left && world.left + world.width * .81 <= crop.right
            && world.top + world.height * .09 >= crop.top && world.top + world.height * .86 <= crop.bottom,
          mask: getComputedStyle(el.firstElementChild).maskImage.includes('paper-edge.svg'),
          unframed: style.outlineStyle === 'none' && style.borderRadius === '0px' && style.boxShadow === 'none',
          aspect: world.width / world.height, animations: el.getAnimations({subtree:true}).length };
      });
      assert.equal(image.asset, width <= 600 ? 'master-960.webp' : 'master.webp');
      assert.ok(image.crownFits && !image.overflow);
      assert.equal(image.width, width);
      assert.equal(image.left, 0);
      assert.ok(image.mask && image.unframed);
      if (width >= 1280) assert.ok(image.height / height >= .65 && image.height / height <= .84);
      assert.ok(Math.abs(image.aspect - 1672 / 941) < .002);
      assert.equal(image.animations, 0);
      console.log(width + 'px landscape:', JSON.stringify(image));
      if (width <= 390) {
        const rows = await page.getByRole('navigation', {name:'Memory Tree views'}).getByRole('button')
          .evaluateAll(items => items.map(item => item.getBoundingClientRect().top));
        assert.equal(new Set(rows).size, 1);
      }
      if (screenshots && !dev) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(screenshots, 'landscape-' + width + '.png'), fullPage: true });
        await frame.screenshot({ path: path.join(screenshots, 'painting-' + width + '.png') });
      }
      await button(page, 'Tree').click();
      await page.getByRole('group', { name: 'Earth ready for a seed' }).waitFor();
      await button(page, 'Landscape').click();
      await frame.waitFor();
      await button(page, 'Explore the example').click();
      await page.getByRole('group', { name: 'Illustrated Memory Tree' }).waitFor();
      const selected = await page.locator('.mt-ink-leaf[aria-pressed=true]').getAttribute('data-slot');
      await button(page, 'Landscape').click();
      await button(page, 'Calendar').click();
      await page.getByRole('region', { name: 'Calendar and day memories' }).waitFor();
      await button(page, 'Find this leaf ↗').click();
      assert.equal(await page.locator('.mt-ink-leaf:focus').getAttribute('data-slot'), selected);
      await page.close();
    }

    const page = await browser.newPage();
    await page.goto(base + '/memory-tree?studio=environment');
    await landscape(page).waitFor();
    const studio = page.locator('details').filter({has:page.locator('summary', {hasText:'Environment studio'})});
    if (dev) {
      await studio.locator('summary').click();
      await studio.getByLabel('Show anchor points').check();
      assert.equal(await landscape(page).locator('[data-anchor]').count(), 7);
      await studio.getByLabel('Approved master painting').uncheck();
      assert.equal(await landscape(page).locator('img').count(), 0);
      await studio.getByLabel('Approved master painting').check();
      await landscape(page).locator('img').evaluate(img => img.decode());
      await studio.getByLabel('Use local time').uncheck();
      await studio.getByLabel(/Time of day/).fill('360');
      assert.ok(await studio.getByText('Time of day · 06:00').isVisible());
      await studio.getByLabel(/Wind strength/).fill('32');
      await studio.getByLabel(/Wind direction/).fill('150');
      await studio.getByLabel(/Cloud speed/).fill('40');
      await studio.getByLabel(/Tree movement/).fill('35');
      await studio.getByLabel(/Grass movement/).fill('65');
      await studio.getByLabel('Growth stage').selectOption('Sapling');
      await studio.getByLabel('Finch behavior').selectOption('Landing');
      assert.ok(await studio.getByText(/Art targets: Sapling · Landing/).isVisible());
      assert.equal(await studio.locator('input[type=checkbox]:disabled').count(), 17);
      await button(studio, 'Pause preview').click();
      assert.ok(await button(studio, 'Measure frame intervals').isDisabled());
      await button(studio, 'Resume preview').click();
      await button(studio, 'Measure frame intervals').click();
      await studio.getByRole('status').filter({hasText:'p95'}).waitFor();
      console.log('Development inspector sample:', await studio.getByRole('status').textContent());
      if (screenshots) await studio.screenshot({path:path.join(screenshots,'development-studio.png')});
    } else {
      assert.equal(await studio.count(), 0);
      assert.equal(await page.getByLabel('Use local time').count(), 0);
      console.log('Inspector absent in production, including opt-in URL.');
    }
    await page.close();

    const broken = await browser.newPage();
    await broken.route('**/memory-tree/environment/*.webp', route => route.abort());
    await broken.goto(base + '/memory-tree');
    await broken.getByRole('status').filter({hasText:'landscape couldn’t load'}).waitFor();
    await button(broken, 'Tree').click();
    await broken.getByRole('group', {name:'Earth ready for a seed'}).waitFor();
    await broken.close();
    assert.deepEqual(errors, []);
    console.log('Landscape views, crop registration, responsive assets, focus return and missing-art recovery passed.');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
