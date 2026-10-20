const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  projects: [
    { name: "desktop", testIgnore: /pwa|sync/, use: { ...devices["Desktop Chrome"] } },
    { name: "phone", testIgnore: /pwa|sync/, use: { ...devices["Pixel 7"] } },
    // Builds and rewrites test-dist, so it runs in one project only.
    { name: "pwa", testMatch: /pwa/, use: { ...devices["Desktop Chrome"] } },
    // Shares the test server's in-memory sync store, so it also runs in one project.
    { name: "sync", testMatch: /sync/, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "node scripts/build.mjs && node scripts/serve.mjs test-dist 4173",
    env: { APP_VERSION: "v1", OUT_DIR: "test-dist", SYNC_TOKEN: "test-sync-key", SYNC_MEMORY_STORE: "1" },
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
