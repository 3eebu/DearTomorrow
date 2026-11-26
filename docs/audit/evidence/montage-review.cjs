const { chromium, webkit } = require(process.env.AUDIT_PW);
const f = require("node:fs/promises"),
  path = require("node:path");
(async () => {
  const out = process.env.AUDIT_EVIDENCE,
    base = process.env.AUDIT_URL,
    result = {};
  const browser = await chromium.launch({
    executablePath: process.env.AUDIT_EDGE,
  });
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: process.env.AUDIT_VIDEO,
      size: { width: 960, height: 600 },
    },
  });
  const p = await c.newPage();
  await p.goto(base);
  const head = p.getByRole("heading", { level: 1 }).first();
  result.headlineOnLoad = await head.isVisible();
  await p.waitForTimeout(3500);
  await p.screenshot({
    path: path.join(out, "screens", "home-settled-1440.jpg"),
    type: "jpeg",
    quality: 75,
  });
  await p.getByRole("button", { name: "Replay the newspaper montage" }).click();
  await p.waitForTimeout(3400);
  await c.close();
  await browser.close();
  const wk = await webkit.launch();
  const ctx = await wk.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  result.webkitDirect = [];
  result.webkitTransition = [];
  let errors = result.webkitDirect;
  page.on("pageerror", (e) =>
    errors.push({
      name: e.name.split("://")[0],
      type: e.message.includes("access control")
        ? "access control"
        : e.message.includes("cancel")
          ? "cancellation"
          : e.message.includes("Fetch")
            ? "fetch"
            : "other",
    }),
  );
  await page.goto(base + "/journey-letters");
  await page.waitForTimeout(1300);
  result.directHeading = await page.locator("h1").first().innerText();
  errors = result.webkitTransition;
  for (const r of ["/letters", "/journey-letters", "/memory-books"]) {
    await page.goto(base + r, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);
  }
  await wk.close();
  await f.writeFile(
    path.join(out, "montage-and-webkit.json"),
    JSON.stringify(result, null, 2),
  );
})().catch((e) => {
  console.error(e.message.split("\n")[0]);
  process.exitCode = 1;
});
