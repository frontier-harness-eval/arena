/* The methodology table: the main leaderboard's run settings and scoring rows, for the lite tasks and a board's
   models. Rows are [setting, value, aside, link]. The runtime proxies raise each request's output cap to
   MAX_OUTPUT_TOKENS, which the run settings don't record. */
import { DASH, int } from "./format.js";

export const MAX_OUTPUT_TOKENS = 131072;

export function methodRows(data, modelId) {
  const r = data.settings, harnesses = data.harnesses.length;
  const range = ([lo, hi], f) => (lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`);
  const gib = (mb) => `${+(mb / 1024).toFixed(1)}`;
  const span = (sec) => (sec < 60 ? `${sec}s` : sec < 3600 ? `${sec / 60}m` : `${+(sec / 3600).toFixed(1)}h`);
  const models = modelId === "all" ? data.models : data.models.filter((m) => m.id === modelId);
  const efforts = [...new Set(models.map((m) => m.effort || DASH))];
  const effort = efforts.length === 1
    ? [efforts[0], `· every harness${models.length > 1 ? `, all ${models.length} models` : ""}`]
    : [models.map((m) => `${m.label} ${m.effort || DASH}`).join(" · "), "· every harness"];
  return [
    ["Run settings", [
      ["dataset", data.dataset.name, `· ${int(r.tasks)} tasks`, data.dataset.url],
      ["runtime", ["Runta", `${range(r.cpus, String)} vCPU`, `${range(r.memory_mb, gib)} GB`, r.storage_mb ? `${gib(r.storage_mb)} GB disk` : null].filter(Boolean).join(" · ")],
      ["agent timeout", `per task · ${range(r.agent_timeout_sec, span)}${r.agent_timeout_multiplier !== 1 ? ` · ×${r.agent_timeout_multiplier}` : ""}`],
      ["effort", ...effort],
      ["max output tokens", int(MAX_OUTPUT_TOKENS), "per request"],
      ["attempts per task", int(r.attempts)],
      ["trials per model", int(r.trials_per_model), `= ${int(r.tasks)} × ${int(harnesses)} × ${int(r.attempts)}`],
      ...(modelId === "all" ? [["trials", int(r.trials_per_model * data.models.length), `= ${int(r.trials_per_model)} × ${int(data.models.length)} models`]] : []),
    ]],
    ["Methodology", [
      ["score", "passes ÷ scored attempts"],
      ["timeouts", "still graded; the grader's result counts"],
      ["infra errors", "not scored"],
      ["reward hacking", "counted as failed", "· e.g. online solution lookup"],
      ["cost", "list-price estimate", "· list price × reported tokens"],
    ]],
  ];
}
