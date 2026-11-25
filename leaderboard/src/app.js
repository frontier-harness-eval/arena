/* The Arena leaderboard page: one board per model (All models at the site root, each model at <model id>/), drawn
   from data/lite.json in the main dashboard's v1.1 leaderboard layout: the pass rate against cost (or time) plot,
   rankings with task previews, a sticky rail with the model selector and section links, and the methodology. */
import { DASH, dur, esc, pct, usd } from "./format.js";
import { boards } from "./lite.js";
import { methodRows } from "./method.js";
import { participateHTML } from "./participate.js";
import { mountThemeToggle } from "./theme.js";

const ROOT = document.documentElement.dataset.root || "./";
const MODEL = document.documentElement.dataset.model || "all";
const PAGE = document.documentElement.dataset.page || "leaderboard";
const SHAPES = ["circle", "square", "diamond", "triangle", "hexagon"];
const PALETTE = ["#9385ff", "#f0a57f", "#75b8ed", "#83d7c5", "#f2a777", "#a978e7", "#d3d3d3", "#e57373", "#ffd54f", "#81c784"];
const SECTIONS = [["cost", "Cost per pass"], ["task-cost", "Cost per task"], ["quality", "Quality"], ["time", "Speed"], ["methodology", "Methodology"]];
const CHARTS = [
  { id: "cost", title: "Cost per pass", metric: "cost_per_pass", rank: "cost_rank", format: usd, preview: "cost" },
  { id: "task-cost", title: "Average cost per task", metric: "cost_per_task", format: usd, ascending: true, preview: "cost" },
  { id: "quality", title: "Pass rate", metric: "pass_rate", format: (v) => pct(v), preview: "passes" },
  { id: "time", title: "Time per pass", metric: "time_per_pass", rank: "time_rank", format: dur, preview: "seconds" },
];
const CHEVRON = `<svg class="model-select-chevron" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const modelHref = (id) => (id === "all" ? ROOT : `${ROOT}${encodeURIComponent(id)}/`);

/* The page's view of one board: harness rows with their colour, marker and logo. Markers and colours follow the
   harness across models (its index in the data), so switching model doesn't reshuffle them. */
function view(data, all, b) {
  const meta = new Map(data.harnesses.map((h, i) => [h.id, {
    ...h, shape: SHAPES[i % SHAPES.length],
    color: !h.color ? PALETTE[i % PALETTE.length] : typeof h.color === "string" ? h.color : `light-dark(${h.color.light}, ${h.color.dark})`,
  }]));
  const at = (n) => meta.get(n) || {};
  return {
    data, board: b, models: all.map((x) => ({ model: x.model, label: x.label })),
    harnesses: b.harnesses,
    label: (n) => at(n).label || n, color: (n) => at(n).color || PALETTE[0], shape: (n) => at(n).shape || SHAPES[0],
    logo: (n) => at(n).logo,
  };
}

// ------------------------------------------------------------------ head
function modelsHTML(v, fromRail) {
  const cur = v.board;
  return `<details class="model-select"><summary aria-label="${esc(`Model: ${cur.label}`)}"><span class="model-select-label">${v.models.map((m) =>
    `<span${m.model === cur.model ? "" : ' aria-hidden="true"'}>${esc(m.label)}</span>`).join("")}</span>${CHEVRON}</summary><nav aria-label="Model">${v.models.map((m) =>
    `<a href="${modelHref(m.model)}"${fromRail ? " data-keep-section" : ""}${m.model === cur.model ? ' aria-current="page"' : ""}>${esc(m.label)}</a>`).join("")}</nav></details>`;
}

function headHTML() {
  return `<div class="page-head">
    <h1>Leaderboard</h1>
  </div>`;
}

// --------------------------------------------------------------- scatter
const COST_TICKS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const FINE_COST_TICKS = [0.01, 0.1, 1, 10].flatMap((d) => [1, 1.5, 2, 3, 4, 5, 6, 7, 8].map((k) => +(d * k).toPrecision(2)));
/* Cost ticks kept inside the plot; a range between two 1-2-5 ticks takes finer steps. */
function costTicks(xMin, xMax) {
  const at = (x) => 8 + (Math.log(x / xMin) / Math.log(xMax / xMin)) * 84, inside = (x) => at(x) >= 0 && at(x) <= 100;
  const ticks = COST_TICKS.filter((x) => x >= xMin * 0.9 && x <= xMax * 1.1 && inside(x));
  return ticks.length ? ticks : FINE_COST_TICKS.filter(inside);
}
const AXES = { cost: { key: "cost_per_task", label: "Average cost per task" }, time: { key: "time_per_task", label: "Average time per task" } };
function scatterModel(rows, metric) {
  const x = (h) => h[AXES[metric].key], y = (h) => h.pass_rate;
  const xs = rows.map(x), ys = rows.map(y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const norm = (val, lo, hi) => (hi === lo ? 50 : 8 + ((val - lo) / (hi - lo)) * 84);
  const xPos = (val) => (metric === "cost" && xMax > xMin ? 8 + (Math.log(val / xMin) / Math.log(xMax / xMin)) * 84 : norm(val, xMin, xMax));
  const frontier = rows.filter((h) => !rows.some((c) => x(c) <= x(h) && y(c) >= y(h) && (x(c) < x(h) || y(c) > y(h)))).sort((a, b) => x(a) - x(b));
  const yTicks = Array.from({ length: 4 }, (_, i) => yMin + ((yMax - yMin) * i) / 3);
  const xTicks = metric === "cost" ? costTicks(xMin, xMax) : Array.from({ length: 4 }, (_, i) => xMin + ((xMax - xMin) * i) / 3);
  return { x, y, xPos, yPos: (h) => norm(y(h), yMin, yMax), yTickPos: (t) => norm(t, yMin, yMax), frontier, xTicks, yTicks };
}

/* Drawn like the theme toggle's icons. */
const TROPHY = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 2.5h7v3a3.5 3.5 0 0 1-7 0z"/><path d="M4.5 3.5H2.5v.8a2.2 2.2 0 0 0 2.2 2.2M11.5 3.5h2v.8a2.2 2.2 0 0 1-2.2 2.2"/><path d="M8 9v3M5.5 13.5h5"/></svg>';

function scatterHTML(v) {
  return `<section class="card scatter" aria-label="Pass rate against cost">
    <div class="scatter-toolbar"><div class="board-toggles">${modelsHTML(v, false)}</div>
      <div class="seg metric-toggle" role="group" aria-label="Plot against"><button type="button" aria-pressed="true" data-metric="cost">Cost</button><button type="button" aria-pressed="false" data-metric="time">Speed</button></div></div>
    <div class="scatter-plot"></div><div class="scatter-axis-x"></div></section>
  <p class="scatter-cta"><a class="button-link" href="${ROOT}participate/">${TROPHY}Participate</a></p>`;
}

function mountScatter(root, v) {
  const box = root.querySelector(".scatter"), plot = box.querySelector(".scatter-plot");
  const rows = v.harnesses.filter((h) => h.cost_per_task > 0 && h.time_per_task != null);
  let metric = "cost", m = scatterModel(rows, metric), activeId = null;
  const fmtX = (val) => (metric === "cost" ? usd(val) : dur(val));
  const fmtTick = (val) => (metric === "cost" ? `$${Number.isInteger(val) ? val : val.toFixed(val < 1 ? 2 : 1)}` : dur(val));
  const shapeHTML = (id) => `<i class="scatter-mark" data-shape="${v.shape(id)}"></i>`;
  const markHTML = (id) => (v.logo(id) ? `<img class="scatter-mark scatter-logo" src="${ROOT}static/${esc(v.logo(id))}" alt="">` : shapeHTML(id));
  const aria = (h, killed) => `${v.label(h.id)}: ${pct(h.pass_rate)} pass rate, ${fmtX(m.x(h))} ${AXES[metric].label.toLowerCase()}${killed ? ", dominated by selected harness" : ""}`;
  const draw = () => {
    const line = m.frontier.map((h) => `${m.xPos(m.x(h))},${100 - m.yPos(h)}`).join(" ");
    plot.innerHTML = `<svg class="pareto-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline class="pareto-line" points="${line}"></polyline></svg><div class="scatter-axis-y">Pass rate</div>`
      + m.yTicks.map((t) => `<div class="scatter-grid-y" style="bottom:${m.yTickPos(t)}%"><span>${pct(t)}</span></div>`).join("")
      + m.xTicks.map((t) => `<div class="scatter-grid-x" style="left:${m.xPos(t)}%"><span>${fmtTick(t)}</span></div>`).join("")
      + rows.map((h) => {
        const c = v.color(h.id), value = `${pct(h.pass_rate)} · ${fmtX(m.x(h))}`;
        return `<button class="scatter-point" type="button" data-harness="${esc(h.id)}"${m.frontier.includes(h) ? ' data-frontier="true"' : ""} style="left:${m.xPos(m.x(h))}%;bottom:${m.yPos(h)}%;color:${c}" aria-label="${esc(aria(h, false))}">${markHTML(h.id)}<span class="scatter-label">${esc(v.label(h.id))}<small>${value}</small></span><span class="scatter-tooltip"><strong>${esc(v.label(h.id))}</strong><small>${value}</small></span></button>`;
      }).join("");
    for (const img of plot.querySelectorAll(".scatter-logo")) {
      img.addEventListener("error", () => { img.outerHTML = shapeHTML(img.closest(".scatter-point").dataset.harness); }, { once: true });
    }
    box.querySelector(".scatter-axis-x").textContent = AXES[metric].label;
    activeId = null;
    delete box.dataset.active;
    arrange();
  };
  /* The hovered harness shades the region it dominates and greys every harness inside it. */
  const setActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    const svg = plot.querySelector(".pareto-layer"), a = rows.find((h) => h.id === id);
    svg.querySelectorAll(".kill-zone, .kill-line").forEach((e) => e.remove());
    if (a) {
      const x = m.xPos(m.x(a)), y = m.yPos(a);
      svg.insertAdjacentHTML("afterbegin", `<rect class="kill-zone" x="${x}" y="${100 - y}" width="${100 - x}" height="${y}"></rect><path class="kill-line" d="M ${x} 100 V ${100 - y} H 100"></path>`);
      box.dataset.active = "true";
    } else delete box.dataset.active;
    for (const btn of plot.querySelectorAll(".scatter-point")) {
      const h = rows.find((r) => r.id === btn.dataset.harness);
      const killed = !!(a && h !== a && m.x(h) >= m.x(a) && m.y(h) <= m.y(a) && (m.x(h) > m.x(a) || m.y(h) < m.y(a)));
      btn.toggleAttribute("data-killed", killed);
      btn.toggleAttribute("data-active", h === a);
      btn.setAttribute("aria-label", aria(h, killed));
    }
  };
  /* Each label tries positions around its point, top to bottom, and hides (leaving its tooltip) when none is free. */
  function arrange() {
    const labels = [...plot.querySelectorAll(".scatter-label")], marks = [...plot.querySelectorAll(".scatter-mark")];
    const area = plot.getBoundingClientRect(), placed = [];
    const overlaps = (a, b) => a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 3 && a.bottom > b.top - 3;
    const reset = (l) => { Object.assign(l.style, { left: "30px", right: "auto", transform: "translateY(-50%)", display: "" }); l.dataset.placement = "right"; };
    labels.forEach(reset);
    const top = (l) => l.parentElement.querySelector(".scatter-mark").getBoundingClientRect().top;
    const spots = [0, -26, 26, -52, 52, -78, 78].flatMap((offset) => [{ side: "right", offset }, { side: "left", offset }]);
    for (const l of labels.sort((a, b) => top(a) - top(b))) {
      const own = l.parentElement;
      const ok = spots.some((s) => {
        const left = s.side === "left";
        Object.assign(l.style, { left: left ? "auto" : "30px", right: left ? "30px" : "auto", transform: `translateY(calc(-50% + ${s.offset}px))` });
        l.dataset.placement = s.side;
        const r = l.getBoundingClientRect();
        return !placed.some((o) => overlaps(r, o)) && !marks.some((mk) => mk.parentElement !== own && overlaps(r, mk.getBoundingClientRect()))
          && r.left >= area.left + 4 && r.right <= area.right - 4 && r.top >= area.top + 4 && r.bottom <= area.bottom - 4;
      });
      if (!ok) { reset(l); l.style.display = "none"; continue; }
      placed.push(l.getBoundingClientRect());
    }
  }
  const pointOf = (e) => e.target.closest(".scatter-point");
  plot.addEventListener("mouseover", (e) => { const p = pointOf(e); if (p) setActive(p.dataset.harness); });
  plot.addEventListener("mouseout", (e) => { const p = pointOf(e); if (p && !p.contains(e.relatedTarget)) setActive(null); });
  plot.addEventListener("focusin", (e) => { const p = pointOf(e); if (p) setActive(p.dataset.harness); });
  plot.addEventListener("focusout", (e) => { if (pointOf(e)) setActive(null); });
  box.querySelector(".metric-toggle").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.metric === metric) return;
    metric = b.dataset.metric;
    m = scatterModel(rows, metric);
    box.querySelectorAll(".metric-toggle button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    draw();
  });
  draw();
  return arrange;
}

