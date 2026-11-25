// npm test
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { FAIL, INFRA, LITE, PASS, TIMEOUT, TRIAL_FIELDS, boards, subset } from "../src/lite.js";
import { methodRows } from "../src/method.js";
import { THEMES, mountThemeToggle, nextTheme } from "../src/theme.js";
import { REPO_URL, SUBMIT_URL, participateHTML } from "../src/participate.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const data = JSON.parse(read("data/lite.json"));
// The main dashboard's Lite tab (its live.js subset and summary over the complete run), exported per model and harness.
const reference = JSON.parse(read("test/fixtures/lite-tab-reference.json"));
const HARNESSES = 22, MODELS = 5, ATTEMPTS = 4;

// ---------------------------------------------------------------- subset
/* A small snapshot in the main dashboard's live.json shape. */
const FULL_FIELDS = ["task", "harness", "model", "outcome", "error", "input_tokens", "cached_tokens", "output_tokens", "cost_usd", "real_seconds",
  "retries", "job", "trial_suffix", "attempt", "lookup", "run_seconds"];
const fullRow = (o) => FULL_FIELDS.map((f) => o[f] ?? null);
const full = {
  tasks: [{ name: "other-a" }, { name: "fix-git" }, { name: "other-b" }, { name: "dna-insert" }],
  trial_fields: FULL_FIELDS,
  trials: [
    fullRow({ task: 0, harness: 0, model: 0, outcome: PASS, attempt: 1, cost_usd: 9, job: 3, trial_suffix: "a" }),
    fullRow({ task: 1, harness: 1, model: 0, outcome: TIMEOUT, attempt: 2, lookup: 0, cost_usd: 0.5, input_tokens: 100, cached_tokens: 40, run_seconds: 60, job: 1, trial_suffix: "b" }),
    fullRow({ task: 3, harness: 0, model: 1, outcome: PASS, attempt: 4, lookup: 2, cost_usd: 0.25, run_seconds: 30, job: 2, trial_suffix: "c" }),
    fullRow({ task: 2, harness: 1, model: 1, outcome: FAIL, attempt: 1 }),
  ],
};

test("subset keeps only the named tasks' trials, renumbered in full-set order, with the aggregated fields alone", () => {
  const s = subset(full, ["dna-insert", "fix-git"]);
  assert.deepEqual(s.tasks, ["fix-git", "dna-insert"]);
  assert.deepEqual(s.trials, [
    [0, 1, 0, 2, TIMEOUT, 0, 0.5, 100, 40, 60],
    [1, 0, 1, 4, PASS, 2, 0.25, null, null, 30],
  ]);
  assert.deepEqual(TRIAL_FIELDS, ["task", "harness", "model", "attempt", "outcome", "flag", "cost_usd", "input_tokens", "cached_tokens", "run_seconds"]);
  assert.throws(() => subset(full, ["fix-git", "not-a-task"]), /not-a-task/);
});

test("the lite tasks are the published lite dataset's 25, and the committed data holds exactly their trials", () => {
  assert.equal(new Set(LITE.tasks).size, 25);
  assert.equal(LITE.name, "frontier-harness-eval-lite@v1.0.0");
  assert.equal(LITE.url, "https://hub.harborframework.com/datasets/frontier-harness-eval/frontier-harness-eval-lite");
  assert.deepEqual([...data.tasks].sort(), [...LITE.tasks].sort());
  assert.deepEqual([...reference.tasks].sort(), [...LITE.tasks].sort());
  assert.deepEqual(data.dataset, { name: LITE.name, url: LITE.url });
  assert.deepEqual(data.trial_fields, TRIAL_FIELDS);
  assert.equal(data.harnesses.length, HARNESSES);
  assert.equal(data.models.length, MODELS);
  assert.equal(data.trials.length, 25 * HARNESSES * MODELS * ATTEMPTS);
  const at = Object.fromEntries(TRIAL_FIELDS.map((f, i) => [f, i]));
  const keys = new Set(data.trials.map((r) => `${r[at.task]}:${r[at.harness]}:${r[at.model]}:${r[at.attempt]}`));
  assert.equal(keys.size, data.trials.length, "one trial per task, harness, model and attempt");
  for (const r of data.trials) {
    assert.equal(r.length, TRIAL_FIELDS.length);
    assert.ok(r[at.task] >= 0 && r[at.task] < 25 && r[at.attempt] >= 1 && r[at.attempt] <= ATTEMPTS);
  }
  assert.equal(data.settings.tasks, 25);
  assert.equal(data.settings.trials_per_model, 25 * HARNESSES * ATTEMPTS);
});

