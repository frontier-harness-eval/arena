/* Writes data/lite.json from a checkout of the main frontier-harness-eval repository's dashboard:
   live/live.json (the v1.1 run's aggregated per-trial results) restricted to the lite dataset's tasks, with the
   harness names, colours and logos of snapshot/data/summary.json. Only aggregated per-trial results are kept: no job
   or trial names, trajectories, or anything else from the raw job artifacts.

   node scripts/build-data.mjs <path to frontier-harness-eval/dashboard> */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LITE, TRIAL_FIELDS, subset } from "../src/lite.js";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, "..");
const src = process.argv[2];
if (!src) throw new Error("usage: node scripts/build-data.mjs <path to frontier-harness-eval/dashboard>");
const read = (p) => JSON.parse(readFileSync(path.join(src, p), "utf8"));
const snap = read("live/live.json"), summary = read("snapshot/data/summary.json");

/* The names the main leaderboard shows (leaderboard.js SHORT_LABELS and its DeepSeek Harness shortening). */
const SHORT_LABELS = { opencode: "OpenCode v1", "opencode-2.2.7": "OpenCode v2" };
const meta = new Map(summary.study.harnesses.map((h) => [h.id, h]));
const harnesses = snap.harnesses.map((h) => {
  const m = meta.get(h.id) || {};
  return {
    id: h.id, label: SHORT_LABELS[h.id] || (m.label || h.label).replace(/^DeepSeek Harness: /, "DSH "),
    logo: h.logo || m.logo || null, color: m.color || null, version: h.version ? String(h.version).replace(/\+[a-z]+-catalog\.\d+$/, "") : null,
  };
});
const { tasks, trials } = subset(snap, LITE.tasks);
const s = snap.settings;
const data = {
  source: "frontier-harness-eval dashboard live/live.json, restricted to the lite dataset's tasks",
  generated_at: snap.generated_at,
  dataset: { name: LITE.name, url: LITE.url },
  attempts: snap.attempts,
  settings: {
    tasks: tasks.length, attempts: s.attempts, trials_per_model: tasks.length * harnesses.length * s.attempts,
    cpus: s.cpus, memory_mb: s.memory_mb, storage_mb: s.storage_mb, agent_timeout_sec: s.agent_timeout_sec,
    agent_timeout_multiplier: s.agent_timeout_multiplier, effort: s.effort,
  },
  models: snap.models.map((m) => ({ id: m.id, label: m.label, effort: m.effort || null })),
  harnesses,
  tasks,
  trial_fields: TRIAL_FIELDS,
  trials,
};
mkdirSync(path.join(ROOT, "data"), { recursive: true });
writeFileSync(path.join(ROOT, "data/lite.json"), `{${Object.entries(data).map(([k, v]) => `\n"${k}":${k === "trials" ? `[\n${v.map((r) => JSON.stringify(r)).join(",\n")}\n]` : JSON.stringify(v)}`).join(",")}\n}\n`);

mkdirSync(path.join(ROOT, "static/logos"), { recursive: true });
for (const logo of new Set(harnesses.map((h) => h.logo).filter(Boolean))) copyFileSync(path.join(src, "static", logo), path.join(ROOT, "static", logo));
copyFileSync(path.join(src, "static/logo.png"), path.join(ROOT, "static/logo.png"));
console.log(`data/lite.json: ${tasks.length} tasks, ${trials.length} trials, ${harnesses.length} harnesses, ${data.models.length} models`);
