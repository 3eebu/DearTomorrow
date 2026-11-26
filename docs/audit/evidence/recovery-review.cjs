// Uses fresh guest contexts and an isolated browser profile. Never attach a personal profile.
const { chromium } = require(process.env.AUDIT_PW);
const fs = require("node:fs/promises"),
  os = require("node:os"),
  path = require("node:path");
const base = process.env.AUDIT_URL,
  out = process.env.AUDIT_EVIDENCE;
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.AUDIT_EDGE,
  });
  const data = { engine: browser.version() };
  async function check(name, fn) {
    try {
      data[name] = await fn();
    } catch (e) {
      data[name] = { inconclusive: e.message.split("\n")[0] };
    }
  }
  await check("keyboard", async () => {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(base);
    const trigger = p.getByRole("button", { name: /Create something/ }).first();
    await trigger.focus();
    await p.keyboard.press("Enter");
    await p.getByRole("dialog").waitFor();
    const links = await p
      .getByRole("dialog")
      .getByRole("link")
      .evaluateAll((a) => a.map((e) => e.getAttribute("href")));
    const focus = [];
    for (let i = 0; i < 12; i++) {
      await p.keyboard.press("Tab");
      focus.push(
        await p.evaluate(
          () => !!document.activeElement.closest("dialog,[role=dialog]"),
        ),
      );
    }
    await p.keyboard.press("Escape");
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    const restored = await trigger.evaluate(
      (el) => el === document.activeElement,
    );
    await p.close();
    return { links, tabContained: focus.every(Boolean), restored };
  });
  await check("storageFailure", async () => {
    const c = await browser.newContext();
    await c.addInitScript(() => {
      if (!sessionStorage.getItem("retry")) {
        const real = IDBFactory.prototype.open;
        IDBFactory.prototype.open = function () {
          throw new DOMException(
            "Browser storage unavailable",
            "SecurityError",
          );
        };
        window.restoreDB = () => {
          IDBFactory.prototype.open = real;
          sessionStorage.setItem("retry", "1");
        };
      }
    });
    const p = await c.newPage();
    await p.goto(base + "/memory-books?profile=1");
    const err = p.getByRole("alert").filter({ hasText: /reload/i });
    await err.waitFor({ timeout: 6000 });
    const alert = await err.innerText();
    await p.screenshot({
      path: path.join(out, "screens", "book-storage-error.jpg"),
      type: "jpeg",
      quality: 65,
    });
    await p.evaluate(() => window.restoreDB());
    await p.reload();
    await p.locator("[data-library-load-ms]").waitFor();
    const retry = await p
      .locator("[data-library-load-ms]")
      .getAttribute("data-library-load-ms");
    await c.close();
    return { alert, retryLoadMs: Number(retry) };
  });
  await check("resumeBrowser", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dt-audit-guest-"));
    const open = () =>
      chromium.launchPersistentContext(dir, {
        executablePath: process.env.AUDIT_EDGE,
        viewport: { width: 1280, height: 800 },
      });
    const c = await open();
    try {
      const p = await c.newPage();
      await p.goto(base + "/memory-books");
      await p.getByRole("button", { name: /Explore example/ }).click();
      await p.getByRole("button", { name: /Make an editable copy/ }).click();
      const title = p.getByRole("textbox", { name: "Book title" });
      await title.fill("Fictional audit book");
      await title.press("Tab");
      await p.waitForTimeout(1000);
    } finally {
      await c.close();
    }
    const d = await open();
    try {
      const p = await d.newPage();
      await p.goto(base + "/memory-books");
      return {
        survived: await p
          .getByRole("button", { name: "Read Fictional audit book" })
          .waitFor({ timeout: 7000 })
          .then(() => true),
      };
    } finally {
      await d.close();
    }
  });
  await check("zoom", async () => {
    const p = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    await p.goto(base + "/login");
    const c = await p.context().newCDPSession(p);
    await c.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    const pinch = await p.evaluate(() => visualViewport.scale);
    await c.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
    const overflow = await p.evaluate(() => {
      document.documentElement.style.zoom = "2";
      return document.documentElement.scrollWidth - innerWidth;
    });
    await p.close();
    return { pinch, cssZoom2Overflow: overflow };
  });
  await check("contrast", async () => {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const rows = [];
    for (const route of ["/", "/login", "/memory-books"]) {
      await p.goto(base + route);
      await p.addScriptTag({ path: process.env.AUDIT_AXE });
      const issues = await p.evaluate(async () => {
        const r = await axe.run(document, {
          runOnly: ["color-contrast", "label-content-name-mismatch"],
        });
        return r.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes
            .slice(0, 4)
            .map((n) => ({
              target: n.target,
              summary: n.failureSummary,
              excerpt: n.html.replace(/\s+/g, " ").slice(0, 140),
            })),
        }));
      });
      rows.push({ route, issues });
    }
    await p.close();
    return rows;
  });
  await check("slowNetwork", async () => {
    const rows = [];
    for (const route of ["/", "/memory-tree", "/memory-books"]) {
      const c = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const p = await c.newPage(),
        cdp = await c.newCDPSession(p);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 200000,
        uploadThroughput: 93750,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await p.addInitScript(() => {
        window.stats = { lcp: 0, long: [] };
        for (const name of ["longtask", "largest-contentful-paint"])
          new PerformanceObserver((list) =>
            list
              .getEntries()
              .forEach((e) =>
                name === "longtask"
                  ? window.stats.long.push(e.duration)
                  : (window.stats.lcp = e.startTime),
              ),
          ).observe({ type: name, buffered: true });
      });
      await p.goto(base + route, { waitUntil: "load", timeout: 70000 });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(1200);
      rows.push(
        await p.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0],
            r = performance.getEntriesByType("resource"),
            sum = (exp) =>
              r
                .filter((e) => exp.test(e.name.split("?")[0]))
                .reduce((n, e) => n + e.encodedBodySize, 0);
          return {
            route: location.pathname,
            dcl: Math.round(nav.domContentLoadedEventEnd),
            load: Math.round(nav.loadEventEnd),
            lcp: Math.round(window.stats.lcp),
            longTasks: window.stats.long.length,
            longest: Math.max(0, ...window.stats.long),
            jsBytes: sum(/\.js$/),
            fontBytes: sum(/\.woff2?$/),
            resources: r.length,
            heapSampleMiB: Math.round(
              performance.memory.usedJSHeapSize / 1048576,
            ),
          };
        }),
      );
      await c.close();
    }
    return rows;
  });
  await browser.close();
  await fs.writeFile(
    path.join(out, "recovery.json"),
    JSON.stringify(data, null, 2),
  );
  console.log(Object.keys(data).join(", "));
})().catch((e) => {
  console.error(e.message.split("\n")[0]);
  process.exitCode = 1;
});
