const { test, expect } = require("@playwright/test");
const path = require("path");

const PAGE = "file://" + path.resolve(__dirname, "..", "index.html");

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

test("logging a visit adds up points and keeps the quote", async ({ page }) => {
  await page.fill("#vShop", "Test Auto");
  await page.check("input[name=owner]");
  await page.fill("#vQuote", "We miss calls all morning");
  await page.click("#visitForm button[type=submit]");

  // walk-in 3 + owner 5 + problem quote 5
  await expect(page.locator("#total")).toHaveText("13");
  await expect(page.locator("#quotes")).toContainText("We miss calls all morning");
  await expect(page.locator("#streak")).toContainText("1");
});

test("data survives a reload", async ({ page }) => {
  await page.fill("#vShop", "Reload Auto");
  await page.click("#visitForm button[type=submit]");
  await page.reload();
  await expect(page.locator("#total")).toHaveText("3");
});

test("Level 1 unlocks at 100 points", async ({ page }) => {
  for (let i = 0; i < 2; i++) {
    await page.fill("#vShop", `Shop ${i}`);
    for (const key of ["owner", "problem", "followUp", "yes", "live"]) {
      await page.check(`input[name=${key}]`);
    }
    await page.click("#visitForm button[type=submit]");
  }
  await expect(page.locator("#l1")).toHaveText("Unlocked");
});

test("page fits the screen without sideways scrolling", async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
