// Minimal static server for the PWA and sync tests. Service workers need http://, not file://.
// /api/sync runs the real handler with Vercel-style req.body / res.status().json().
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const dir = process.argv[2] || "dist";
const port = Number(process.argv[3] || 4173);
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml",
};

const syncHandler = createRequire(import.meta.url)("../api/sync.js");

async function api(req, res) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
  await syncHandler(req, res);
}

createServer(async (req, res) => {
  if (req.url.startsWith("/api/sync")) return api(req, res);
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (path.endsWith("/")) path += "index.html";
  try {
    const body = await readFile(join(dir, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, () => console.log(`Serving ${dir} on http://localhost:${port}`));