// --------------------------------------------------------------- scoring
const TOY = {
  tasks: ["t0", "t1"],
  models: [{ id: "m0", label: "M0" }, { id: "m1", label: "M1" }],
  harnesses: [{ id: "h0", label: "H0" }, { id: "h1", label: "H1" }],
  trial_fields: TRIAL_FIELDS,
  trials: [
    // h0 x m0: t0 pass $1 10s, t0 flagged pass $3 30s, t1 infra $100, t1 timeout the grader failed $2 20s
    [0, 0, 0, 1, PASS, 0, 1, 1000, 500, 10],
    [0, 0, 0, 2, PASS, 1, 3, 1000, 0, 30],
    [1, 0, 0, 3, INFRA, 0, 100, null, null, null],
    [1, 0, 0, 4, TIMEOUT, 0, 2, 2000, 1000, 20],
    // h0 x m1: a flagged failure stays a failure; an unpriced pass
    [0, 0, 1, 1, FAIL, 2, 4, null, null, 40],
    [1, 0, 1, 1, PASS, 0, null, null, null, 50],
    // h1 x m0: every attempt counts, a timed-out trial the grader passed is recorded as a pass
    [0, 1, 0, 1, PASS, 0, 1, null, null, 10],
    [0, 1, 0, 2, PASS, 0, 1, null, null, 10],
    [1, 1, 0, 1, PASS, 0, 1, null, null, 10],
    [1, 1, 0, 2, FAIL, 0, 1, null, null, 10],
  ],
};

test("scoring: every attempt counts, infra errors are unscored, flagged passes fail, timeouts keep the grader's result", () => {
  const [all, m0, m1] = boards(TOY);
  assert.deepEqual([all.model, m0.model, m1.model], ["all", "m0", "m1"]);
  const h = (b, id) => b.harnesses.find((x) => x.id === id);
  const a = h(m0, "h0");
  assert.equal(a.scored, 3, "the infra error is left out");
  assert.equal(a.successful, 1, "the flagged pass and the failed timeout score 0");
  assert.equal(a.pass_rate, 1 / 3);
  // per task mean cost over scored trials, averaged over tasks: t0 (1 + 3) / 2, t1 2
  assert.equal(a.cost_per_task, 2);
  assert.equal(a.cost_per_pass, 2 / (1 / 3));
  assert.equal(a.time_per_task, 20);
  assert.equal(a.cache_hit_rate, 1500 / 4000);
  assert.deepEqual(a.tasks.map((t) => [t.task, t.passes, t.trials]), [["t0", 1, 2], ["t1", 0, 1]]);
  const b = h(m1, "h0");
  assert.equal(b.successful, 1);
  assert.equal(b.scored, 2);
  assert.equal(b.priced, 1);
  assert.equal(b.cost_per_task, 4, "an unpriced trial leaves its task out of the cost");
  const c = h(m0, "h1");
  assert.deepEqual([c.scored, c.successful, c.pass_rate], [4, 3, 0.75]);
  assert.equal(h(m0, "h1").cost_rank, 1);
  assert.equal(h(m0, "h0").cost_rank, 2);
  // All models pools both models' trials
  const p = h(all, "h0");
  assert.deepEqual([p.scored, p.successful], [5, 2]);
  assert.deepEqual(all.harnesses.map((x) => x.id), ["h1", "h0"], "rows run from the highest pass rate");
});

