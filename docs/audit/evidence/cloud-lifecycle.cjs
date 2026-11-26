// Read/write only a freshly created fictional identity in the designated development project.
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const { randomUUID, randomBytes } = require("node:crypto"),
  { createClient } = require("@supabase/supabase-js");
const {
  integrationTarget,
  loopbackOrigin,
} = require("../../../tests/accounts-supabase-target.cjs");
const { chromium } = require(process.env.AUDIT_PW);
(async () => {
  const target = integrationTarget();
  assert.equal(target?.url, "https://ryubhqpqfwuwrtyomsmz.supabase.co");
  const base = loopbackOrigin(process.env.AUDIT_URL),
    email = "dt-audit-" + randomUUID() + "@example.test",
    password = randomBytes(30).toString("base64url") + "!A9";
  const admin = createClient(target.url, target.secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Fictional audit user" },
  });
  assert.ok(!created.error && created.data.user.email === email);
  const id = created.data.user.id,
    results = {},
    browser = await chromium.launch({ executablePath: process.env.AUDIT_EDGE });
  let removed = false;
  const c = await browser.newContext(),
    p = await c.newPage();
  p.setDefaultTimeout(9000);
  const btn = (n, page = p) =>
    page.getByRole("button", { name: n, exact: typeof n === "string" }).first();
  async function test(n, fn) {
    try {
      await fn();
      results[n] = "pass";
    } catch (e) {
      results[n] = "inconclusive: " + e.name;
      results[n + " evidence"] = {
        control: (e.message.match(/waiting for (.+)/) || [])[1]
          ?.split("\n")[0]
          ?.slice(0, 140),
        notices: await p.locator("[role=alert]").allTextContents(),
      };
    }
  }
  async function login(page) {
    await page.goto(base + "/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await btn("Sign in", page).click();
    await page.waitForURL(/\/(welcome|my-space)$/);
    if (new URL(page.url()).pathname === "/welcome") {
      await btn("Enter My Space", page).click();
      await page.waitForURL("**/my-space");
    }
    assert.equal(
      (await (await page.request.get(base + "/api/account-session")).json()).id,
      id,
    );
  }
  try {
    await login(p);
    await test("personal letter cloud save", async () => {
      await p.goto(base + "/letters?space=mine");
      await btn(/Write a letter/).click();
      await p.getByLabel(/^Letter title/).fill("Fictional cloud letter");
      await p
        .getByRole("textbox", { name: "Write on the letter" })
        .fill("Fictional cloud writing.");
      await btn("Save and return to box").click();
      await p
        .getByText("Fictional cloud letter", { exact: true })
        .first()
        .waitFor();
    });
    await test("personal journey cloud save", async () => {
      await p.goto(base + "/journey-letters?space=mine");
      await btn("Create a journey").click();
      await p.getByLabel("Journey name").fill("Fictional cloud journey");
      await p
        .getByLabel("Departure city", { exact: true })
        .selectOption("1172451");
      await p
        .getByLabel("Arrival city", { exact: true })
        .selectOption("2643743");
      await p
        .getByLabel("Departure time", { exact: true })
        .fill("2027-01-24T23:00");
      await p
        .getByLabel("Arrival time", { exact: true })
        .fill("2027-01-25T03:00");
      await btn("Review journey").click();
      await btn("Save journey").click();
      await p
        .getByRole("heading", { name: "Six envelopes, one journey." })
        .waitFor();
    });
    await test("personal tree cloud save", async () => {
      await p.goto(base + "/memory-tree?space=mine");
      await btn("Plant a tree").click();
      await p.getByLabel("Tree name").fill("Fictional cloud tree");
      await p.getByLabel("When your story began").fill("2020-02-29");
      await btn("Plant this tree").click();
      await btn("Add a memory").click();
      await p.getByLabel("Title", { exact: true }).fill("Fictional cloud leaf");
      await p.getByLabel("Date", { exact: true }).fill("2026-01-02");
      await p.getByLabel("Story", { exact: true }).fill("Fictional memory.");
      await btn("Save memory").click();
      await p.getByRole("dialog").waitFor({ state: "hidden" });
    });
    const second = await browser.newContext();
    const q = await second.newPage();
    await test("independent browser session retrieves three documents", async () => {
      await login(q);
      for (const [kind, title] of [
        ["letters", "Fictional cloud writing."],
        ["trees", "Fictional cloud leaf"],
        ["journeys", "Fictional cloud journey"],
      ]) {
        const found = await q.evaluate(
          async ({ kind, title, id }) => {
            const scope = async (fields) => {
              const response = await fetch("/api/private-space", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Dear-Account": id,
                },
                body: JSON.stringify({ action: "scope", kind, ...fields }),
              });
              if (!response.ok) throw new Error("Read failed");
              return response.json();
            };
            const shelf = await scope({ content: false });
            for (const item of shelf.documents) {
              const single = await scope({ content: true, id: item.id });
              if (JSON.stringify(single.documents[0].payload).includes(title))
                return true;
            }
            return false;
          },
          { kind, title, id },
        );
        results["second session " + kind] = found;
      }
      assert.ok(
        ["letters", "trees", "journeys"].every(
          (kind) => results["second session " + kind],
        ),
      );
    });
    await second.close();
    await test("loss of session returns to login", async () => {
      await c.clearCookies();
      await p.goto(base + "/my-space");
      await p.waitForURL(/\/login(?:\?|$)/);
      await login(p);
    });
    await test("owner password account closure through UI", async () => {
      await p.goto(base + "/settings");
      assert.equal(
        (await (await p.request.get(base + "/api/account-session")).json()).id,
        id,
      );
      await p.getByText("Delete account", { exact: true }).click();
      await p.getByLabel("Current password").fill(password);
      await p.getByLabel("Type DELETE to confirm").fill("DELETE");
      await btn("Permanently delete account").click();
      await p.waitForURL(base + "/");
      const check = await admin.auth.admin.getUserById(id);
      assert.ok(check.error?.status === 404 && !check.data?.user);
      removed = true;
    });
  } finally {
    await browser.close();
    if (!removed) {
      const who = await admin.auth.admin.getUserById(id);
      if (who.data?.user?.email === email) {
        const r = await admin.rpc("dt_begin_delete", { actor: id });
        assert.ok(!r.error);
        const d = await admin.auth.admin.deleteUser(id);
        assert.ok(!d.error);
      } else {
        assert.equal(who.error?.status, 404);
      }
    }
    await fs.writeFile(
      path.join(process.env.AUDIT_EVIDENCE, "cloud-lifecycle.json"),
      JSON.stringify(results, null, 2),
    );
  }
  console.log(JSON.stringify(results));
})().catch(() => {
  console.error(
    "Fictional lifecycle could not be verified. No session data printed.",
  );
  process.exitCode = 1;
});
