// Sundin Scoreboard: one weekly quest across two tracks.
// Field = Sundin Systems shop visits. Prep = LeetCode, system design, behavioral.

const ACTIONS = [
  { key: "walkIn",   label: "Walked in",         pts: 3 },
  { key: "owner",    label: "Talked with owner", pts: 5 },
  { key: "problem",  label: "Problem quote",     pts: 5 },
  { key: "followUp", label: "Follow-up booked",  pts: 10 },
  { key: "yes",      label: "Founding yes",      pts: 25 },
  { key: "live",     label: "System live",       pts: 25 },
];

const PREP_KINDS = {
  lcNew:    { label: "LeetCode (new)",    track: "leetcode", pts: 3 },
  lcReview: { label: "LeetCode (review)", track: "leetcode", pts: 2 },
  design:   { label: "System design",     track: "design",   pts: 5 },
  story:    { label: "Behavioral story",  track: "story",    pts: 3 },
};

// Tracks double as chart series; order is fixed so colors never shift.
const TRACKS = [
  { key: "field",    label: "Field" },
  { key: "leetcode", label: "LeetCode" },
  { key: "design",   label: "System design" },
  { key: "story",    label: "Behavioral" },
];

// The weekly quest: small, fixed, and switchable in any order.
const QUEST = [
  { key: "field",    label: "Shops walked into",        target: 3 },
  { key: "leetcode", label: "LeetCode problems",        target: 5 },
  { key: "design",   label: "System design session",    target: 1 },
  { key: "story",    label: "Behavioral story practiced", target: 1 },
];

// Days after the first solve when a problem comes back for review.
const REVIEW_GAPS = [3, 10, 30];

const DESIGN_TOPICS = [
  "Margin Chat's architecture, explained out loud",
  "URL shortener",
  "Rate limiter",
  "Notification system",
  "Chat app",
  "News feed",
  "File storage and sync",
  "Search autocomplete",
  "Web crawler",
  "RAG document Q&A service",
];

const STORIES = [
  "The fraud-workflow bug you debugged in SIT",
  "The AI LA hackathon win",
  "Learning a codebase fast",
  "A disagreement and how it resolved",
  "A failure and what you changed",
  "Why you left medicine for software",
];

const STORE_KEY = "sundin-scoreboard-v1";
const L1_TARGET = 100, L2_TARGET = 3;

function load() {
  let data = {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) {}
  return normalize(data);
}
function normalize(data) {
  return {
    visits: Array.isArray(data.visits) ? data.visits : [],
    experiments: data.experiments || {},
    prep: Array.isArray(data.prep) ? data.prep : [],
    problems: Array.isArray(data.problems) ? data.problems : [],
  };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}
let state = load();

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Weeks start on Monday, so a Saturday field block belongs to that week.
function weekStart(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return isoDate(d);
}
function isoDate(d) {
  const local = new Date(d);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}
function today() { return isoDate(new Date()); }
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function visitPoints(v) {
  return ACTIONS.reduce((sum, a) => sum + (v.actions[a.key] ? a.pts : 0), 0);
}

// Every scored event as {date, track, pts, label}: what the quest and charts read.
function events() {
  const out = [];
  for (const v of state.visits) {
    out.push({ date: v.date, track: "field", pts: visitPoints(v), label: v.shop, walkIn: !!v.actions.walkIn });
  }
  for (const p of state.prep) {
    const kind = PREP_KINDS[p.kind];
    if (kind) out.push({ date: p.date, track: kind.track, pts: kind.pts, label: `${kind.label}: ${p.label}` });
  }
  return out;
}

function questProgress(week, evs = events()) {
  const inWeek = evs.filter(e => weekStart(e.date) === week);
  return QUEST.map(q => {
    const done = q.key === "field"
      ? inWeek.filter(e => e.track === "field" && e.walkIn).length
      : inWeek.filter(e => e.track === q.key).length;
    return { ...q, done, met: done >= q.target };
  });
}

