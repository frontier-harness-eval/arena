/* The Arena logo, drawn around the FH mark in static/logo.png (the main dashboard's 128px mark, which build-data.mjs
   copies). The mark is embedded, so each SVG stands alone, including when it is used as an <img> or an icon.
     static/arena-logo.svg      the app tile: the mark over a navy ARENA pill
     static/arena-icon.svg      the tile alone, for the nav and the favicon, where the pill would be unreadable
     static/apple-touch-icon.png  arena-logo.svg at 180px, square, as iOS rounds it
     static/favicon-32.png, static/favicon-48.png  arena-icon.svg
   The pill's letters are strokes, so the logo needs no font. Headless Chrome renders the PNGs.
   node scripts/build-logo.mjs */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATIC = path.join(ROOT, "static");
const MARK = `data:image/png;base64,${readFileSync(path.join(STATIC, "logo.png")).toString("base64")}`;
/* The mark's ink in logo.png's 128px square: x 9-118, y 32-95. */
const INK = { x: 9, y: 32, w: 110, h: 64 };
const SIZE = 512, RADIUS = 108;
/* style.css's --arena-navy, for the nav's ARENA pill. */
const NAVY = "#0b1631";
const EDGE = "#dcdfe5";

/* Bold caps on a 10-unit cap height, as strokes. */
const GLYPHS = {
  A: { w: 7.2, d: "M0 10L3.6 0L7.2 10M1.55 6.6H5.65" },
  R: { w: 6.35, d: "M0 10V0H3.7A2.65 2.65 0 0 1 3.7 5.3H0M3.4 5.3L6.3 10" },
  E: { w: 6, d: "M6 0H0V10H6M0 5H5.3" },
  N: { w: 6.4, d: "M0 10V0L6.4 10V0" },
};
const STROKE = 2.7, TRACK = 4.4;

function word(text, scale, cx, cy) {
  const width = [...text].reduce((s, c) => s + GLYPHS[c].w, 0) + TRACK * (text.length - 1);
  let x = 0;
  const paths = [...text].map((c) => { const p = `<path transform="translate(${x.toFixed(2)} 0)" d="${GLYPHS[c].d}"/>`; x += GLYPHS[c].w + TRACK; return p; }).join("");
  const tx = cx - (width * scale) / 2, ty = cy - (10 * scale) / 2;
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale})" fill="none" stroke="#ffffff" stroke-width="${STROKE}" stroke-linejoin="miter" stroke-miterlimit="2">${paths}</g>`;
}

/* The mark placed so its ink is `inkW` wide, centred on (cx, cy). */
function mark(inkW, cx, cy) {
  const s = inkW / INK.w, size = 128 * s;
  const x = cx - (INK.x + INK.w / 2) * s, y = cy - (INK.y + INK.h / 2) * s;
  return `<image href="${MARK}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" clip-path="url(#tile)" filter="url(#white)"/>`;
}

/* logo.png's near-white compression noise would show as a faint box on the white tile, so near-white becomes white. */
const WHITE = '<filter id="white" color-interpolation-filters="sRGB"><feComponentTransfer>'
  + ["R", "G", "B"].map((c) => `<feFunc${c} type="linear" slope="1.07"/>`).join("") + "</feComponentTransfer></filter>";

/* A rounded white tile with a grey edge, or, for iOS, which rounds the icon itself, a plain white square. */
function tile(label, body, square = false) {
  const inset = square ? 0 : 3, rect = `x="${inset}" y="${inset}" width="${SIZE - 2 * inset}" height="${SIZE - 2 * inset}" rx="${square ? 0 : RADIUS - inset}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="${label}">`
    + `<defs><clipPath id="tile"><rect ${rect}/></clipPath>${WHITE}</defs><rect ${rect} fill="#ffffff"/>${body}`
    + (square ? "" : `<rect ${rect} fill="none" stroke="${EDGE}" stroke-width="${2 * inset}"/>`) + "</svg>\n";
}

const pill = { w: 236, h: 66, cy: 426 };
const withPill = mark(404, 256, 218)
  + `<rect x="${256 - pill.w / 2}" y="${pill.cy - pill.h / 2}" width="${pill.w}" height="${pill.h}" rx="${pill.h / 2}" fill="${NAVY}"/>`
  + word("ARENA", 2.5, 256, pill.cy);
const logo = tile("FrontierHarness Arena", withPill);
const icon = tile("FrontierHarness Arena", mark(430, 256, 256));
writeFileSync(path.join(STATIC, "arena-logo.svg"), logo);
writeFileSync(path.join(STATIC, "arena-icon.svg"), icon);

/* Headless Chrome, over its DevTools protocol, screenshots an <img> of each SVG at its pixel size on a transparent page. */
const port = 9335;
const chrome = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(path.join(tmpdir(), "arena-logo-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
  if (!target) await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
  .then((m) => { if (m.error) throw new Error(`${method}: ${m.error.message}`); return m.result; });
await send("Page.enable");
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
async function png(svg, px, out) {
  await send("Emulation.setDeviceMetricsOverride", { width: px, height: px, deviceScaleFactor: 1, mobile: false });
  const html = `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" width="${px}" height="${px}">`;
  await send("Page.navigate", { url: `data:text/html;base64,${Buffer.from(html).toString("base64")}` });
  await sleep(500);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: px, height: px, scale: 1 } });
  writeFileSync(path.join(STATIC, out), Buffer.from(shot.data, "base64"));
}
try {
  await png(tile("FrontierHarness Arena", withPill, true), 180, "apple-touch-icon.png");
  await png(icon, 32, "favicon-32.png");
  await png(icon, 48, "favicon-48.png");
} finally {
  ws.close();
  chrome.kill();
}
console.log("static/: arena-logo.svg, arena-icon.svg, apple-touch-icon.png, favicon-32.png, favicon-48.png");