// -------------------------------------------------------------- rankings
function logoHTML(v, id) {
  const src = v.logo(id);
  return `<span class="logo-box" aria-hidden="true">${src ? `<img src="${ROOT}static/${esc(src)}" alt="">` : `<span style="background:${v.color(id)}"></span>`}</span>`;
}

/* A chart with a rank lists harnesses by that rank (equal values share it); the others sort on their value, the
   higher pass rate first on a tie. Values are compared as shown, so equal-looking values tie. */
const sortValue = (metric, x) => (metric === "time_per_pass" ? Math.round(x) : Math.round(x * 10000));
function chartHTML(v, chart) {
  const rows = chart.rank
    ? [...v.harnesses].sort((a, b) => a[chart.rank] - b[chart.rank] || b.pass_rate - a.pass_rate || a.order - b.order)
    : v.harnesses.filter((h) => typeof h[chart.metric] === "number").sort((a, b) => {
      const d = sortValue(chart.metric, a[chart.metric]) - sortValue(chart.metric, b[chart.metric]);
      return (chart.ascending ? d : -d) || b.pass_rate - a.pass_rate || v.label(a.id).localeCompare(v.label(b.id));
    });
  const max = Math.max(...rows.map((h) => h[chart.metric] ?? 0), 1e-9);
  return `<article class="chart-panel" id="${chart.id}"><header><h2>${esc(chart.title)}</h2></header><div class="rank-list">${rows.map((h, i) => {
    const val = h[chart.metric], width = chart.metric === "pass_rate" ? val * 100 : val == null ? 2 : Math.max((val / max) * 100, 2);
    return `<div class="metric-row" data-harness="${esc(h.id)}" data-chart="${chart.id}"><button class="rank-row" type="button" aria-expanded="false" aria-label="${esc(`${v.label(h.id)}: ${val == null ? DASH : chart.format(val)}. Show tasks`)}"><span class="rank">${String(chart.rank ? h[chart.rank] : i + 1).padStart(2, "0")}</span><span class="harness-name">${logoHTML(v, h.id)}<span>${esc(v.label(h.id))}</span></span><span class="bar-track"><i style="width:${width}%;background:${v.color(h.id)}"></i></span><strong>${val == null ? DASH : chart.format(val)}</strong></button></div>`;
  }).join("")}</div></article>`;
}