test("every board matches the main dashboard's Lite tab, harness by harness", () => {
  const ours = boards(data);
  assert.deepEqual(ours.map((b) => b.model), reference.models.map((m) => m.model));
  for (const ref of reference.models) {
    const b = ours.find((x) => x.model === ref.model);
    assert.equal(b.tasks, ref.tasks, ref.model);
    assert.equal(b.trials, ref.trials, ref.model);
    assert.deepEqual(b.harnesses.map((h) => h.id).sort(), ref.harnesses.map((h) => h.id).sort(), ref.model);
    for (const r of ref.harnesses) {
      const h = b.harnesses.find((x) => x.id === r.id);
      for (const [k, want] of Object.entries(r)) {
        if (k === "id") continue;
        const got = h[k];
        assert.ok(got === want || Math.abs(got - want) < 1e-8, `${ref.model} ${r.id} ${k}: ${got} vs ${want}`);
      }
    }
  }
});

test("all models pools 8,547 passes over 11,000 scored trials, as on the Lite tab", () => {
  const { harnesses } = boards(data)[0], total = (k) => harnesses.reduce((n, h) => n + h[k], 0);
  assert.deepEqual([total("successful"), total("scored")], [reference.headline.passes, reference.headline.scored]);
});

// ----------------------------------------------------------------- copy
test("the methodology's dataset row links the lite dataset, and trial counts are the lite run's", () => {
  for (const id of ["all", ...data.models.map((m) => m.id)]) {
    const rows = Object.fromEntries(methodRows(data, id).flatMap(([, rs]) => rs).map(([k, v, aside, link]) => [k, [aside ? `${v} ${aside}` : v, link]]));
    assert.deepEqual(rows.dataset, ["frontier-harness-eval-lite@v1.0.0 · 25 tasks", LITE.url], id);
    assert.equal(rows["trials per model"][0], "2,200 = 25 × 22 × 4", id);
    assert.equal(rows.cost[0], "list-price estimate · list price × reported tokens", id);
    if (id === "all") assert.equal(rows.trials[0], "11,000 = 2,200 × 5 models");
  }
});

test("public copy names no confidence intervals, other datasets, sandboxes or replays", () => {
  const files = ["index.html", "data/lite.json", ...readdirSync(new URL("../src/", import.meta.url)).map((f) => `src/${f}`)];
  for (const f of files) assert.doesNotMatch(read(f), /confidence|bootstrap|\bci\b|TB2|TB4|tb21|tb4|terminal-bench|replay|sandbox/i, f);
});

test("every page loads the Google tag unless opened with ?final, then the analytics script", () => {
  const html = read("index.html");
  const tag = html.indexOf('if (!FHE_PARAMS.has("final"))');
  assert.ok(tag > 0);
  assert.ok(html.indexOf("googletagmanager.com/gtag/js?id=G-1ML00Q8PZV") > tag);
  assert.match(html, /gtag\('config', 'G-1ML00Q8PZV'\)/);
  assert.ok(html.indexOf('<script src="{{ROOT}}src/analytics.js"></script>') > tag);
  assert.match(read("src/analytics.js"), /has\("final"\)\) gtag\("event"/);
});

