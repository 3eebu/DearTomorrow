const { chromium } = require(process.env.AUDIT_PW);
const fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { anniversary } = require("../../../tests/create-studio-fixture.cjs");
const out = process.env.AUDIT_EVIDENCE;
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.AUDIT_EDGE,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  const c = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      permissions: ["microphone"],
    }),
    p = await c.newPage();
  p.setDefaultTimeout(4500);
  const result = { steps: [], errors: [] };
  const b = (name, root = p) =>
    root.getByRole("button", { name, exact: typeof name === "string" }).first();
  const click = (name, root = p) => b(name, root).click();
  const rail = p.getByRole("navigation", { name: "Creative tools" });
  async function tool(n) {
    if ((await b(n, rail).getAttribute("aria-pressed")) !== "true")
      await click(n, rail);
  }
  async function step(name, fn) {
    try {
      await fn();
      result.steps.push(name);
    } catch (e) {
      result.errors.push({ name, reason: e.message.split("\n")[0] });
    }
  }
  await p.goto(process.env.AUDIT_URL + "/memory-books?profile=1");
  await p.locator("[data-library-load-ms]").waitFor();
  result.initialLibraryMs = Number(
    await p
      .locator("[data-library-load-ms]")
      .getAttribute("data-library-load-ms"),
  );
  const sample = anniversary(75, 100);
  await p
    .locator('input[accept*="application/json"]')
    .setInputFiles({
      name: "fictional-book.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(sample)),
    });
  await click("Open Studio ↗");
  await p.locator("[data-studio-ready-ms]").waitFor();
  result.studioMs = Number(
    await p
      .locator("[data-studio-ready-ms]")
      .getAttribute("data-studio-ready-ms"),
  );
  await step("resize photo using handle", async () => {
    await tool("Layers");
    await click("Select layer Photograph 1");
    const handle = b("Resize se corner or edge"),
      g = await handle.boundingBox();
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await p.mouse.down();
    await p.mouse.move(g.x + 30, g.y + 21, { steps: 8 });
    await p.mouse.up();
  });
  await step(
    "group two objects, arrange, ungroup, lock and unlock",
    async () => {
      await tool("Layers");
      await click("Select layer Photograph 1");
      await click("Select several");
      await click("Select layer Photograph 2");
      await p.getByText("Arrange ↕", { exact: true }).click();
      await click(/^Group ·/);
      await click("Bring to front");
      await click(/^Ungroup ·/);
      await p.getByText("Arrange ↕", { exact: true }).click();
      await click("Lock");
      await click("Unlock");
      await click("Select several");
    },
  );
  await step("shape insertion", async () => {
    await tool("Decorations");
    await p.getByText("Shapes and borders", { exact: true }).click();
    await click("Add ellipse");
  });
  await step("ink stroke on canvas", async () => {
    await tool("Drawing");
    await click("pen");
    const area = p.locator("[class*=drawingOverlay]");
    await area.scrollIntoViewIfNeeded();
    const g = await area.boundingBox();
    await p.mouse.move(g.x + g.width * 0.3, g.y + g.height * 0.4);
    await p.mouse.down();
    await p.mouse.move(g.x + g.width * 0.45, g.y + g.height * 0.47, {
      steps: 14,
    });
    await p.mouse.up();
  });
  await step("template inserts a new page", async () => {
    await tool("Templates");
    const nav = p.getByRole("complementary", { name: /templates collection/i });
    await nav.getByRole("button", { name: /＋/ }).first().click();
  });
  await step("custom voice recording and written transcript", async () => {
    await tool("Little Surprises");
    await click(/＋ Voice memory/);
    await click("Record voice");
    await b("Stop and keep recording").waitFor();
    await p.waitForTimeout(1200);
    await click("Stop and keep recording");
    await p
      .getByLabel("Transcript (optional)")
      .fill("A fictional voice note for the audit.");
  });
  await step("upload WAV", async () => {
    const n = 8000,
      buf = Buffer.alloc(44 + n * 2);
    buf.write("RIFF");
    buf.writeUInt32LE(36 + n * 2, 4);
    buf.write("WAVEfmt ", 8);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(8000, 24);
    buf.writeUInt32LE(16000, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(n * 2, 40);
    await p
      .locator('input[accept^="audio/"]')
      .setInputFiles({ name: "audit.wav", mimeType: "audio/wav", buffer: buf });
    await p.waitForTimeout(500);
  });
  await step(
    "confirmed export with page/object/transcript checks",
    async () => {
      await p.getByText("Book options", { exact: true }).click();
      const d = p.waitForEvent("download");
      await click("Export backup");
      const file = JSON.parse(
        await fs.readFile(await (await d).path(), "utf8"),
      );
      result.exportCounts = {
        pages: file.pages.length,
        objects: file.pages[0].elements.length,
        hasTranscript: JSON.stringify(file).includes(
          "A fictional voice note for the audit.",
        ),
        hasAudio: Object.keys(file.voiceAssets || {}).length,
      };
      assert.ok(file.pages[0].elements.length > 75);
      assert.ok(
        result.exportCounts.hasAudio > 0 && result.exportCounts.hasTranscript,
      );
    },
  );
  await step("chapters and dividers", async () => {
    await click("Back to library");
    await p.getByLabel(/^Options for Creative Freedom/).click();
    await click("Chapters & pages");
    await click("＋ Chapter");
    await p
      .getByLabel("Insert editable divider")
      .first()
      .selectOption({ index: 1 });
    await click("← Library");
  });
  await step(
    "phone single page, rapid navigation and edge cancellation",
    async () => {
      await p.setViewportSize({ width: 320, height: 680 });
      await b(/^Read Creative/).click();
      await click(/^Open Creative/);
      const edge = b(/Turn next page/);
      await edge.waitFor();
      const g = await edge.boundingBox(),
        x = g.x + g.width / 2,
        y = g.y + g.height / 2;
      const counter = p.locator("span[aria-live=polite]").first();
      const before = await counter.textContent();
      await p.mouse.move(x, y);
      await p.mouse.down();
      await p.mouse.move(x - 8, y, { steps: 4 });
      await p.keyboard.press("Escape");
      await p.mouse.up();
      await p.waitForTimeout(850);
      result.dragCancelKeptPage = before === (await counter.textContent());
      await click("Next →");
      await p.keyboard.press("ArrowRight");
      await p.keyboard.press("ArrowRight");
      await p.waitForTimeout(1050);
      result.afterRapid = await counter.textContent();
      result.phoneOverflow = await p.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      await p.screenshot({
        path: path.join(out, "screens", "book-reader-320.jpg"),
        type: "jpeg",
        quality: 72,
      });
    },
  );
  await c.close();
  await browser.close();
  await fs.writeFile(
    path.join(out, "studio.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
})().catch((e) => {
  console.error(e.message.split("\n")[0]);
  process.exitCode = 1;
});
