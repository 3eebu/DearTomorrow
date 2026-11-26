const { chromium } = require(process.env.AUDIT_PW);
const fs = require("node:fs/promises"),
  path = require("node:path");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.AUDIT_EDGE });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(process.env.AUDIT_URL + "/about");
  await p.evaluate(() => document.fonts.ready);
  const art = p.locator("[data-watercolor-motion]");
  await art.scrollIntoViewIfNeeded();
  const status = () =>
    art.evaluate((a) => ({
      state: a.getAttribute("data-watercolor-motion"),
      animations: a
        .getAnimations({ subtree: true })
        .map((b) => ({
          state: b.playState,
          duration: b.effect.getTiming().duration,
        })),
      staticImageTransform: getComputedStyle(a.querySelector("image"))
        .transform,
    }));
  const result = { visible: await status() };
  await p.waitForTimeout(28500);
  result.twoCycles = await status();
  await p.setViewportSize({ width: 390, height: 420 });
  await p.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await p.waitForTimeout(400);
  result.offscreen = await status();
  result.offscreen.rect = await art.evaluate((a) => ({
    bottom: a.getBoundingClientRect().bottom,
    viewport: innerHeight,
  }));
  await p.emulateMedia({ reducedMotion: "reduce" });
  await art.scrollIntoViewIfNeeded();
  result.reduced = await status();
  result.fonts = await p.evaluate(() => ({
    registered: [...document.fonts].map((f) => ({
      family: f.family,
      status: f.status,
    })),
    requested: [
      ...new Set(
        performance
          .getEntriesByType("resource")
          .map((r) => new URL(r.name).hostname),
      ),
    ],
    heading: getComputedStyle(document.querySelector("h1")).fontFamily,
  }));
  const client = await p.context().newCDPSession(p);
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument");
  const { nodeId } = await client.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: "h1",
  });
  result.fonts.rendered = (
    await client.send("CSS.getPlatformFontsForNode", { nodeId })
  ).fonts.map((x) => ({
    family: x.familyName,
    glyphs: x.glyphCount,
    custom: x.isCustomFont,
  }));
  await b.close();
  await fs.writeFile(
    path.join(process.env.AUDIT_EVIDENCE, "watercolor-fonts.json"),
    JSON.stringify(result, null, 2),
  );
})().catch((e) => {
  console.error(e.message.split("\n")[0]);
  process.exitCode = 1;
});
