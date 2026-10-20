// Copies the app into an output folder and stamps the deploy's commit into the
// page and the service worker. Uses only Node built-ins, so Vercel needs no install.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const FILES = ["index.html", "sw.js", "manifest.webmanifest", "icons"];

function resolveCommit(env = process.env) {
  const fromEnv = env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (fromEnv) return fromEnv.toLowerCase();
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (/^[a-f0-9]{40}$/i.test(sha)) return sha.toLowerCase();
  } catch { /* A CLI deploy uploads no .git folder. */ }
  // Still unique per build, so the service worker sees a new version.
  return `build-${Date.now().toString(36)}`;
}

function build(outDir, commit = resolveCommit()) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of FILES) fs.cpSync(path.join(ROOT, name), path.join(outDir, name), { recursive: true });
  for (const name of ["index.html", "sw.js"]) {
    const file = path.join(outDir, name);
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replaceAll("__APP_COMMIT__", commit));
  }
  return commit;
}

module.exports = { build, resolveCommit };

if (require.main === module) {
  const outDir = path.resolve(ROOT, process.argv[2] || "dist");
  console.log(`Built ${build(outDir)} into ${path.relative(ROOT, outDir) || "."}`);
}
