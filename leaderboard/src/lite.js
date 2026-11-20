/* Lite leaderboard scoring, shared by the page, the data build and the tests.

   The lite dataset is a subset of the full frontier-harness-eval@v1.1.0 task set; its leaderboard scores the full
   run's trials on those tasks alone, exactly as the main dashboard's v1.1 leaderboard scores every task
   (static/js/live.js there: build, raceLine, leaderboardOf). Rules:
   - every attempt counts (4 per task per harness and model);
   - infra errors are not scored;
   - a pass flagged as reward hacking scores as a failure;
   - a timed-out trial keeps the grader's result (the data already records it as a pass when the grader passed it). */

export const LITE = {
  name: "frontier-harness-eval-lite@v1.0.0",
  url: "https://hub.harborframework.com/datasets/frontier-harness-eval/frontier-harness-eval-lite",
  tasks: ["caffe-cifar-10", "chess-best-move", "code-from-image", "constraints-scheduling", "dna-insert", "fix-code-vulnerability", "fix-git",
    "hf-model-inference", "kv-store-grpc", "large-scale-text-editing", "log-summary-date-ranges", "model-extraction-relu-logits", "nginx-request-logging",
    "polyglot-c-py", "portfolio-optimization", "prove-plus-comm", "pypi-server", "pytorch-model-cli", "rstan-to-pystan", "sparql-university",
    "sqlite-db-truncate", "sqlite-with-gcov", "tune-mjcf", "video-processing", "vulnerable-secret"],
};

export const PASS = 0, FAIL = 1, TIMEOUT = 2, INFRA = 3;
export const OUTCOMES = ["pass", "fail", "timeout", "infra"];
/* The per-trial fields data/lite.json keeps, in order. flag: 0, or the reward-hacking flag (1 online solution lookup,
   2 other reward hacking). */
export const TRIAL_FIELDS = ["task", "harness", "model", "attempt", "outcome", "flag", "cost_usd", "input_tokens", "cached_tokens", "run_seconds"];

/* Rows of a full-set snapshot (fields: its trial_fields) restricted to the named tasks, in TRIAL_FIELDS order with
   task indexes into the kept tasks, which keep their full-set order. */
export function subset(snapshot, names) {
  const keep = new Set(names), idx = new Map(), tasks = [];
  snapshot.tasks.forEach((t, i) => { if (keep.has(t.name)) { idx.set(i, tasks.length); tasks.push(t.name); } });
  const missing = names.filter((n) => !tasks.includes(n));
  if (missing.length) throw new Error(`tasks not in the full set: ${missing.join(", ")}`);
  const col = Object.fromEntries(snapshot.trial_fields.map((f, i) => [f, i]));
  const source = { ...Object.fromEntries(TRIAL_FIELDS.map((f) => [f, col[f]])), flag: col.lookup };
  for (const f of TRIAL_FIELDS) if (source[f] == null) throw new Error(`snapshot has no ${f === "flag" ? "lookup" : f} field`);
  const trials = snapshot.trials.filter((r) => idx.has(r[source.task])).map((r) => TRIAL_FIELDS.map((f) => {
    const v = r[source[f]];
    return f === "task" ? idx.get(v) : f === "flag" || f === "attempt" ? v || (f === "attempt" ? 1 : 0) : v ?? null;
  }));
  return { tasks, trials };
}

const sum = (vs) => vs.reduce((a, b) => a + b, 0);
const mean = (vs) => { const x = vs.filter((v) => v != null); return x.length ? sum(x) / x.length : null; };
/* Mean over tasks of each task's mean value (the main dashboard's taskMeans). */
function taskMean(rows, value) {
  const per = new Map();
  for (const t of rows) {
    const v = value(t);
    if (v == null) continue;
    const acc = per.get(t.task) || per.set(t.task, { sum: 0, n: 0 }).get(t.task);
    acc.sum += v; acc.n++;
  }
  return per.size ? sum([...per.values()].map((a) => a.sum / a.n)) / per.size : null;
}
const cacheHit = (rows) => {
  const tok = rows.filter((t) => t.input != null), tin = sum(tok.map((t) => t.input));
  return tin ? sum(tok.map((t) => t.cached || 0)) / tin : null;
};