/* A harness's tasks under its row: passes over attempts, or the attempts' mean cost or time; a task most of whose
   attempts passed is marked as passed. */
function previewHTML(v, h, chart) {
  const tasks = [...h.tasks].sort((a, b) => b.passes / b.trials - a.passes / a.trials || a.task.localeCompare(b.task));
  const value = (t) => (chart.preview === "passes" ? `${t.passes}/${t.trials}` : chart.preview === "cost" ? usd(t.cost) : dur(t.seconds));
  return `<div class="task-preview" role="list" aria-label="${esc(`${v.label(h.id)} tasks`)}">${tasks.map((t) =>
    `<div class="task-preview-row" role="listitem"><span title="${esc(t.task)}">${esc(t.task)}</span><b class="${2 * t.passes > t.trials ? "pass" : "fail"}">${value(t)}</b></div>`).join("")}</div>`;
}

function mountRankings(root, v) {
  root.querySelector(".charts").addEventListener("click", (e) => {
    const btn = e.target.closest(".rank-row");
    if (!btn) return;
    const row = btn.parentElement, open = btn.getAttribute("aria-expanded") === "true";
    root.querySelectorAll('.rank-row[aria-expanded="true"]').forEach((b) => { b.setAttribute("aria-expanded", "false"); b.nextElementSibling?.remove(); });
    if (open) return;
    const h = v.harnesses.find((x) => x.id === row.dataset.harness), chart = CHARTS.find((c) => c.id === row.dataset.chart);
    btn.setAttribute("aria-expanded", "true");
    btn.insertAdjacentHTML("afterend", previewHTML(v, h, chart));
  });
}