test("Participate lists two steps: run on Runta, then submit the Harbor link through the issue template", () => {
  const html = participateHTML(JSON.parse(read("data/lite.json")));
  assert.equal(html.match(/class="step-num"/g).length, 2);
  assert.ok(html.includes("<h2>Run an evaluation on Runta</h2>"));
  assert.ok(html.includes("<h2>Submit the public dashboard link</h2>"));
  assert.ok(!html.includes("Submit the Harbor link"));
  assert.match(html, /<a class="button-link" href="http:\/\/dashboard\.runta\.com\/evaluations\/new" target="_blank"[^>]*>Run on Runta/);
  assert.ok(html.includes(`<a class="button-link" href="${SUBMIT_URL}" target="_blank" rel="noopener noreferrer">Submit on GitHub`));
  assert.equal(html.match(/class="button-link"/g).length, 2);
  assert.doesNotMatch(html, /button-link secondary|Open a pull request|\/pulls"/, "no pull request button");
  assert.doesNotMatch(html, /harbor run/);
  assert.match(html, /<div class="participate">\s*<section class="participate-grid"/, "the steps come first, with no intro box");
  assert.doesNotMatch(html, /participate-intro|evaluates AI coding agent harnesses/);
  const form = readFileSync(new URL(`../../.github/ISSUE_TEMPLATE/${new URL(SUBMIT_URL).searchParams.get("template")}`, import.meta.url), "utf8");
  for (const id of ["harness", "version", "model", "harbor-link"]) assert.match(form, new RegExp(`id: ${id}\n`));
});

test("Participate steps sit side by side in two equal columns, stacking at 800px and below", () => {
  const css = read("src/style.css");
  assert.match(css, /\.participate-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 800px\) \{ \.participate-grid \{ grid-template-columns: minmax\(0, 1fr\); \} \}/);
  const html = participateHTML(JSON.parse(read("data/lite.json")));
  const grid = html.slice(html.indexOf('<section class="participate-grid"'), html.indexOf("</section>"));
  assert.equal(grid.match(/<article class="card participate-card">/g).length, 2);
  assert.ok(grid.indexOf(">01<") < grid.indexOf(">02<"), "step 01 comes first, so it is the left column");
});

