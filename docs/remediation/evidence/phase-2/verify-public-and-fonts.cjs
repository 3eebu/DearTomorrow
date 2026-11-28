const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, firefox, webkit } = require(process.env.AUDIT_PW);
const origin = process.env.AUDIT_URL;
const directory = path.resolve('docs/remediation/evidence/phase-2');
const routes = [
  '/',
  '/about',
  '/how-it-works',
  '/letters',
  '/journey-letters',
  '/memory-books',
  '/memory-tree',
  '/signup',
  '/login',
  '/forgot-password',
  '/reset-password',
];
const widths = [320, 375, 390, 768, 820, 1280, 1440, 1920];
const phase = process.argv[2];
const engine = process.argv[3] ?? 'edge';
const fast = process.argv.includes('--fast');
const axe = process.env.AUDIT_AXE;
const slug = (route) => (route === '/' ? 'home' : route.slice(1));

async function scan(page) {
  await page.addScriptTag({ path: axe });
  return page.evaluate(async () => {
    const rules = await window.axe.run({
      runOnly: ['color-contrast', 'label-content-name-mismatch'],
    });
    return {
      failures: rules.violations.flatMap(({ id, nodes }) =>
        nodes.map((n) => ({
          rule: id,
          target: n.target,
          message: n.failureSummary?.split('\n').at(-1)?.trim(),
          metrics: n.any.find((c) => c.data?.contrastRatio)?.data,
        })),
      ),
      manual: rules.incomplete.flatMap(({ id, nodes }) =>
        nodes.map((n) => ({
          rule: id,
          target: n.target,
          reason: n.any[0]?.data?.messageKey,
        })),
      ),
    };
  });
}

async function typography(page, session, fallback = false) {
  const probe = await page.evaluate(async () => {
    await document.fonts.ready;
    const heading = document.querySelector('h1');
    const primary = [...document.querySelectorAll('main a,main button')].find(
      (e) =>
        e.getBoundingClientRect().height > 30 &&
        /Write|Sign|Start|Create|Explore/i.test(e.innerText),
    );
    const wrap = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const lines = new Set();
      let node;
      while ((node = text.nextNode())) {
        const range = new Range();
        range.selectNodeContents(node);
        for (const box of range.getClientRects())
          if (box.width > 0) lines.add(Math.round(box.top / 3) * 3);
      }
      return {
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        lines: lines.size,
      };
    };
    const c = document.createElement('canvas').getContext('2d');
    const sample = 'Dear Tomorrow, every little thing.';
    function width(font) {
      c.font = '46px ' + font;
      return Number(c.measureText(sample).width.toFixed(2));
    }
    return {
      heading: wrap(heading),
      primary: wrap(primary),
      overflow: document.documentElement.scrollWidth - innerWidth,
      computed: heading ? getComputedStyle(heading).fontFamily : null,
      faces: [...document.fonts]
        .filter((f) => f.status === 'loaded')
        .map((f) => ({ family: f.family, style: f.style })),
      advance: {
        display: width('"Playfair Display", Georgia'),
        georgia: width('Georgia'),
        sans: width('"DM Sans", Arial'),
        arial: width('Arial'),
      },
      fonts: performance
        .getEntriesByType('resource')
        .filter((r) => /\.woff2(?:$|\?)/.test(r.name))
        .map((r) => ({
          path: new URL(r.name).pathname,
          bytes: r.encodedBodySize,
        })),
      cls:
        window.layoutShiftTotal === undefined
          ? null
          : Number(window.layoutShiftTotal.toFixed(4)),
    };
  });
  if (session) {
    const { root } = await session.send('DOM.getDocument');
    for (const [name, selector] of [
      ['headingFaces', 'h1'],
      [
        'bodyFaces',
        '.info-personal-story p, .dt-hero-copy p, .dt-auth-form label, main p',
      ],
    ]) {
      const { nodeId } = await session.send('DOM.querySelector', {
        nodeId: root.nodeId,
        selector,
      });
      if (nodeId)
        probe[name] = (
          await session.send('CSS.getPlatformFontsForNode', { nodeId })
        ).fonts;
    }
  }
  if (fallback) probe.fallback = true;
  return probe;
}