// ----------------------------------------------------------- methodology
function methodHTML(v) {
  const row = ([k, val, aside, href]) => `<tr><td>${esc(k)}</td><td>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(val)}</a>` : esc(val)}${aside ? ` <span class="muted">${esc(aside)}</span>` : ""}</td></tr>`;
  return `<section class="chart-panel method" id="methodology"><header><h2>Methodology</h2></header><div class="card method-card"><table class="method-table">${methodRows(v.data, v.board.model).map(([title, rows]) =>
    `<tbody><tr><th colspan="2">${esc(title)}</th></tr>${rows.map(row).join("")}</tbody>`).join("")}</table></div>
    <div class="tested"><h3>Tested harnesses</h3><div>${v.data.harnesses.map((h) => `<span>${logoHTML(v, h.id)}<strong>${esc(h.label)}</strong><code>${h.version ? `v${esc(h.version)}` : DASH}</code></span>`).join("")}</div></div></section>`;
}

// -------------------------------------------------------------- the rail
function railHTML(v) {
  return `<nav class="results-rail" aria-label="Sections"><div class="rail-model">${modelsHTML(v, true)}</div>${SECTIONS.map(([id, label], i) =>
    `<a href="#${id}"${i ? "" : ' class="active" aria-current="location"'}>${label}</a>`).join("")}</nav>`;
}

/* The rail marks the section being read; a model picked from it opens on that section. */
function mountRail(root) {
  const rail = root.querySelector(".results-rail"), links = [...rail.querySelectorAll(":scope > a")];
  const nav = document.querySelector(".nav");
  const setActive = (id) => links.forEach((a) => {
    const on = a.getAttribute("href") === `#${id}`;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
  });
  const update = () => {
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) return setActive(SECTIONS.at(-1)[0]);
    const line = innerWidth <= 1050 ? rail.getBoundingClientRect().bottom + 72 : nav.getBoundingClientRect().bottom + 160;
    let current = SECTIONS[0][0];
    for (const [id] of SECTIONS) if (document.getElementById(id).getBoundingClientRect().top <= line) current = id;
    setActive(current);
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
  rail.addEventListener("click", (e) => {
    const pick = e.target.closest("a[data-keep-section]");
    if (!pick) return;
    const active = rail.querySelector(":scope > a.active");
    if (active) { e.preventDefault(); location.href = pick.getAttribute("href") + active.getAttribute("href"); }
  });
}