test("Participate step 01 has its heading, three short steps and the Run on Runta button", () => {
  const html = participateHTML(JSON.parse(read("data/lite.json")));
  const step1 = html.slice(html.indexOf(">01<"), html.indexOf(">02<"));
  const items = [...step1.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
  assert.deepEqual(items, ["Connect your model provider. Then select your harness (built-in or custom).", "Run a smoke evaluation first. Then run a full evaluation.", "Make sure that the evaluation has no errors. An AgentTimeoutError is acceptable."]);
  assert.doesNotMatch(step1, /<code>/, "no inline code styling applies here, so AgentTimeoutError stays plain");
  assert.equal(step1.match(/<ol class="participate-steps">/g).length, 1);
  assert.doesNotMatch(step1, /Public Harbor dataset|Python requirements|Smoke evaluation<\/strong>/, "no form field list or separate smoke note");
  assert.match(step1, /<\/ol>\s*<p class="participate-links"><a class="button-link"[^>]*>Run on Runta/, "the button follows the steps directly");
  assert.doesNotMatch(html, /participate-note|Enable public link|Public access is disabled/, "no public-link note");
  assert.doesNotMatch(read("src/style.css"), /participate-note|button-link\.secondary/, "unused note and secondary button styles are gone");
  assert.doesNotMatch(step1, /<details|<pre|data-copy|Prompt for writing a script/, "no script prompt or Copy button");
  assert.doesNotMatch(step1, /<strong>Example:<\/strong>|github\.com\/apache\/maka/, "no worked Maka example line");
});

test("Participate step 02 starts with the submission issue text and asks for the public dashboard link", () => {
  const html = participateHTML(JSON.parse(read("data/lite.json")));
  const step2 = html.slice(html.indexOf(">02<"));
  assert.match(step2, /<h2>Submit the public dashboard link<\/h2>\s*<p>Open a submission issue in the Arena repository\. Include this data:<\/p>/);
  assert.ok(!step2.includes("Then open"));
  assert.match(step2, /<\/ul>\s*<p class="participate-links"><a class="button-link" href="[^"]*"[^>]*>Submit on GitHub <span aria-hidden="true">&nearr;<\/span><\/a><\/p>/, "the list is followed only by the Submit on GitHub button");
  assert.doesNotMatch(step2, /pull request|submissions\//, "no pull request hint or button");
  assert.ok(step2.includes("<li>Public dashboard link to the evaluation</li>"));
  assert.doesNotMatch(step2, /Public Harbor link/);
});

test("Participate step copy follows ASD-STE100: short sentences, simple words, one name per thing", () => {
  const html = participateHTML(JSON.parse(read("data/lite.json")));
  const grid = html.slice(html.indexOf('<section class="participate-grid"'), html.indexOf("</section>"));
  const text = grid.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
  for (const sentence of text.split(/(?<=[.:])\s/)) assert.ok(sentence.trim().split(" ").length <= 20, `over 20 words: ${sentence}`);
  assert.doesNotMatch(text, /\b(ensure|via|utilize|choose|set up|OK)\b/i, "unapproved words");
  assert.doesNotMatch(text, /\b(the|a) run\b/, "the noun is evaluation, not run");
  assert.doesNotMatch(text, /(?<!public )dashboard link/i, "the link is always the public dashboard link");
  assert.doesNotMatch(text, /\w+ing\b/, "no -ing forms");
});

test("a centered frontier-orange Participate button sits right under the chart, opening Participate in the same tab", () => {
  const app = read("src/app.js"), css = read("src/style.css");
  const head = app.slice(app.indexOf("function headHTML()"), app.indexOf("// --------------------------------------------------------------- scatter"));
  assert.match(head, /<div class="page-head">\s*<h1>Leaderboard<\/h1>\s*<\/div>/, "the head holds only the heading");
  const scatter = app.slice(app.indexOf("function scatterHTML("), app.indexOf("function mountScatter("));
  const cta = '<p class="scatter-cta"><a class="button-link" href="${ROOT}participate/">${TROPHY}Participate</a>'
    + '<a class="button-link button-outline" href="${REPO_URL}/" target="_blank" rel="noopener noreferrer">${GITHUB_MARK}GitHub</a></p>';
  assert.ok(scatter.includes(`<div class="scatter-axis-x"></div></section>\n  ${cta}`), "directly after the chart card, Participate first, GitHub beside it");
  assert.equal(app.split("participate/").length - 1, 1, "one Participate button, rendered on every board page");
  assert.match(app, /const ROOT = document\.documentElement\.dataset\.root/, "the same root-relative path as the nav's Participate tab");
  assert.match(app, /import \{ REPO_URL, participateHTML \} from "\.\/participate\.js";/);
  assert.equal(`${REPO_URL}/`, "https://github.com/frontier-harness-eval/arena/");
  assert.match(css, /\.scatter-cta \{ display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;/, "the pair is centered and wraps on narrow screens");
  assert.match(css, /\.pareto-line \{[^}]*stroke: var\(--frontier\)/, "the frontier line's colour");
  assert.match(read("src/analytics.js"), /\["link", "a\[href\]"\]/, "button_click reports every link, this one included");
});

test("the Participate button's trophy icon is drawn like the theme icons and adds nothing to its name", () => {
  const app = read("src/app.js"), theme = read("src/theme.js");
  const svg = app.match(/const TROPHY = '(<svg[^']*<\/svg>)';/)[1];
  const attrs = 'viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  assert.ok(svg.startsWith(`<svg ${attrs}>`));
  assert.match(theme, /viewBox="0 0 16 16"[^>]*fill="none" stroke="currentColor" stroke-width="1\.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"/, "the same stroke style as the theme toggle");
  assert.doesNotMatch(svg, /<title|<text|aria-label/, "the accessible name and analytics label stay \"Participate\"");
  assert.equal(svg.replace(/<[^>]+>/g, ""), "");
  const mark = app.match(/const GITHUB_MARK = '(<svg[^']*<\/svg>)';/)[1];
  assert.ok(mark.startsWith('<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">'), "the GitHub mark is the trophy's size, in the text colour");
  assert.doesNotMatch(mark, /<title|<text|aria-label/, "the GitHub button's name and analytics label stay \"GitHub\"");
});

test("the GitHub button is an outline: theme text and an orange border, since orange text is under 4.5:1 on the light page", () => {
  const css = read("src/style.css");
  assert.match(css, /a\.button-link\.button-outline \{ color: var\(--ink\); background: transparent; box-shadow: inset 0 0 0 1\.5px var\(--frontier\); \}/);
  assert.match(css, /a\.button-link\.button-outline:is\(:hover, :focus-visible\) \{ filter: none; background: color-mix\(in oklab, var\(--frontier\) 14%, transparent\); \}/);
  assert.match(css, /a\.button-link\.button-outline:focus-visible \{ box-shadow: inset 0 0 0 1\.5px var\(--frontier\), 0 0 0 2px var\(--bg\), 0 0 0 4px var\(--frontier\); \}/);
  const hex = (name) => css.match(new RegExp(`${name}: light-dark\\(#([0-9a-f]{6}), #([0-9a-f]{6})\\)`)).slice(1);
  const [orange, bg, ink] = [hex("--frontier"), hex("--bg"), hex("--ink")];
  const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lum = (h) => rgb(h).map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const tint = (h, over) => rgb(h).map((c, i) => Math.round(c * 0.14 + rgb(over)[i] * 0.86).toString(16).padStart(2, "0")).join("");
  assert.ok(ratio(orange[0], bg[0]) < 4.5, "orange text would fail on the light page");
  for (const t of [0, 1]) {
    assert.ok(ratio(ink[t], bg[t]) >= 4.5, `${["light", "dark"][t]} text`);
    assert.ok(ratio(ink[t], tint(orange[t], bg[t])) >= 4.5, `${["light", "dark"][t]} hovered text`);
  }
});

test("every primary button-link is frontier orange with near-black text, and its text keeps 4.5:1 contrast in both themes, hovered or not", () => {
  const css = read("src/style.css");
  assert.match(css, /\na\.button-link \{[^}]*color: var\(--on-frontier\); background: var\(--frontier\);/);
  assert.match(css, /\na\.button-link:is\(:hover, :focus-visible\) \{ filter: brightness\(1\.12\); outline: none; \}/);
  assert.match(css, /\na\.button-link:focus-visible \{ box-shadow: 0 0 0 2px var\(--bg\), 0 0 0 4px var\(--frontier\); \}/);
  assert.doesNotMatch(css, /--accent|button-frontier/, "no blue variant left");
  assert.doesNotMatch(read("src/participate.js"), /class="button-link [^"]/, "Participate's buttons are all primary");
  assert.deepEqual(read("src/app.js").match(/class="button-link [^"]*"/g), ['class="button-link button-outline"'], "the GitHub button is the only outline");
  const pair = (name) => css.match(new RegExp(`${name}: light-dark\\(#([0-9a-f]{6}), #([0-9a-f]{6})\\)`)).slice(1);
  const [bgs, fgs] = [pair("--frontier"), pair("--on-frontier")];
  assert.deepEqual(bgs, ["ea6c0a", "fb923c"]);
  const lum = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const brighten = (hex, f) => [0, 2, 4].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f)).toString(16).padStart(2, "0")).join("");
  for (const t of [0, 1]) for (const f of [1, 1.12]) assert.ok(ratio(brighten(bgs[t], f), fgs[t]) >= 4.5, `${["light", "dark"][t]} x${f}`);
});

