const { chromium } = require(process.env.AUDIT_PW);
const fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const out = process.env.AUDIT_EVIDENCE,
  base = process.env.AUDIT_URL;
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.AUDIT_EDGE,
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    acceptDownloads: true,
    ...(process.env.AUDIT_VIDEO
      ? {
          recordVideo: {
            dir: process.env.AUDIT_VIDEO,
            size: { width: 960, height: 640 },
          },
        }
      : {}),
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(3800);
  const result = {
    actions: [],
    turns: [],
    tools: [],
    surprises: [],
    issues: [],
    console: [],
  };
  const btn = (s, root = p) =>
    root.getByRole("button", { name: s, exact: typeof s === "string" });
  const click = async (s, root = p) => btn(s, root).first().click();
  p.on("pageerror", (e) => result.console.push(e.name));
  async function test(name, fn) {
    try {
      await fn();
      result.actions.push(name);
    } catch (e) {
      result.issues.push({ step: name, error: e.message.split("\n")[0] });
    }
  }
  const shot = async (n) =>
    p.screenshot({
      path: path.join(out, "screens", "book-" + n + ".jpg"),
      type: "jpeg",
      quality: 74,
    });
  const turn = async (forward = true) => {
    const old = await p.locator("[aria-live=polite]").last().textContent();
    await click(forward ? "Next →" : "← Previous");
    await p.waitForFunction(
      (previous) =>
        [...document.querySelectorAll("[aria-live=polite]")].at(-1)
          ?.textContent !== previous,
      old,
      { timeout: 4500 },
    );
    await p.locator("[data-turning=false]").waitFor();
    const value = await p
      .locator("[data-turning=false]")
      .getAttribute("data-frame-timing");
    result.turns.push(value ? JSON.parse(value) : { completed: true });
  };
  try {
    await p.goto(base + "/memory-books?profile=1", {
      waitUntil: "domcontentloaded",
    });
    await click(/Explore example/);
    await btn("Present wrapped").waitFor();
    await click("Present wrapped");
    if (await btn("Untie the ribbon").count()) {
      await click("Untie the ribbon");
      await btn(/^Open Every Little/).waitFor();
      result.actions.push("Untie ribbon");
      await click("Replay gift opening");
      await click("Skip wrapping");
      result.actions.push("Replay and skip gift");
    }
    await click(/^Open Every Little/);
    await btn(/Turn next page/).waitFor();
    await shot("open");
    for (const light of ["Morning Sun", "Candlelight", "Rainy Afternoon"])
      await test(light, async () => {
        await click(light);
        assert.equal(await btn(light).getAttribute("aria-pressed"), "true");
      });
    await test("bookmark", async () => {
      await p.getByText("Bookmarks & reading place", { exact: true }).click();
      await click("Bookmark this page");
      await btn("Page bookmarked").waitFor();
      await p.getByText("Bookmarks & reading place", { exact: true }).click();
    });
    for (let i = 0; i < 10; i++) {
      for (const [kind, open, close] of [
        ["fold", "Unfold note", "Fold note"],
        ["envelope", "Open envelope", "Return letter"],
        ["reverse", "Turn photo over", "Show photograph"],
        ["scratch", "Reveal scratch card", "Reset"],
        ["pocket", "Pull out Cinema ticket", "Return keepsake"],
        ["flap", "Lift flap", "Lower flap"],
        ["popup", "Raise paper pop-up", "Close paper pop-up"],
      ]) {
        if (
          await btn(open)
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await test("physical reader " + kind, async () => {
            if (kind === "scratch") {
              const area = p.locator("[data-scratch=active]");
              const box = await area.boundingBox();
              const start = await p.evaluate(() => {
                window.qaScratchFrames = [];
                window.qaScratchRun = true;
                let prev = performance.now();
                function frame(t) {
                  window.qaScratchFrames.push(t - prev);
                  prev = t;
                  if (window.qaScratchRun) requestAnimationFrame(frame);
                }
                requestAnimationFrame(frame);
                return prev;
              });
              await p.mouse.move(
                box.x + box.width * 0.22,
                box.y + box.height * 0.48,
              );
              await p.mouse.down();
              await p.mouse.move(
                box.x + box.width * 0.8,
                box.y + box.height * 0.51,
                { steps: 35 },
              );
              await p.mouse.up();
              result.scratch = await p.evaluate((ts) => {
                window.qaScratchRun = false;
                const a = window.qaScratchFrames.slice(1).sort((x, y) => x - y);
                return {
                  elapsedMs: performance.now() - ts,
                  frames: a.length,
                  p50: a[Math.floor(a.length * 0.5)],
                  p95: a[Math.floor(a.length * 0.95)],
                  max: a.at(-1),
                };
              }, start);
              await shot("scratch");
            }
            await click(open);
            await click(close);
            result.surprises.push(kind);
          });
        }
      }
      if (await btn("Play A little sound to keep").count())
        await test("voice play seek pause", async () => {
          await click("Play A little sound to keep");
          const slider = p.getByRole("slider", { name: /Seek A little sound/ });
          await slider.focus();
          await slider.press("ArrowRight");
          await click("Pause A little sound to keep");
        });
      if (!(await btn("Next →").isEnabled())) break;
      await turn();
    }
    await test("backward turn", () => turn(false));
    await test("simple reading 18 pages", async () => {
      await click("Simple reading");
      assert.equal(await p.locator("main article").count(), 18);
      await click("Book view");
    });
    await click(/Make an editable copy/);
    const rail = p.getByRole("navigation", { name: "Creative tools" });
    for (const name of await rail.getByRole("button").allTextContents()) {
      result.tools.push(name.trim());
    }
    const tool = async (n) => {
      const b = btn(n, rail);
      if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
    };
    await test("write duplicate undo redo", async () => {
      await tool("Writing");
      await click(
        /^Heading|^Title/,
        p.getByRole("complementary", { name: "writing collection" }),
      );
      await click("Duplicate");
      await click("Undo");
      await click("Redo");
    });
    await test("photo upload and polaroid", async () => {
      await tool("Photographs");
      await p
        .locator('input[type=file][accept^="image/jpeg"]')
        .setInputFiles(path.resolve("tests/fixtures/book-photo.png"));
      await click("Insert book-photo.png");
      await p.getByText("Instant photo frames", { exact: true }).click();
      await click(/classic.*Editable frame/i);
    });
    for (const name of [
      "Decorations",
      "Drawing",
      "Paper",
      "Little Surprises",
      "Templates",
      "Layers",
      "Book settings",
      "Hand",
    ]) {
      await test("open " + name, async () => {
        await tool(name);
        assert.equal(
          await btn(name, rail).getAttribute("aria-pressed"),
          "true",
        );
        if (name === "Decorations") await click("Add rose");
      });
    }
    await test("cover surfaces, finish, spine and ribbon", async () => {
      await p.getByText("Book options", { exact: true }).click();
      await click("Cover Studio");
      const nav = p.getByRole("navigation", { name: "Cover surface" });
      const b = nav.getByRole("button");
      result.covers = await b.allTextContents();
      for (let i = 0; i < (await b.count()); i++) await b.nth(i).click();
      for (const n of ["Material", "Finish", "Lettering"])
        await p
          .getByRole("combobox", { name: new RegExp("^" + n) })
          .first()
          .selectOption({ index: 1 });
      await p.getByText("Binding details", { exact: true }).click();
      await p.getByLabel("Ribbon bookmark").check();
      await p.getByLabel("Spine title").fill("Audit Spine");
      await click(/← Studio/);
    });
    await test("rename save refresh and reopen", async () => {
      const t = p.getByRole("textbox", { name: "Book title" });
      await t.fill("Audit keepsake");
      await p
        .getByRole("status")
        .filter({ hasText: /Saved/ })
        .first()
        .waitFor();
      await p.reload();
      await btn("Read Audit keepsake").waitFor();
      await click("Read Audit keepsake");
      await btn("Open Audit keepsake").waitFor();
    });
  } catch (e) {
    result.issues.push({
      step: "walkthrough",
      error: e.message.split("\n")[0],
    });
  } finally {
    await fs.writeFile(
      path.join(out, "book-walkthrough.json"),
      JSON.stringify(result, null, 2),
    );
    await ctx.close();
    await browser.close();
  }
  console.log(JSON.stringify(result));
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
