// POST /api/sync: the client sends its whole state, the server merges it with the
// stored copy and returns the result. Because every sync is a merge, a device that
// was offline or raced another one just re-adds its records on the next sync.
const crypto = require("crypto");
const { merge } = require("../sync-merge.js");

const KEY = "sundin-scoreboard:state";
const memory = new Map();

function store() {
  // Vercel's Upstash Redis integration sets the KV_* names; a direct Upstash setup uses UPSTASH_*.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const call = async command => {
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (!r.ok) throw new Error(`Redis responded ${r.status}`);
      return (await r.json()).result;
    };
    return {
      get: async () => {
        const raw = await call(["GET", KEY]);
        return raw ? JSON.parse(raw) : null;
      },
      set: value => call(["SET", KEY, JSON.stringify(value)]),
    };
  }
  // Tests run the API with an in-memory store.
  if (process.env.SYNC_MEMORY_STORE === "1") {
    return { get: async () => memory.get(KEY) || null, set: async value => { memory.set(KEY, value); } };
  }
  return null;
}

function authorized(req) {
  const expected = process.env.SYNC_TOKEN || "";
  const given = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || !given) return false;
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = crypto.createHash("sha256").update(expected).digest();
  const b = crypto.createHash("sha256").update(given).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!process.env.SYNC_TOKEN) return res.status(503).json({ error: "Sync isn't set up yet: SYNC_TOKEN is missing on the server." });
  if (!authorized(req)) return res.status(401).json({ error: "That sync key doesn't match." });
  const db = store();
  if (!db) return res.status(503).json({ error: "Sync isn't set up yet: no database is connected." });

  let body = req.body;
  try {
    if (typeof body === "string") body = JSON.parse(body || "{}");
  } catch {
    return res.status(400).json({ error: "Body must be JSON." });
  }
  const incoming = body && typeof body.state === "object" && body.state ? body.state : {};

  try {
    const merged = merge((await db.get()) || {}, incoming);
    await db.set(merged);
    return res.status(200).json({ state: merged, syncedAt: Date.now() });
  } catch (err) {
    console.error("Sync failed", err);
    return res.status(502).json({ error: "The database didn't respond. Your scores are still saved on this device." });
  }
};
