const { test, expect } = require("@playwright/test");
const { merge } = require("../sync-merge.js");

const URL = "http://localhost:4173/";
const KEY = "test-sync-key";

test.describe.configure({ mode: "serial" });

test.describe("merge", () => {
  test("keeps records from both sides", () => {
    const out = merge({ visits: [{ id: "a" }] }, { visits: [{ id: "b" }] });
    expect(out.visits.map(v => v.id).sort()).toEqual(["a", "b"]);
  });

  test("newer edit wins, and records from before sync count as oldest", () => {
    const out = merge(
      { problems: [{ id: "p", stage: 0 }] },
      { problems: [{ id: "p", stage: 1, updatedAt: 5 }] },
    );
    expect(out.problems).toEqual([{ id: "p", stage: 1, updatedAt: 5 }]);
  });

  test("a deletion spreads, even to a record saved before sync", () => {
    const out = merge({ visits: [{ id: "a" }, { id: "b" }] }, { visits: [{ id: "b" }], deleted: { a: 10 } });
    expect(out.visits.map(v => v.id)).toEqual(["b"]);
    expect(out.deleted).toEqual({ a: 10 });
  });

  test("experiments merge per week by updatedAt", () => {
    const out = merge(
      { experiments: { w1: { variable: "old", updatedAt: 1 }, w2: { variable: "mine" } } },
      { experiments: { w1: { variable: "new", updatedAt: 2 } } },
    );
    expect(out.experiments.w1.variable).toBe("new");
    expect(out.experiments.w2.variable).toBe("mine");
  });
});

async function device(browser, visits) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(URL);
  await page.evaluate(v => localStorage.setItem("sundin-scoreboard-v1", JSON.stringify({ visits: v })), visits);
  await page.reload();
  return { context, page };
}
const visit = (id, shop) => ({ id, date: "2026-10-18", shop, area: "", actions: { walkIn: true }, quote: "", notes: "" });

async function connect(page, key = KEY) {
  await page.fill("#syncKeyInput", key);
  await page.click("#syncForm button[type=submit]");
}

test("two devices with existing scores end up with both, and deletes spread", async ({ browser }) => {
  // The test server's store outlives a single test, so names are unique per test.
  const RUN = Date.now().toString(36);
  const phone = await device(browser, [visit(`v-phone-${RUN}`, `Phone Auto ${RUN}`)]);
  const mac = await device(browser, [visit(`v-mac-${RUN}`, `Mac Auto ${RUN}`)]);

  await connect(phone.page);
  await expect(phone.page.locator("#syncStatus")).toHaveText("Synced just now.");
  await connect(mac.page);
  await expect(mac.page.locator("#visitTable")).toContainText(`Phone Auto ${RUN}`);
  await expect(mac.page.locator("#visitTable")).toContainText(`Mac Auto ${RUN}`);

  // The phone picks up the Mac's visit on its next sync (it syncs on reload).
  await phone.page.reload();
  await expect(phone.page.locator("#visitTable")).toContainText(`Mac Auto ${RUN}`);

  // Delete on the Mac, then the phone loses it too.
  const synced = mac.page.waitForResponse(r => r.url().endsWith("/api/sync") && r.ok());
  await mac.page.locator(`[data-del-visit="v-phone-${RUN}"]`).click();
  await synced;
  await phone.page.reload();
  await expect(phone.page.locator("#visitTable")).not.toContainText(`Phone Auto ${RUN}`);
  await expect(phone.page.locator("#visitTable")).toContainText(`Mac Auto ${RUN}`);

  await phone.context.close();
  await mac.context.close();
});

test("a wrong key is rejected and nothing local is lost", async ({ browser }) => {
  const d = await device(browser, [visit("v-solo", "Solo Auto")]);
  await connect(d.page, "not-the-key");
  await expect(d.page.locator("#syncStatus")).toHaveText("That sync key doesn't match.");
  await expect(d.page.locator("#syncForm")).toBeVisible();
  await expect(d.page.locator("#visitTable")).toContainText("Solo Auto");
  await d.context.close();
});
