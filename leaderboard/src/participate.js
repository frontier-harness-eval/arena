/* The Participate tab: run frontier-harness-eval-lite on Runta, then submit the Harbor link as a GitHub issue. */
import { esc, int } from "./format.js";
import { AGENT_PROMPT } from "./agent-prompt.js";
import { MAX_OUTPUT_TOKENS } from "./method.js";

const REPO_URL = "https://github.com/frontier-harness-eval/frontier-harness-eval-lite";
const RUNTA_URL = "http://dashboard.runta.com/evaluations/new";
/* Opens .github/ISSUE_TEMPLATE/harness-submission.yml. */
export const RUNTA_DATASET = "frontier-harness-eval/frontier-harness-eval-lite";
export const MAKA_URL = "https://github.com/apache/maka";
export const MAKA_SCRIPT_URL = "https://gist.github.com/SASUKE40/814ee913da4f27932cfe0c2282ba75bf";
export const SUBMIT_URL = `${REPO_URL}/issues/new?template=harness-submission.yml`;
export const PR_URL = `${REPO_URL}/pulls`;
export const SUBMISSIONS_URL = `${REPO_URL}/tree/main/submissions`;

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
        <h2>Run the dataset on Runta</h2>
        <p>Create an evaluation in Runta Evaluations with your harness as a custom external agent:</p>
        <ol class="participate-steps">
          <li><strong>Evaluation name</strong>: any name, such as your harness and version.</li>
          <li><strong>Public Harbor dataset</strong>: <code>${RUNTA_DATASET}</code></li>
          <li><strong>Model provider</strong> and <strong>Model</strong>: the model to evaluate.</li>
          <li><strong>Harness</strong>: Custom external agent (Python)</li>
          <li><strong>Custom external agent</strong>: paste your script. It must export a <code>CustomAgent</code> class.</li>
          <li><strong>Python requirements (optional)</strong>: leave empty.</li>
        </ol>
        <p class="participate-note">Click <strong>Smoke evaluation</strong> first: it runs just 1 task as a smoke test. When it passes, click <strong>Start evaluation</strong> for the full run.</p>
        <p><strong>Example:</strong> <a href="${MAKA_URL}" target="_blank" rel="noopener noreferrer">Maka</a> runs with <a href="${MAKA_SCRIPT_URL}" target="_blank" rel="noopener noreferrer">this custom external agent script</a>.</p>
        <details class="prompt-block">
          <summary>Prompt for writing a script for your own harness</summary>
          <div class="prompt-tools">
            <span class="muted">Replace &lt;AGENT_NAME&gt;, &lt;PINNED_VERSION&gt; and &lt;URL&gt;, then give it to a coding agent.</span>
            <button type="button" class="copy-button" data-copy="agent-prompt" aria-label="Copy prompt">Copy</button>
          </div>
          <pre class="code-block"><code id="agent-prompt">${esc(AGENT_PROMPT)}</code></pre>
        </details>
        <p class="participate-links"><a class="button-link" href="${RUNTA_URL}" target="_blank" rel="noopener noreferrer">Run on Runta <span aria-hidden="true">&nearr;</span></a></p>
      </article>

      <article class="card participate-card">
        <span class="step-num">02</span>
        <h2>Submit the Harbor link</h2>
        <p class="participate-note">When the evaluation completes, open it in Runta and click <strong>Enable public link</strong> under <strong>Public Harbor link</strong>. Public access is disabled by default, so the link won&rsquo;t open for reviewers until you enable it.</p>
        <p>Then open a submission issue in the Arena repository with:</p>
        <ul class="participate-list">
          <li>Harness name and version</li>
          <li>Model</li>
          <li>Public Harbor link to the run</li>
        </ul>
        <p>Or open a pull request that adds one file, <code>submissions/&lt;harness&gt;-&lt;version&gt;-&lt;model&gt;.md</code>, copied from the template with the same details. See the <a href="${SUBMISSIONS_URL}" target="_blank" rel="noopener noreferrer">submissions README</a>.</p>
        <p class="participate-links"><a class="button-link" href="${SUBMIT_URL}" target="_blank" rel="noopener noreferrer">Submit on GitHub <span aria-hidden="true">&nearr;</span></a><a class="button-link secondary" href="${PR_URL}" target="_blank" rel="noopener noreferrer">Open a pull request <span aria-hidden="true">&nearr;</span></a></p>
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