// Consecutive weeks meeting a test, counting back from this week.
// The current week doesn't break a streak until it's over.
function weekStreak(test) {
  let week = weekStart(today());
  let count = 0;
  if (!test(week)) week = addDays(week, -7);
  while (test(week)) {
    count++;
    week = addDays(week, -7);
  }
  return count;
}
function hasFieldBlock(week) {
  return state.visits.some(v => v.actions.walkIn && weekStart(v.date) === week);
}
function questComplete(week) {
  return questProgress(week).every(q => q.met);
}

function dueProblems() {
  const t = today();
  return state.problems
    .filter(p => p.nextDue && p.nextDue <= t)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}

function render() {
  renderQuest();
  renderField();
  renderPrep();
  if (activeTab === "progress" && window.renderCharts) window.renderCharts(state, events());
}

function renderQuest() {
  const week = weekStart(today());
  const rows = questProgress(week);
  document.getElementById("questRows").innerHTML = rows.map(q => `
    <div class="quest-row${q.met ? " met" : ""}" data-quest="${q.key}">
      <div class="quest-label"><span>${q.met ? "✓ " : ""}${esc(q.label)}</span><span class="num">${Math.min(q.done, q.target)} / ${q.target}</span></div>
      <div class="bar"><div style="width:${Math.min(100, q.done / q.target * 100)}%"></div></div>
    </div>`).join("");
  const n = weekStreak(questComplete);
  const left = rows.filter(q => !q.met).length;
  document.getElementById("questStreak").textContent =
    `Full-quest streak: ${n} week${n === 1 ? "" : "s"}. ` +
    (left ? `${left} to go this week, in any order.` : "This week's quest is complete.");
}

function renderField() {
  const total = state.visits.reduce((s, v) => s + visitPoints(v), 0);
  const thisWeek = weekStart(today());
  const weekPts = state.visits.filter(v => weekStart(v.date) === thisWeek).reduce((s, v) => s + visitPoints(v), 0);
  const liveShops = new Set(state.visits.filter(v => v.actions.live).map(v => v.shop.trim().toLowerCase())).size;

  document.getElementById("total").textContent = total;
  document.getElementById("weekPts").textContent = `${weekPts} this week`;

  document.getElementById("l1").innerHTML = total >= L1_TARGET
    ? `<span class="unlocked">Unlocked</span>`
    : `${total} <small>/ ${L1_TARGET} pts</small>`;
  document.getElementById("l1bar").style.width = Math.min(100, total / L1_TARGET * 100) + "%";

  document.getElementById("l2").innerHTML = liveShops >= L2_TARGET
    ? `<span class="unlocked">Unlocked</span>`
    : `${liveShops} <small>/ ${L2_TARGET} shops live</small>`;
  document.getElementById("l2bar").style.width = Math.min(100, liveShops / L2_TARGET * 100) + "%";

  const streak = weekStreak(hasFieldBlock);
  document.getElementById("streak").innerHTML = `${streak} <small>week${streak === 1 ? "" : "s"}</small>`;
  document.getElementById("streakNote").textContent = hasFieldBlock(thisWeek) ? "This week's field block is done." : "No field block yet this week.";

  const visits = [...state.visits].sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById("visitTable").innerHTML = visits.length
    ? `<tr><th>Date</th><th>Shop</th><th>Area</th><th>Done</th><th class="num">Pts</th><th></th></tr>` +
      visits.map(v => `<tr>
        <td>${esc(v.date)}</td><td>${esc(v.shop)}</td><td>${esc(v.area)}</td>
        <td>${ACTIONS.filter(a => v.actions[a.key]).map(a => a.label).join(", ")}${v.notes ? `<div class="muted">${esc(v.notes)}</div>` : ""}</td>
        <td class="num">${visitPoints(v)}</td>
        <td><button class="link" data-del-visit="${v.id}" title="Delete">✕</button></td></tr>`).join("")
    : `<tr><td class="muted">No visits yet. Your first walk-in is worth 3 points.</td></tr>`;

  const quotes = visits.filter(v => v.quote);
  document.getElementById("quotes").innerHTML = quotes.length
    ? quotes.map(v => `<blockquote>${esc(v.quote)}<cite>${esc(v.shop)}, ${esc(v.date)}</cite></blockquote>`).join("")
    : `<p class="muted">Quotes you log show up here. They become your sales page, in owners' own words.</p>`;

  document.getElementById("eWeek").textContent = thisWeek;
  const cur = state.experiments[thisWeek] || {};
  document.getElementById("eVar").value = cur.variable || "";
  document.getElementById("eHyp").value = cur.hypothesis || "";
  document.getElementById("eResult").value = cur.result || "";
  const exps = Object.entries(state.experiments).sort((a, b) => b[0].localeCompare(a[0]));
  document.getElementById("expTable").innerHTML = exps.length
    ? `<tr><th>Week of</th><th>Variable</th><th>Hypothesis</th><th>Result</th></tr>` +
      exps.map(([w, e]) => `<tr><td>${esc(w)}</td><td>${esc(e.variable)}</td><td>${esc(e.hypothesis)}</td><td>${esc(e.result)}</td></tr>`).join("")
    : "";
}

