// Renders the home screen icons. Run once after changing the design:
//   node scripts/make-icons.js
const path = require("path");
const { chromium } = require("@playwright/test");

// Full-bleed square: iOS and Android round the corners themselves. The bars
// stay inside the middle 80%, so the icon also works as a maskable icon.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f6feb"/>
  <rect x="128" y="276" width="64" height="112" rx="14" fill="#fff" opacity=".7"/>
  <rect x="224" y="208" width="64" height="180" rx="14" fill="#fff" opacity=".85"/>
  <rect x="320" y="140" width="64" height="248" rx="14" fill="#fff"/>
  <path d="M352 76l11 22 24 4-17 17 4 24-22-11-22 11 4-24-17-17 24-4z" fill="#ffd33d" transform="translate(0 -14)"/>
</svg>`;

const SIZES = { "icon-192.png": 192, "icon-512.png": 512, "apple-touch-icon.png": 180 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, size] of Object.entries(SIZES)) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${SVG}`);
    await page.screenshot({ path: path.join(__dirname, "..", "icons", name) });
  }
  await browser.close();
})();
