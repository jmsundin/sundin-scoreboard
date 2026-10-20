const { test, expect } = require("@playwright/test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build } = require("../scripts/build");
const { serve } = require("../scripts/serve");

// Each test deploys into its own folder and server, so rebuilding there
// doesn't change the app the other tests use.
async function deploy(commit) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scoreboard-"));
  build(dir, commit);
  const server = await serve(dir);
  return { dir, server, url: `http://localhost:${server.address().port}/` };
}

const OLD = "a".repeat(40);
const NEW = "b".repeat(40);

test("can be added to the home screen", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
});

test("a new deploy offers Restart now and loads the new version", async ({ page }) => {
  const app = await deploy(OLD);
  try {
    await page.goto(app.url);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect(page.locator("#appVersion")).toHaveText("aaaaaaa");

    build(app.dir, NEW);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    const restart = page.getByRole("button", { name: "Restart now" });
    await expect(restart).toBeVisible();
    await expect(page.locator("#toasts")).toContainText("currently loaded version aaaaaaa");

    await restart.click();
    await expect(page.locator("#appVersion")).toHaveText("bbbbbbb");
    await expect(page.locator("#toasts")).toContainText("App updated · version bbbbbbb");
  } finally {
    app.server.close();
  }
});

test("keeps working offline once loaded", async ({ page, context }) => {
  const app = await deploy(OLD);
  try {
    await page.goto(app.url);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Sundin Systems Scoreboard");
  } finally {
    await context.setOffline(false);
    app.server.close();
  }
});
