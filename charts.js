// D3 charts for the Progress tab. app.js calls window.renderCharts(state, events)
// whenever the tab is shown or the data changes.
(function () {
  const TRACKS = [
    { key: "field",    label: "Field",         color: "--s1" },
    { key: "leetcode", label: "LeetCode",      color: "--s2" },
    { key: "design",   label: "System design", color: "--s3" },
    { key: "story",    label: "Behavioral",    color: "--s4" },
  ];
  const FUNNEL = [
    { key: "walkIn",   label: "Walked in" },
    { key: "owner",    label: "Talked with owner" },
    { key: "problem",  label: "Problem quote" },
    { key: "followUp", label: "Follow-up booked" },
    { key: "yes",      label: "Founding yes" },
    { key: "live",     label: "System live" },
  ];
  const WEEKS = 12;
  const HEAT_WEEKS = 18;

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parse = d3.timeParse("%Y-%m-%d");
  const fmt = d3.timeFormat("%Y-%m-%d");
  const short = d3.timeFormat("%b %-d");
  const monday = d => d3.timeMonday.floor(d);

  let selectedWeek = null;

  const tip = d3.select("body").append("div").attr("class", "chart-tip").attr("role", "tooltip").style("opacity", 0);
  function showTip(event, html) {
    tip.html(html).style("opacity", 1);
    const box = tip.node().getBoundingClientRect();
    let x = event.clientX + 12, y = event.clientY - box.height - 12;
    if (x + box.width > window.innerWidth - 8) x = event.clientX - box.width - 12;
    if (y < 8) y = event.clientY + 16;
    tip.style("left", `${x + window.scrollX}px`).style("top", `${y + window.scrollY}px`);
  }
  function hideTip() { tip.style("opacity", 0); }
  // Mouse hover and finger tap both open the tooltip.
  function hover(sel, html) {
    sel.on("pointerenter pointermove pointerdown", (event, d) => showTip(event, html(d)))
       .on("pointerleave", hideTip);
  }

  function setup(id, height, margin) {
    const el = document.getElementById(id);
    const width = Math.max(280, el.clientWidth);
    d3.select(el).selectAll("svg").remove();
    const svg = d3.select(el).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", width).attr("height", height);
    return { svg, width, height, inner: { w: width - margin.left - margin.right, h: height - margin.top - margin.bottom }, margin };
  }

  function styleAxis(g) {
    g.selectAll("path.domain").remove();
    g.selectAll("line").attr("stroke", css("--line"));
    g.selectAll("text").attr("fill", css("--muted")).style("font-size", "11px");
  }

  function weeklyChart(events) {
    const thisWeek = monday(new Date());
    const weeks = d3.range(WEEKS).map(i => d3.timeWeek.offset(thisWeek, i - WEEKS + 1));
    const byWeek = new Map(weeks.map(w => [fmt(w), Object.fromEntries(TRACKS.map(t => [t.key, 0]))]));
    for (const e of events) {
      const row = byWeek.get(fmt(monday(parse(e.date))));
      if (row) row[e.track] += e.pts;
    }
    const data = weeks.map(w => ({ week: fmt(w), date: w, ...byWeek.get(fmt(w)) }));
    const stack = d3.stack().keys(TRACKS.map(t => t.key))(data);

    const margin = { top: 8, right: 8, bottom: 24, left: 32 };
    const { svg, inner } = setup("chartWeekly", 220, margin);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(data.map(d => d.week)).range([0, inner.w]).paddingInner(0.25);
    const maxY = d3.max(data, d => TRACKS.reduce((s, t) => s + d[t.key], 0)) || 10;
    const y = d3.scaleLinear().domain([0, maxY]).nice().range([inner.h, 0]);

    g.append("g").call(d3.axisLeft(y).ticks(4).tickSize(-inner.w)).call(styleAxis)
      .selectAll("line").attr("stroke-opacity", 0.6);
    const every = Math.ceil(WEEKS / Math.max(1, Math.floor(inner.w / 60)));
    g.append("g").attr("transform", `translate(0,${inner.h})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(8).tickFormat((d, i) => i % every === 0 ? short(parse(d)) : ""))
      .call(styleAxis);

    // 2px surface gap between stacked segments.
    const gap = 2;
    g.append("g").selectAll("g").data(stack).join("g")
      .attr("fill", s => css(TRACKS.find(t => t.key === s.key).color))
      .selectAll("rect").data(s => s.map(d => ({ ...d, key: s.key }))).join("rect")
        .attr("x", d => x(d.data.week))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d[1]))
        .attr("height", d => Math.max(0, y(d[0]) - y(d[1]) - (d[1] > d[0] ? gap : 0)))
        .attr("rx", 2)
        .attr("opacity", d => !selectedWeek || selectedWeek === d.data.week ? 1 : 0.35);

    // Full-height hit targets, bigger than the marks.
    const hits = g.append("g").selectAll("rect").data(data).join("rect")
      .attr("x", d => x(d.week) - x.step() * x.paddingInner() / 2)
      .attr("width", x.step()).attr("y", 0).attr("height", inner.h)
      .attr("class", "hit").attr("fill", "transparent").style("cursor", "pointer");
    hover(hits, d => {
      const total = TRACKS.reduce((s, t) => s + d[t.key], 0);
      return `<strong>Week of ${short(d.date)}</strong><br>` +
        TRACKS.map(t => `<span class="sw" style="background:${css(t.color)}"></span>${t.label}: ${d[t.key]}`).join("<br>") +
        `<br><strong>Total: ${total}</strong><div class="muted">Tap to see entries</div>`;
    });
    hits.on("click", (event, d) => {
      selectedWeek = selectedWeek === d.week ? null : d.week;
      window.renderCharts(window.__chartState, window.__chartEvents);
    });

    const detail = document.getElementById("weekDetail");
    if (selectedWeek) {
      const list = events.filter(e => fmt(monday(parse(e.date))) === selectedWeek)
        .sort((a, b) => a.date.localeCompare(b.date));
      detail.innerHTML = `<h3>Week of ${short(parse(selectedWeek))}</h3>` + (list.length
        ? `<ul>${list.map(e => `<li><span class="sw" style="background:${css(TRACKS.find(t => t.key === e.track).color)}"></span>${e.date} · ${escapeHtml(e.label)} <span class="muted">+${e.pts}</span></li>`).join("")}</ul>`
        : `<p class="muted">Nothing logged that week.</p>`);
    } else {
      detail.innerHTML = `<p class="muted">Tap a week to list what you logged.</p>`;
    }
  }

  function heatmap(events) {
    const end = d3.timeDay.floor(new Date());
    const start = d3.timeWeek.offset(monday(end), -(HEAT_WEEKS - 1));
    const days = d3.timeDay.range(start, d3.timeDay.offset(end, 1));
    const pts = d3.rollup(events, v => d3.sum(v, e => e.pts), e => e.date);

    const margin = { top: 16, right: 4, bottom: 4, left: 30 };
    const el = document.getElementById("chartHeat");
    const avail = Math.max(280, el.clientWidth) - margin.left - margin.right;
    const cell = Math.min(18, Math.floor(avail / HEAT_WEEKS) - 2);
    const step = cell + 2;
    const { svg } = setup("chartHeat", margin.top + margin.bottom + step * 7, margin);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // One hue, light to dark, with the empty step on the track color.
    const color = d3.scaleThreshold().domain([1, 5, 10, 20])
      .range([css("--bar"), css("--seq1"), css("--seq2"), css("--seq3"), css("--seq4")]);

    ["Mon", "", "Wed", "", "Fri", "", ""].forEach((lbl, i) => {
      g.append("text").attr("x", -4).attr("y", i * step + cell / 2).attr("dy", "0.35em")
        .attr("text-anchor", "end").attr("fill", css("--muted")).style("font-size", "10px").text(lbl);
    });
    const months = d3.timeMonth.range(d3.timeMonth.ceil(start), end);
    g.selectAll("text.month").data(months).join("text").attr("class", "month")
      .attr("x", d => d3.timeWeek.count(start, d) * step).attr("y", -5)
      .attr("fill", css("--muted")).style("font-size", "10px").text(d3.timeFormat("%b"));

    const cells = g.selectAll("rect").data(days).join("rect")
      .attr("x", d => d3.timeMonday.count(start, d) * step)
      .attr("y", d => ((d.getDay() + 6) % 7) * step)
      .attr("width", cell).attr("height", cell).attr("rx", 3)
      .attr("fill", d => color(pts.get(fmt(d)) || 0));
    hover(cells, d => `<strong>${d3.timeFormat("%a %b %-d")(d)}</strong><br>${pts.get(fmt(d)) || 0} points`);
  }

  function funnel(state) {
    const data = FUNNEL.map(f => ({ ...f, n: state.visits.filter(v => v.actions[f.key]).length }));
    const margin = { top: 4, right: 40, bottom: 4, left: 132 };
    const rowH = 28;
    const { svg, inner } = setup("chartFunnel", margin.top + margin.bottom + rowH * data.length, margin);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.n) || 1]).range([0, inner.w]);
    const y = d3.scaleBand().domain(data.map(d => d.key)).range([0, inner.h]).paddingInner(0.3);

    g.selectAll("text.lbl").data(data).join("text").attr("class", "lbl")
      .attr("x", -8).attr("y", d => y(d.key) + y.bandwidth() / 2).attr("dy", "0.35em")
      .attr("text-anchor", "end").attr("fill", css("--text")).style("font-size", "12px").text(d => d.label);
    g.selectAll("rect.track").data(data).join("rect").attr("class", "track")
      .attr("x", 0).attr("y", d => y(d.key)).attr("width", inner.w).attr("height", y.bandwidth())
      .attr("rx", 4).attr("fill", css("--bar"));
    const bars = g.selectAll("rect.val").data(data).join("rect").attr("class", "val")
      .attr("x", 0).attr("y", d => y(d.key)).attr("width", d => d.n ? Math.max(4, x(d.n)) : 0)
      .attr("height", y.bandwidth()).attr("rx", 4).attr("fill", css("--s1"));
    g.selectAll("text.val").data(data).join("text").attr("class", "val")
      .attr("x", inner.w + 8).attr("y", d => y(d.key) + y.bandwidth() / 2).attr("dy", "0.35em")
      .attr("fill", css("--text")).style("font-size", "12px").style("font-variant-numeric", "tabular-nums").text(d => d.n);
    const top = data[0].n;
    hover(g.selectAll("rect.track"), d => `<strong>${d.label}</strong><br>${d.n} visit${d.n === 1 ? "" : "s"}` +
      (top && d.key !== "walkIn" ? `<br>${Math.round(d.n / top * 100)}% of walk-ins` : ""));
    bars.style("pointer-events", "none");
  }

  function leetcodeLine(state) {
    const firsts = state.problems.map(p => p.firstDate).sort();
    const el = document.getElementById("chartLeetcode");
    if (!firsts.length) {
      d3.select(el).selectAll("svg").remove();
      el.querySelector(".empty").hidden = false;
      return;
    }
    el.querySelector(".empty").hidden = true;
    const start = d3.timeDay.offset(parse(firsts[0]), -1);
    const end = d3.timeDay.floor(new Date());
    const counts = d3.rollup(firsts, v => v.length, d => d);
    let running = 0;
    const data = d3.timeDay.range(start, d3.timeDay.offset(end, 1)).map(d => {
      running += counts.get(fmt(d)) || 0;
      return { date: d, total: running };
    });

    const margin = { top: 8, right: 12, bottom: 24, left: 32 };
    const { svg, inner } = setup("chartLeetcode", 180, margin);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleTime().domain([start, end]).range([0, inner.w]);
    const y = d3.scaleLinear().domain([0, Math.max(5, running)]).nice().range([inner.h, 0]);
    g.append("g").call(d3.axisLeft(y).ticks(4).tickSize(-inner.w)).call(styleAxis)
      .selectAll("line").attr("stroke-opacity", 0.6);
    g.append("g").attr("transform", `translate(0,${inner.h})`)
      .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(inner.w / 80))).tickSize(0).tickPadding(8).tickFormat(short))
      .call(styleAxis);
    g.append("path").datum(data).attr("fill", "none").attr("stroke", css("--s2")).attr("stroke-width", 2)
      .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.total)).curve(d3.curveStepAfter));

    // Crosshair + tooltip.
    const rule = g.append("line").attr("y1", 0).attr("y2", inner.h).attr("stroke", css("--muted")).attr("opacity", 0);
    const dot = g.append("circle").attr("r", 4).attr("fill", css("--s2")).attr("stroke", css("--panel")).attr("stroke-width", 2).attr("opacity", 0);
    const bisect = d3.bisector(d => d.date).center;
    g.append("rect").attr("width", inner.w).attr("height", inner.h).attr("fill", "transparent")
      .on("pointerenter pointermove pointerdown", event => {
        const d = data[bisect(data, x.invert(d3.pointer(event)[0]))];
        rule.attr("x1", x(d.date)).attr("x2", x(d.date)).attr("opacity", 0.5);
        dot.attr("cx", x(d.date)).attr("cy", y(d.total)).attr("opacity", 1);
        showTip(event, `<strong>${short(d.date)}</strong><br>${d.total} problem${d.total === 1 ? "" : "s"} solved`);
      })
      .on("pointerleave", () => { rule.attr("opacity", 0); dot.attr("opacity", 0); hideTip(); });
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  window.renderCharts = function (state, events) {
    if (typeof d3 === "undefined") return;
    window.__chartState = state;
    window.__chartEvents = events;
    hideTip();
    weeklyChart(events);
    heatmap(events);
    funnel(state);
    leetcodeLine(state);
  };
})();