async function main() {
  assert.ok(['before', 'after'].includes(phase));
  const browser = await { edge: chromium, firefox, webkit }[engine].launch(
    engine === 'edge' ? { executablePath: process.env.AUDIT_EDGE } : {},
  );
  await fs.mkdir(directory, { recursive: true });
  const results = {
    phase,
    engine,
    version: browser.version(),
    scans: [],
    layout: [],
    type: [],
    navigation: {},
  };
  const shot = async (page, name) =>
    page.screenshot({
      type: 'jpeg',
      quality: 76,
      path: path.join(directory, phase + '-' + name + '.jpg'),
    });
  const visit = async (page, route) => {
    await page.goto(origin + route, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
  };
  try {
    if (engine === 'edge') {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      for (const route of routes) {
        await visit(page, route);
        results.scans.push({ route, width: 390, ...(await scan(page)) });
        if (!fast && ['/', '/about', '/memory-books', '/login'].includes(route))
          await shot(page, slug(route) + '-390');
      }
      if (!fast) {
        for (const width of [
          1440,
          ...(phase === 'after' ? widths.filter((w) => w !== 1440) : []),
        ]) {
          await page.setViewportSize({
            width,
            height: width < 1000 ? 900 : 980,
          });
          for (const route of routes) {
            await visit(page, route);
            results.layout.push({ width, route, ...(await typography(page)) });
            if (width === 1440) {
              results.scans.push({ route, width, ...(await scan(page)) });
              if (['/', '/about', '/memory-books', '/login'].includes(route))
                await shot(page, slug(route) + '-1440');
            }
          }
        }
      }
      if (phase === 'after' && !fast) {
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          for (const route of ['/privacy', '/terms']) {
            await visit(page, route);
            const heading = await page.locator('h1').count();
            assert.equal(heading, 1);
            results.scans.push({
              route,
              width,
              supplemental: true,
              ...(await scan(page)),
            });
          }
        }
      }
      await context.close();
    }
    if (!fast) {
      for (const width of [390, 1440]) {
        const profile = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: 'reduce',
        });
        const p = await profile.newPage();
        await p.addInitScript(() => {
          try {
            if (
              !PerformanceObserver.supportedEntryTypes.includes('layout-shift')
            )
              return;
            window.layoutShiftTotal = 0;
            new PerformanceObserver((list) => {
              for (const e of list.getEntries())
                if (!e.hadRecentInput) window.layoutShiftTotal += e.value;
            }).observe({ type: 'layout-shift', buffered: true });
          } catch {
            window.layoutShiftTotal = undefined;
          }
        });
        const cdp = engine === 'edge' ? await profile.newCDPSession(p) : null;
        if (cdp) {
          await cdp.send('DOM.enable');
          await cdp.send('CSS.enable');
          await cdp.send('Network.enable');
          await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        }
        for (const route of ['/about', '/', '/login']) {
          await visit(p, route);
          await p.waitForTimeout(200);
          results.type.push({ width, route, ...(await typography(p, cdp)) });
        }
        await profile.close();
        if (phase === 'after') {
          const blocked = await browser.newContext({
            viewport: { width, height: 900 },
            reducedMotion: 'reduce',
          });
          await blocked.route('**/*.woff2', (route) => route.abort());
          const fallbackPage = await blocked.newPage();
          const probe =
            engine === 'edge'
              ? await blocked.newCDPSession(fallbackPage)
              : null;
          if (probe) {
            await probe.send('DOM.enable');
            await probe.send('CSS.enable');
          }
          for (const route of ['/about', '/', '/login']) {
            await visit(fallbackPage, route);
            results.type.push({
              width,
              route,
              ...(await typography(fallbackPage, probe, true)),
            });
          }
          await blocked.close();
        }
      }
    }
    console.log(
      JSON.stringify({
        engine,
        phase,
        scans: results.scans.map((s) => [
          s.route,
          s.width,
          s.failures.length,
          s.manual.length,
        ]),
        overflows: results.layout
          .filter((i) => i.overflow)
          .map((i) => [i.route, i.width, i.overflow]),
      }),
    );
  } finally {
    await browser.close();
    await fs.writeFile(
      path.join(
        directory,
        phase + '-' + engine + (fast ? '-fast' : '') + '.json',
      ),
      JSON.stringify(results, null, 2) + '\n',
    );
  }
}
main().catch((e) => {
  console.error(e.message.split('\n')[0]);
  process.exitCode = 1;
});
