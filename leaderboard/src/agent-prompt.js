/* The prompt Participate offers for writing a Runta custom external agent script for another harness. Kept verbatim,
   placeholders included. */
export const AGENT_PROMPT = `Build a standalone Harbor custom-agent script for:

- Agent: <AGENT_NAME>
- Exact version: <PINNED_VERSION>
- Official documentation or repository: <URL>

Reference implementation:
https://gist.github.com/SASUKE40/814ee913da4f27932cfe0c2282ba75bf

Use the reference for Harbor integration patterns. Implement installation, execution, and trajectory conversion using the target agent’s actual interfaces.

Requirements:

1. Deliver one self-contained Python file exposing a class named CustomAgent that inherits from Harbor’s BaseAgent.
   - Python source must be at most 32,000 UTF-8 bytes. Aim below 31,000 bytes.
   - Additional pip requirements must be at most 4,000 UTF-8 bytes.
   - Harbor is already installed. Leave requirements empty if no additional packages are needed.
   - Preserve applicable license notices.
   - Keep the code readable; do not hide compressed code behind exec or eval.

2. Inspect the official documentation, pinned agent implementation, and installed Harbor interfaces before coding. Do not invent CLI options, event schemas, or API parameters.

3. Implement setup() and run().
   - Install the pinned agent inside the task environment.
   - Run it non-interactively in the task working directory.
   - Pass the task instruction safely.
   - Preserve execution failures and cancellation.
   - Bound artifact downloads and cleanup operations.
   - Do not depend on files or imports from the development repository.

4. Integrate Harbor’s model connection settings.
   - Handle model_name, base_url, model_api_format, and model_api_key_name.
   - Support bare model names and recognized provider/model names.
   - Honor explicit endpoint, format, and credential overrides.
   - Read credentials from Harbor’s supplied environment.
   - Declare AgentCapabilities and MODEL_CONNECTION accurately.
   - Reject unsupported API formats with a clear error.
   - Never hardcode or log API keys.

5. Export valid ATIF v1.8 to self.logs_dir / "trajectory.json".
   - Declare atif=True only when valid output is implemented.
   - Include the instruction, recorded messages, available reasoning, tool calls, matching observations, and known usage totals.
   - Preserve event order and sequential step IDs.
   - Attach each tool observation to the step containing its matching call.
   - Avoid duplicating streaming updates.
   - Keep subagent histories separate when present.
   - Do not fabricate missing events, reasoning, token usage, or costs.
   - Keep invocation-level usage in final_metrics when it cannot be attributed accurately to individual model calls.
   - Preserve available history after failures. Mark incomplete exports clearly.
   - Validate output with Harbor’s trajectory models and validator.

6. Validate the finished script.
   - Check syntax and exact UTF-8 byte sizes.
   - Test model/endpoint/credential forwarding.
   - Test messages, tool linkage, usage totals, failures, cancellation, and missing artifacts.
   - Run an integration test with the pinned agent and a local mock model where practical.
   - Do not make paid model calls without authorization.
   - Report any validation you could not perform.

Deliver:
- The complete Python script, ready to paste into Harbor.
- Exact requirements text, or “leave empty.”
- Exact byte counts.
- A concise validation summary and any limitations.

Complete the implementation; do not stop at a plan or pseudocode.`;
