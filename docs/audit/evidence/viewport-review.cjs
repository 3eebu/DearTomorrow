// Run against a local production build with fresh browser profiles.
const { chromium, firefox, webkit } = require(process.env.AUDIT_PW);
const fs = require("node:fs/promises"),
  path = require("node:path");
const out = process.env.AUDIT_EVIDENCE,
  base = process.env.AUDIT_URL;
const axe = process.env.AUDIT_AXE;
const engine = process.argv[2] || "edge";
const widths =
  engine === "edge"
    ? [2560, 1920, 1440, 1280, 1024, 820, 768, 430, 390, 375, 320, 844]
    : [1440, 390];
const paths = [
  "/",
  "/about",
  "/how-it-works",
  "/letters",
  "/journey-letters",
  "/memory-books",
  "/memory-tree",
  "/signup",
  "/login",
  "/forgot-password",
  "/reset-password",
];
const sizes = {
  2560: 1440,
  1920: 1080,
  1440: 900,
  1280: 800,
  1024: 768,
  820: 1180,
  768: 1024,
  430: 932,
  390: 844,
  375: 667,
  320: 640,
  844: 390,
};
async function run() {
  await fs.mkdir(path.join(out, "screens"), { recursive: true });
  const browser = await { edge: chromium, firefox, webkit }[engine].launch(
    engine === "edge" ? { executablePath: process.env.AUDIT_EDGE } : {},
  );
  const rows = [],
    errors = [],
    violations = [],
    requests = new Set(),
    failures = {};
  try {
    for (const width of widths) {
      const ctx = await browser.newContext({
        viewport: { width, height: sizes[width] },
        hasTouch: width <= 844,
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      page.setDefaultTimeout(9000);
      let route = "";
      page.on("pageerror", (e) => errors.push({ width, route, kind: e.name }));
      page.on("console", (m) => {
        if (m.type() === "error")
          errors.push({
            width,
            route,
            kind: "console",
            text: m
              .text()
              .replace(/https?:\/\/\S+/g, "[url]")
              .slice(0, 150),
          });
      });
      page.on("request", (r) => {
        try {
          requests.add(new URL(r.url()).hostname);
        } catch {}
      });
      page.on("requestfailed", (r) => {
        const key = new URL(r.url()).hostname + " " + r.failure()?.errorText;
        failures[key] = (failures[key] || 0) + 1;
      });
      for (route of paths) {
        try {
          const res = await page.goto(base + route, {
            waitUntil: "domcontentloaded",
            timeout: 18000,
          });
          await page.locator("main, h1").first().waitFor({ state: "attached" });
          await page.waitForTimeout(200);
          const row = await page.evaluate(() => {
            const visible = (e) =>
              e.getBoundingClientRect().width > 0 &&
              e.getBoundingClientRect().height > 0 &&
              getComputedStyle(e).visibility !== "hidden";
            const all = [
              ...document.querySelectorAll(
                "button,a[href],input:not([type=hidden]),select,summary",
              ),
            ].filter(visible);
            const nav = performance.getEntriesByType("navigation")[0];
            const resources = performance.getEntriesByType("resource");
            const bytes = (k) =>
              resources
                .filter(
                  (e) =>
                    e.initiatorType === k || e.name.split("?")[0].endsWith(k),
                )
                .reduce((n, e) => n + e.encodedBodySize, 0);
            return {
              actual: location.pathname,
              headings: [...document.querySelectorAll("h1")].map((x) =>
                x.textContent.trim(),
              ),
              overflow: document.documentElement.scrollWidth - innerWidth,
              small: all.filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width < 24 || r.height < 24;
              }).length,
              controls: all.length,
              navMs: Math.round(nav.domContentLoadedEventEnd),
              jsBodyBytes: bytes(".js"),
              cssBodyBytes: bytes(".css"),
              resourceCount: resources.length,
              brokenImages: [...document.images].filter(
                (i) => i.complete && !i.naturalWidth,
              ).length,
            };
          });
          rows.push({
            route,
            width,
            height: sizes[width],
            http: res?.status(),
            ...row,
          });
          const slug = route === "/" ? "home" : route.slice(1);
          if (engine === "edge" && [1440, 390, 320].includes(width)) {
            if (width !== 320)
              await page.screenshot({
                type: "jpeg",
                quality: 66,
                timeout: 6000,
                path: path.join(out, "screens", slug + "-" + width + ".jpg"),
              });
            if (width === 390 && axe) {
              await page.addScriptTag({ path: axe });
              const result = await page.evaluate(async () => {
                const r = await window.axe.run(document, {
                  runOnly: {
                    type: "tag",
                    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
                  },
                });
                return r.violations.map((v) => ({
                  rule: v.id,
                  impact: v.impact,
                  count: v.nodes.length,
                  examples: v.nodes.slice(0, 3).map((n) => n.target),
                  help: v.help,
                }));
              });
              violations.push({ route, width, result });
            }
          }
        } catch (e) {
          rows.push({
            width,
            route,
            failure: e.message.split("\n")[0].slice(0, 160),
          });
        }
      }
      await ctx.close();
      await fs.writeFile(
        path.join(out, "viewport-" + engine + ".json"),
        JSON.stringify(
          {
            engine,
            version: browser.version(),
            rows,
            violations,
            errors,
            requests: [...requests],
            failures,
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await browser.close();
  }
  console.log(
    engine +
      " " +
      rows.length +
      " checks; navigation/measurement failures " +
      rows.filter((r) => r.failure).length +
      "; widths with overflow " +
      rows.filter((r) => r.overflow > 0).length,
  );
}
run().catch((e) => {
  console.error(e.message.slice(0, 220));
  process.exitCode = 1;
});
