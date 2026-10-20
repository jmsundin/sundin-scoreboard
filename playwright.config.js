const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  projects: [
    { name: "desktop", testIgnore: /pwa/, use: { ...devices["Desktop Chrome"] } },
    { name: "phone", testIgnore: /pwa/, use: { ...devices["Pixel 7"] } },
    // Builds and rewrites test-dist, so it runs in one project only.
    { name: "pwa", testMatch: /pwa/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "node scripts/build.mjs && node scripts/serve.mjs test-dist 4173",
    env: { APP_VERSION: "v1", OUT_DIR: "test-dist" },
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