/* A model menu closes on a click outside or Escape; arrow keys move through its models. */
function mountMenus(root) {
  for (const menu of root.querySelectorAll(".model-select")) {
    const close = () => { menu.open = false; };
    document.addEventListener("click", (e) => { if (menu.open && !menu.contains(e.target)) close(); });
    menu.addEventListener("toggle", () => { if (menu.open) menu.querySelector("[aria-current]").focus({ preventScroll: true }); });
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.open) { close(); menu.querySelector("summary").focus(); return; }
      if (!menu.open || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      e.preventDefault();
      const links = [...menu.querySelectorAll("nav a")], at = links.indexOf(document.activeElement);
      links[(at + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length].focus();
    });
  }
}

// ----------------------------------------------------------------- mount
async function main() {
  const root = document.getElementById("main");
  mountThemeToggle(document.getElementById("theme-toggle"));
  try {
    const res = await fetch(`${ROOT}data/lite.json`);
    if (!res.ok) throw new Error(`${res.status} data/lite.json`);
    const data = await res.json();
    if (PAGE === "participate") {
      root.innerHTML = participateHTML(data);
      root.removeAttribute("aria-busy");
      return;
    }
    const all = boards(data);
    const b = all.find((x) => x.model === MODEL) || all[0], v = view(data, all, b);
    root.innerHTML = `${headHTML()}${scatterHTML(v)}<div class="results">${railHTML(v)}<div class="charts">${CHARTS.map((c) => chartHTML(v, c)).join("")}${methodHTML(v)}</div></div>`;
    root.removeAttribute("aria-busy");
    const arrange = mountScatter(root, v);
    mountRankings(root, v);
    mountMenus(root);
    mountRail(root);
    addEventListener("resize", arrange);
    if (document.fonts) document.fonts.ready.then(arrange);
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  } catch (e) {
    root.innerHTML = `<div class="empty-state">leaderboard unavailable: ${esc(e.message)}</div>`;
  }
}
main();
