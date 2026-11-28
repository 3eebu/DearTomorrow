const { chromium } = require(process.env.AUDIT_PW);
const path = require('node:path');
const fs = require('node:fs/promises');
const { createRequire } = require('node:module');
const sharp = createRequire(path.join(process.cwd(), 'package.json'))('sharp');
const origin = process.env.AUDIT_URL;
const samples = [
  {
    route: '/',
    selectors: [
      '.dt-hero-copy > .dt-overline',
      '#dt-hero-title > em',
      '.dt-hero-lead',
      '.dt-hero-footnote',
      '.dt-text-action',
      '[class*=_archiveHeading] > span',
      '[class*=_captionTitle]',
      '[class*=_captionNote]',
      'button[class*=_replay]',
    ],
  },
  {
    route: '/letters',
    selectors: ['.lt-box-lid-face > strong', '.lt-box-photo-label'],
  },
  {
    route: '/journey-letters',
    selectors: [
      '.jl-hero-cities > span',
      '.jl-map-hand',
      '.jl-hero-art figcaption > span',
      '.jl-hero-art button.jl-link',
    ],
  },
  {
    route: '/signup',
    selectors: [
      '.dt-auth-heading > p',
      '.dt-account-form label',
      '#auth-password-help',
      '.dt-auth-divider',
      '.dt-auth-switch',
      '.dt-auth-letter button[type=submit]',
    ],
  },
  {
    route: '/login',
    selectors: [
      '.dt-account-form label',
      '.dt-auth-recovery',
      '.dt-auth-letter button[type=submit]',
    ],
  },
  {
    route: '/forgot-password',
    selectors: [
      '.dt-account-form label',
      '.dt-auth-heading > p',
      '.dt-auth-letter button[type=submit]',
    ],
  },
  {
    route: '/reset-password',
    selectors: [
      '.dt-account-form label',
      '.dt-auth-heading > p',
      '.dt-auth-letter button[type=submit]',
    ],
  },
];
const lum = (rgb) =>
  rgb
    .slice(0, 3)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
const color = (x) => x.match(/[\d.]+/g)?.map(Number);
function contrast(a, b) {
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const toHex = (rgb) =>
  '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.AUDIT_EDGE,
  });
  const output = [];
  try {
    for (const width of [390, 1440]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      for (const sample of samples) {
        await page.goto(origin + sample.route);
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({
          content: 'html { scroll-behavior: auto !important; }',
        });
        for (const selector of sample.selectors) {
          const el = page.locator(selector).first();
          if (!(await el.isVisible())) continue;
          await el.evaluate((e) =>
            e.scrollIntoView({ block: 'center', behavior: 'instant' }),
          );
          await page.waitForTimeout(45);
          const painted = await page.screenshot({ animations: 'disabled' });
          const original = await el.evaluate((e) => {
            const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
            let t;
            const raw = [];
            while ((t = walker.nextNode()))
              if (
                t.data.trim() &&
                !t.parentElement.closest('svg,[aria-hidden=true]')
              ) {
                const range = new Range();
                range.selectNodeContents(t);
                const style = getComputedStyle(t.parentElement);
                raw.push({
                  fg: style.color,
                  size: parseFloat(style.fontSize),
                  weight: parseInt(style.fontWeight),
                  boxes: [...range.getClientRects()].map((r) => [
                    r.x,
                    r.y,
                    r.width,
                    r.height,
                  ]),
                });
              }
            e.dataset.paperContrastProbe = 'true';
            return raw;
          });
          const style = await page.addStyleTag({
            content:
              '[data-paper-contrast-probe],[data-paper-contrast-probe] * {-webkit-text-fill-color:transparent !important;text-shadow:none !important;}',
          });
          const buf = await page.screenshot({ animations: 'disabled' });
          await style.evaluate((n) => n.remove());
          await el.evaluate((e) => delete e.dataset.paperContrastProbe);
          const { data, info } = await sharp(buf)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          const mask = await sharp(painted).removeAlpha().raw().toBuffer();
          for (const group of original) {
            const fg = color(group.fg);
            if (!fg || fg.length !== 3) continue;
            const values = [];
            for (const [x, y, w, h] of group.boxes) {
              for (
                let row = Math.max(0, Math.ceil(y + 2));
                row < Math.min(info.height, Math.floor(y + h - 2));
                row += 2
              ) {
                for (
                  let col = Math.max(0, Math.ceil(x + 1));
                  col < Math.min(info.width, Math.floor(x + w - 1));
                  col += 2
                ) {
                  const i = (row * info.width + col) * info.channels;
                  if (
                    [0, 1, 2].every(
                      (n) => Math.abs(mask[i + n] - data[i + n]) < 20,
                    )
                  )
                    continue;
                  const background = [data[i], data[i + 1], data[i + 2]];
                  values.push({ ratio: contrast(fg, background), background });
                }
              }
            }
            if (!values.length) continue;
            values.sort((a, b) => a.ratio - b.ratio);
            const sample = values[Math.floor(values.length * 0.05)];
            output.push({
              width,
              route: new URL(page.url()).pathname,
              selector,
              foreground: toHex(fg),
              background: toHex(sample.background),
              minimum: Number(values[0].ratio.toFixed(2)),
              p05: Number(sample.ratio.toFixed(2)),
              target:
                group.size >= 24 ||
                (group.weight >= 700 && group.size >= 18.667)
                  ? 3
                  : 4.5,
              pixels: values.length,
            });
          }
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    await fs.writeFile(
      'docs/remediation/evidence/phase-2/painted-surfaces.json',
      JSON.stringify(output, null, 2) + '\n',
    );
  }
  console.log(
    JSON.stringify({
      samples: output.length,
      low: output.filter((r) => r.minimum < r.target),
    }),
  );
}
main().catch((e) => {
  console.error(e.message.split('\n')[0]);
  process.exitCode = 1;
});
