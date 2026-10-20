// Copies the app into dist/ and stamps it with a version, so every deploy
// ships a byte-different sw.js and phones see that an update is available.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, process.env.OUT_DIR || "dist");
const version =
  process.env.APP_VERSION ||
  (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) ||
  `dev-${Date.now().toString(36)}`;

const STAMPED = ["index.html", "sw.js", "manifest.webmanifest"];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of STAMPED) {
  const text = readFileSync(join(root, file), "utf8").replaceAll("__APP_VERSION__", version);
  writeFileSync(join(out, file), text);
}
for (const file of ["app.js", "charts.js"]) cpSync(join(root, file), join(out, file));
for (const dir of ["icons", "vendor"]) cpSync(join(root, dir), join(out, dir), { recursive: true });
writeFileSync(join(out, "version.json"), JSON.stringify({ version }) + "\n");

console.log(`Built ${version} into ${out}`);