test("copying a selection out of a code block reports copy_code, and no Copy buttons remain", () => {
  assert.match(read("src/analytics.js"), /addEventListener\("copy"[\s\S]*?matches\("pre, code"\)[\s\S]*?copy_method: "selection"/);
  for (const f of ["src/app.js", "src/analytics.js", "src/participate.js"]) assert.doesNotMatch(read(f), /codecopy|data-copy|copy-button/, f);
  assert.equal(existsSync(new URL("../src/agent-prompt.js", import.meta.url)), false);
});

test("submissions/ holds a README and a template with the issue form's fields", () => {
  const readme = read("../submissions/README.md"), template = read("../submissions/_template.md");
  assert.match(readme, /submissions\/<harness>-<version>-<model>\.md/);
  assert.match(readme, /\(_template\.md\)/);
  for (const field of ["Harness name:", "Version:", "Model:", "Public Harbor link:", "## Notes"]) assert.ok(template.includes(field), field);
});

test("every Runta Evaluations link opens a new evaluation", () => {
  const files = ["index.html", ...readdirSync(new URL("../src/", import.meta.url)).map((f) => `src/${f}`),
    "../README.md", "../submissions/README.md", "../.github/ISSUE_TEMPLATE/harness-submission.yml"];
  for (const f of files) {
    for (const [url] of read(f).matchAll(/https?:\/\/dashboard\.runta\.com[^\s)"'<>]*/g)) assert.match(url, /\/evaluations\/new$/, `${f}: ${url}`);
  }
});

// ---------------------------------------------------------------- theme
test("the head script picks ?theme, then dark for ?final, then the saved choice, else the system's", () => {
  const html = read("index.html");
  const script = html.match(/<script>([^<]*fhe-theme[^<]*)<\/script>/)[1];
  assert.ok(html.indexOf(script) < html.indexOf('<link rel="stylesheet"'), "it runs before the stylesheet, so before first paint");
  const theme = (search, saved, blocked = false) => {
    const root = { dataset: {} };
    vm.runInNewContext(script, {
      URLSearchParams, location: { search }, document: { documentElement: root },
      localStorage: { getItem: () => { if (blocked) throw new Error("blocked"); return saved; } },
    });
    return root.dataset.theme;
  };
  assert.equal(theme("?theme=light", "dark"), "light");
  assert.equal(theme("?final&theme=light", null), "light");
  assert.equal(theme("?final", "light"), "dark");
  assert.equal(theme("", "light"), "light");
  assert.equal(theme("?theme=sepia", "dark"), "dark", "an unknown ?theme is ignored");
  assert.equal(theme("", null), undefined, "no choice leaves the system's preference");
  assert.equal(theme("", null, true), undefined, "blocked storage leaves the system's preference");
});

test("the theme toggle is a nav button cycling System, Light and Dark, and saves the choice", () => {
  assert.match(read("index.html"), /<button class="theme-toggle" type="button" id="theme-toggle" aria-label="Theme: System. Switch to Light" title="Theme: System. Switch to Light"><\/button>/);
  assert.deepEqual(THEMES.map((t) => nextTheme(t)), ["light", "dark", "system"]);
  const saved = new Map(), root = { dataset: {} };
  const store = { setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
  let click;
  const button = { dataset: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener: (_, f) => { click = f; } };
  mountThemeToggle(button, root, store);
  assert.equal(button.dataset.theme, "system");
  assert.equal(button.attrs["aria-label"], "Theme: System. Switch to Light");
  assert.equal(button.title, "Theme: System. Switch to Light", "the tooltip matches the aria-label");
  assert.doesNotMatch(button.innerHTML.replace(/<svg[\s\S]*<\/svg>/, ""), /\S/, "icon only, no visible label");
  const icons = new Set();
  for (let i = 0; i < 3; i++) { icons.add(button.innerHTML); click(); }
  assert.equal(icons.size, 3, "System, Light and Dark each have their own icon");
  click();
  assert.deepEqual([root.dataset.theme, saved.get("fhe-theme"), button.dataset.theme, button.title], ["light", "light", "light", "Theme: Light. Switch to Dark"]);
  click();
  assert.deepEqual([root.dataset.theme, saved.get("fhe-theme")], ["dark", "dark"]);
  click();
  assert.equal(root.dataset.theme, undefined);
  assert.equal(saved.has("fhe-theme"), false, "System clears the saved choice");
  assert.equal(button.dataset.theme, "system");
});

test("every palette colour has a light and a dark value, and data-theme sets the color-scheme", () => {
  const css = read("src/style.css"), rootBlock = css.match(/:root \{([^}]*)\}/)[1];
  assert.match(rootBlock, /color-scheme: light dark;/);
  const colours = [...rootBlock.matchAll(/(--[\w-]+): ([^;]+);/g)].filter(([, , v]) => /#|light-dark/.test(v));
  assert.equal(colours.length, 17);
  for (const [, name, value] of colours) assert.match(value, /^light-dark\(#[0-9a-f]{3,8}, #[0-9a-f]{3,8}\)$/, name);
  assert.match(css, /:root\[data-theme="light"\] \{ color-scheme: light; \}/);
  assert.match(css, /:root\[data-theme="dark"\] \{ color-scheme: dark; \}/);
  const rest = css.slice(css.indexOf(rootBlock) + rootBlock.length);
  const fixed = [...rest.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0]);
  assert.deepEqual([...new Set(fixed)].sort(), ["#dc7b6a1a", "#fff"], "outside the palette only the logo's white and the translucent kill zone");
});
