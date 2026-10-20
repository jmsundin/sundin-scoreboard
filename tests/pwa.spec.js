const { test, expect } = require("@playwright/test");
const { execFileSync } = require("child_process");
const path = require("path");

// These run against a built copy served over http, since service workers don't work on file://.
const ROOT = path.resolve(__dirname, "..");
const OUT = "test-dist";
const URL = "http://localhost:4173/";
const build = version =>
  execFileSync("node", ["scripts/build.mjs"], { cwd: ROOT, env: { ...process.env, APP_VERSION: version, OUT_DIR: OUT } });

test.describe.configure({ mode: "serial" });

test.beforeAll(() => build("v1"));

test("manifest and icons are installable", async ({ page, request }) => {
  await page.goto(URL);
  const href = await page.getAttribute("link[rel=manifest]", "href");
  const manifest = await (await request.get(URL + href)).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    expect((await request.get(URL + icon.src)).status()).toBe(200);
  }
  const touch = await page.getAttribute("link[rel=apple-touch-icon]", "href");
  expect((await request.get(URL + touch)).status()).toBe(200);
});

test("works offline once installed", async ({ page, context }) => {
  await page.goto(URL);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Sundin Systems Scoreboard");
  await context.setOffline(false);
});

test("a new deploy shows Restart now and switches versions", async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator(".version")).toHaveText("Version v1");
  await expect(page.locator("#updateBanner")).toBeHidden();

  build("v2");
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await expect(page.locator("#updateBanner")).toBeVisible();

  await page.click("#restartBtn");
  await expect(page.locator(".version")).toHaveText("Version v2");
  await expect(page.locator("#updateBanner")).toBeHidden();
});

test.afterAll(() => build("v1"));
