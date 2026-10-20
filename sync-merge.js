// Merges two copies of the scoreboard so no device ever loses a record.
// Records are matched by id and the newer `updatedAt` wins; records saved before
// sync existed have no `updatedAt` and count as oldest. Deletions are kept as
// tombstones in `deleted` ({id: deletedAt}) so they spread to other devices too.
// Shared by the browser (window.SyncMerge) and the API (require).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SyncMerge = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const LISTS = ["visits", "prep", "problems"];
  const ts = r => (r && r.updatedAt) || 0;

  function merge(a, b) {
    a = a || {};
    b = b || {};
    const deleted = { ...(a.deleted || {}) };
    for (const [id, t] of Object.entries(b.deleted || {})) {
      deleted[id] = Math.max(deleted[id] || 0, t);
    }

    const out = { deleted };
    for (const key of LISTS) {
      const byId = new Map();
      for (const r of [...(a[key] || []), ...(b[key] || [])]) {
        if (!r || !r.id) continue;
        const cur = byId.get(r.id);
        if (!cur || ts(r) > ts(cur)) byId.set(r.id, r);
      }
      out[key] = [...byId.values()].filter(r => !(deleted[r.id] >= ts(r)));
    }

    out.experiments = { ...(a.experiments || {}) };
    for (const [week, e] of Object.entries(b.experiments || {})) {
      if (!out.experiments[week] || ts(e) > ts(out.experiments[week])) out.experiments[week] = e;
    }
    return out;
  }

  return { merge };
});