function renderPrep() {
  // Show a few at a time so a backlog never feels like a wall.
  const allDue = dueProblems();
  const due = allDue.slice(0, 3);
  const more = allDue.length - due.length;
  document.getElementById("dueList").innerHTML = due.length
    ? due.map(p => `<li><span>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : esc(p.name)}
        <span class="muted">· review ${p.stage + 1} of ${REVIEW_GAPS.length}</span></span>
        <button data-review="${p.id}">Reviewed +2</button></li>`).join("") +
      (more > 0 ? `<li class="muted">${more} more due after these.</li>` : "")
    : `<li class="muted">Nothing due. Log a new problem below and it comes back in ${REVIEW_GAPS[0]} days.</li>`;

  const counts = kind => label => state.prep.filter(p => p.kind === kind && p.label === label).length;
  const designCount = counts("design");
  document.getElementById("designList").innerHTML = DESIGN_TOPICS.map(t => {
    const n = designCount(t);
    return `<li><span>${n ? "✓ " : ""}${esc(t)}${n > 1 ? ` <span class="muted">×${n}</span>` : ""}</span>
      <button data-design="${esc(t)}">Did a session +5</button></li>`;
  }).join("");

  const storyCount = counts("story");
  document.getElementById("storyList").innerHTML = STORIES.map(t => {
    const n = storyCount(t);
    return `<li><span>${n ? "✓ " : ""}${esc(t)}${n > 1 ? ` <span class="muted">×${n}</span>` : ""}</span>
      <button data-story="${esc(t)}">Practiced +3</button></li>`;
  }).join("");

  const recent = [...state.prep].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 10);
  document.getElementById("prepTable").innerHTML = recent.length
    ? `<tr><th>Date</th><th>What</th><th class="num">Pts</th><th></th></tr>` +
      recent.map(p => `<tr><td>${esc(p.date)}</td><td>${esc(PREP_KINDS[p.kind]?.label)}: ${esc(p.label)}</td>
        <td class="num">${PREP_KINDS[p.kind]?.pts ?? 0}</td>
        <td><button class="link" data-del-prep="${p.id}" title="Delete">✕</button></td></tr>`).join("")
    : `<tr><td class="muted">No prep logged yet.</td></tr>`;
}

function logPrep(kind, label, extra = {}) {
  state.prep.push({ id: uid(), date: today(), kind, label, ...extra });
}

// Tabs
let activeTab = "field";
function showTab(name) {
  activeTab = name;
  document.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name));
  document.querySelectorAll(".tab").forEach(s => { s.hidden = s.id !== `tab-${name}`; });
  try { sessionStorage.setItem("sundin-tab", name); } catch (e) {}
  if (name === "progress" && window.renderCharts) window.renderCharts(state, events());
}
document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));

