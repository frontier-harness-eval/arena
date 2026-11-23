/* Number and duration formatting, as on the main dashboard (static/js/format.js there). */
const isNum = (v) => typeof v === "number" && isFinite(v);
export const DASH = "—";

export const pct = (v, d = 1) => (isNum(v) ? `${(v * 100).toFixed(d)}%` : DASH);
export const int = (v) => (isNum(v) ? Math.round(v).toLocaleString("en-US") : DASH);

export function usd(v) {
  if (!isNum(v)) return DASH;
  if (v === 0) return "$0";
  if (Math.abs(v) >= 100) return `$${Math.round(v).toLocaleString("en-US")}`;
  if (Math.abs(v) >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(v >= 0.01 ? 3 : 4)}`;
}

export function dur(sec) {
  if (!isNum(sec)) return DASH;
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
