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

test("weekly quest counts field and prep together", async ({ page }) => {
  await page.fill("#vShop", "Quest Auto");
  await page.click("#visitForm button[type=submit]");
  await expect(page.locator('[data-quest="field"] .num')).toHaveText("1 / 3");

  await page.click('[data-tab="prep"]');
  await page.fill("#lcName", "Two Sum");
  await page.click("#lcForm button[type=submit]");
  await page.locator("#designList button").first().click();
  await page.locator("#storyList button").first().click();

  await expect(page.locator('[data-quest="leetcode"] .num')).toHaveText("1 / 5");
  await expect(page.locator('[data-quest="design"]')).toHaveClass(/met/);
  await expect(page.locator('[data-quest="story"]')).toHaveClass(/met/);
  await expect(page.locator("#prepTable")).toContainText("Two Sum");
});

test("a solved problem comes back for review on schedule", async ({ page }) => {
  await page.evaluate(() => {
    const d = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
    localStorage.setItem("sundin-scoreboard-v1", JSON.stringify({
      visits: [], experiments: {},
      problems: [{ id: "p1", name: "Valid Anagram", firstDate: d, stage: 0, nextDue: d }],
      prep: [{ id: "x1", date: d, kind: "lcNew", label: "Valid Anagram", problemId: "p1" }],
    }));
  });
  await page.reload();
  await page.click('[data-tab="prep"]');
  await expect(page.locator("#dueList")).toContainText("Valid Anagram");
  await page.click('#dueList button');
  await expect(page.locator("#dueList")).not.toContainText("Valid Anagram");
  await expect(page.locator("#prepTable")).toContainText("LeetCode (review): Valid Anagram");
});

test("progress charts draw from the data", async ({ page }) => {
  await page.fill("#vShop", "Chart Auto");
  await page.check("input[name=owner]");
  await page.click("#visitForm button[type=submit]");
  await page.click('[data-tab="prep"]');
  await page.fill("#lcName", "Two Sum");
  await page.click("#lcForm button[type=submit]");

  await page.click('[data-tab="progress"]');
  const filled = await page.$$eval("#chartWeekly svg rect[rx]", rs => rs.filter(r => +r.getAttribute("height") > 0).length);
  expect(filled).toBe(2); // this week's field and LeetCode segments
  await expect(page.locator("#chartHeat svg rect")).not.toHaveCount(0);
  await expect(page.locator("#chartFunnel")).toContainText("Talked with owner");
  await expect(page.locator('#chartLeetcode svg path[stroke-width="2"]')).toHaveCount(1);

  // Tapping a week lists its entries.
  await page.locator("#chartWeekly rect.hit").last().click();
  await expect(page.locator("#weekDetail")).toContainText("Chart Auto");
});