// Field forms
document.getElementById("actionChecks").innerHTML = ACTIONS.map(a =>
  `<label><input type="checkbox" name="${a.key}" ${a.key === "walkIn" ? "checked" : ""}> ${a.label} <span class="muted">+${a.pts}</span></label>`
).join("");
document.getElementById("vDate").value = today();

document.getElementById("visitForm").addEventListener("submit", e => {
  e.preventDefault();
  const actions = {};
  ACTIONS.forEach(a => { actions[a.key] = document.querySelector(`input[name=${a.key}]`).checked; });
  const quote = document.getElementById("vQuote").value.trim();
  if (quote) actions.problem = true;
  state.visits.push({
    id: uid(),
    date: document.getElementById("vDate").value,
    shop: document.getElementById("vShop").value.trim(),
    area: document.getElementById("vArea").value.trim(),
    actions, quote,
    notes: document.getElementById("vNotes").value.trim(),
  });
  save();
  e.target.reset();
  document.getElementById("vDate").value = today();
  document.querySelector("input[name=walkIn]").checked = true;
  render();
});

document.getElementById("expForm").addEventListener("submit", e => {
  e.preventDefault();
  state.experiments[weekStart(today())] = {
    variable: document.getElementById("eVar").value.trim(),
    hypothesis: document.getElementById("eHyp").value.trim(),
    result: document.getElementById("eResult").value.trim(),
  };
  save();
  render();
});

// Prep forms
document.getElementById("lcForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("lcName").value.trim();
  const url = document.getElementById("lcUrl").value.trim();
  const difficulty = document.getElementById("lcDiff").value;
  const problem = { id: uid(), name, url, difficulty, firstDate: today(), stage: 0, nextDue: addDays(today(), REVIEW_GAPS[0]) };
  state.problems.push(problem);
  logPrep("lcNew", name, { problemId: problem.id, difficulty });
  save();
  e.target.reset();
  render();
});

document.body.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;
  const d = t.dataset;
  if (d.delVisit) {
    state.visits = state.visits.filter(v => v.id !== d.delVisit);
  } else if (d.delPrep) {
    state.prep = state.prep.filter(p => p.id !== d.delPrep);
  } else if (d.review) {
    const p = state.problems.find(x => x.id === d.review);
    if (!p) return;
    logPrep("lcReview", p.name, { problemId: p.id });
    p.stage += 1;
    p.nextDue = p.stage < REVIEW_GAPS.length ? addDays(today(), REVIEW_GAPS[p.stage]) : null;
  } else if (d.design) {
    logPrep("design", d.design);
  } else if (d.story) {
    logPrep("story", d.story);
  } else {
    return;
  }
  save();
  render();
});

// Data
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sundin-scoreboard-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (Array.isArray(data.visits)) {
      state = normalize(data);
      save();
      render();
    }
  } catch (err) {
    console.error("Import failed", err);
  }
  e.target.value = "";
});

window.addEventListener("resize", () => {
  if (activeTab === "progress" && window.renderCharts) window.renderCharts(state, events());
});

let savedTab = "field";
try { savedTab = sessionStorage.getItem("sundin-tab") || "field"; } catch (e) {}
render();
showTab(savedTab);

// Installed-app support: offline cache plus "Restart now" when a new deploy lands.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  let restartRequested = false;
  const banner = document.getElementById("updateBanner");
  const showUpdate = worker => {
    banner.hidden = false;
    document.getElementById("restartBtn").onclick = () => {
      restartRequested = true;
      worker.postMessage("SKIP_WAITING");
    };
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (restartRequested) location.reload();
  });

  navigator.serviceWorker.register("sw.js").then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate(worker);
      });
    });
    // iPhone home-screen apps resume rather than relaunch, so check on every return too.
    const check = () => reg.update().catch(() => {});
    setInterval(check, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
  }).catch(err => console.error("Service worker registration failed", err));

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