/* Ranks by value per pass (value ÷ pass rate), lowest first, then the higher pass rate; equal values share a rank
   (1, 2, 2, 4). Sets each item's rank under key. */
function rankPerPass(items, value, key) {
  const score = (x) => (x[value] == null || !(x.pass_rate > 0) ? Infinity : x[value] / x.pass_rate);
  const sorted = items.map((x) => ({ x, s: score(x) })).sort((a, b) => (a.s === b.s ? 0 : a.s - b.s) || b.x.pass_rate - a.x.pass_rate);
  sorted.forEach((e, i) => {
    const up = sorted[i - 1];
    e.x[key] = i && e.s === up.s && (Number.isFinite(e.s) || e.x.pass_rate === up.x.pass_rate) ? up.x[key] : i + 1;
  });
}

/* A trial as scored: a flagged pass becomes a failure. */
export function scoredTrial(row) {
  const t = Object.fromEntries(TRIAL_FIELDS.map((f, i) => [f, row[i]]));
  const hacked = t.flag > 0 && t.outcome === PASS;
  return {
    task: t.task, harness: t.harness, model: t.model, attempt: t.attempt, outcome: hacked ? FAIL : t.outcome, hacked,
    cost: t.cost_usd, input: t.input_tokens, cached: t.cached_tokens, seconds: t.run_seconds,
  };
}

/* One board: every harness's scored trials over the given models. Cost and time per task are each task's mean over
   its priced (timed) scored trials, averaged over tasks, rounded as the main dashboard rounds them; per pass is that
   over the pass rate. */
function board(data, trials, models, id, label) {
  const inModels = new Set(models);
  const rows = data.harnesses.map((h, hi) => {
    const scored = trials.filter((t) => t.harness === hi && inModels.has(t.model) && t.outcome !== INFRA);
    if (!scored.length) return null;
    const passes = scored.filter((t) => t.outcome === PASS).length;
    const cost = taskMean(scored, (t) => t.cost), time = taskMean(scored, (t) => t.seconds);
    const byTask = new Map();
    for (const t of scored) (byTask.get(t.task) || byTask.set(t.task, []).get(t.task)).push(t);
    return {
      id: h.id, order: hi, scored: scored.length, successful: passes, pass_rate: passes / scored.length,
      priced: scored.filter((t) => t.cost != null).length,
      cost_per_task: cost == null ? null : Math.round(cost * 1e6) / 1e6,
      time_per_task: time == null ? null : Math.round(time * 1e3) / 1e3,
      cache_hit_rate: cacheHit(scored),
      tasks: [...byTask].map(([ti, ts]) => ({
        task: data.tasks[ti], passes: ts.filter((t) => t.outcome === PASS).length, trials: ts.length,
        cost: mean(ts.map((t) => t.cost)), cache_hit_rate: cacheHit(ts), seconds: mean(ts.map((t) => t.seconds)),
      })).sort((a, b) => a.task.localeCompare(b.task)),
    };
  }).filter(Boolean);
  rankPerPass(rows, "cost_per_task", "cost_rank");
  rankPerPass(rows, "time_per_task", "time_rank");
  for (const r of rows) {
    r.cost_per_pass = r.cost_per_task != null && r.pass_rate > 0 ? r.cost_per_task / r.pass_rate : null;
    r.time_per_pass = r.time_per_task != null && r.pass_rate > 0 ? r.time_per_task / r.pass_rate : null;
  }
  rows.sort((a, b) => b.pass_rate - a.pass_rate || a.order - b.order);
  return { model: id, label, all: models.length > 1, models: models.length, tasks: data.tasks.length, trials: sum(rows.map((r) => r.scored)), harnesses: rows };
}

/* Every board of data/lite.json: All models first, then one per model. */
export function boards(data) {
  const trials = data.trials.map(scoredTrial), all = data.models.map((_, i) => i);
  return [board(data, trials, all, "all", "All models"), ...data.models.map((m, i) => board(data, trials, [i], m.id, m.label))];
}
