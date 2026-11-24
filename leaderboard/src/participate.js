/* The Participate tab: run the Arena benchmark on Runta, then submit the Harbor link as a GitHub issue. */
import { esc, int } from "./format.js";
import { MAX_OUTPUT_TOKENS } from "./method.js";

const REPO_URL = "https://github.com/frontier-harness-eval/arena";
const RUNTA_URL = "http://dashboard.runta.com/evaluations/new";
/* Opens .github/ISSUE_TEMPLATE/harness-submission.yml. */
export const SUBMIT_URL = `${REPO_URL}/issues/new?template=harness-submission.yml`;
export function participateHTML(data) {
  const r = data.settings;
  const models = data.models.map((m) => m.label).join(", ");
  return `<div class="page-head">
    <h1>Participate</h1>
  </div>
  <div class="participate">
    <section class="participate-grid" aria-label="How to participate">
      <article class="card participate-card">
        <span class="step-num">01</span>
        <h2>Run an evaluation on Runta</h2>
        <ol class="participate-steps">
          <li>Connect your model provider. Then select your harness (built-in or custom).</li>
          <li>Run a smoke evaluation first. Then run a full evaluation.</li>
          <li>Make sure that the evaluation has no errors. An AgentTimeoutError is acceptable.</li>
        </ol>
        <p class="participate-links"><a class="button-link" href="${RUNTA_URL}" target="_blank" rel="noopener noreferrer">Run on Runta <span aria-hidden="true">&nearr;</span></a></p>
      </article>

      <article class="card participate-card">
        <span class="step-num">02</span>
        <h2>Submit the public dashboard link</h2>
        <p>Open a submission issue in the Arena repository. Include this data:</p>
        <ul class="participate-list">
          <li>Harness name and version</li>
          <li>Model</li>
          <li>Public dashboard link to the evaluation</li>
        </ul>
        <p class="participate-links"><a class="button-link" href="${SUBMIT_URL}" target="_blank" rel="noopener noreferrer">Submit on GitHub <span aria-hidden="true">&nearr;</span></a></p>
      </article>
    </section>

    <section class="card method-card">
      <table class="method-table">
        <tbody>
          <tr><th colspan="2">Evaluation rules</th></tr>
          <tr><td>dataset</td><td><a href="${esc(data.dataset.url)}" target="_blank" rel="noopener noreferrer">${esc(data.dataset.name)}</a> <span class="muted">&middot; ${int(r.tasks)} tasks</span></td></tr>
          <tr><td>models</td><td>${esc(models)}</td></tr>
          <tr><td>attempts</td><td>${int(r.attempts)} per task <span class="muted">&middot; effort ${esc(r.effort[0] || "max")}, ${int(MAX_OUTPUT_TOKENS)} max output tokens</span></td></tr>
          <tr><td>scoring</td><td>passes &divide; scored attempts <span class="muted">&middot; infra errors are not scored</span></td></tr>
          <tr><td>timeouts</td><td>still graded; the grader&rsquo;s result counts</td></tr>
          <tr><td>integrity</td><td>reward hacking is counted as failed</td></tr>
          <tr><td>cost</td><td>list-price estimate <span class="muted">&middot; list price &times; reported tokens</span></td></tr>
        </tbody>
      </table>
    </section>
  </div>`;
}
