# angelX 0.2.87-pre.7 on zai/glm-5.3-flash

- Harness name: angelX
- Version: 0.2.87-pre.7
- Model: zai/glm-5.3-flash
- Public Harbor link: https://hub.harborframework.com/jobs/b9b0509a-a17e-49eb-8be8-075a51778307

## Notes

Native Rust coding agent harness (`angelX`, https://github.com/newjordan/angelX) evaluated on `frontier-harness-eval/frontier-harness-eval-lite@v1.0.0` via Runta (`-e runta --override-storage-mb 32768 -k 4 -n 10`, `reasoning_effort=max`, `max_output_tokens=131072`).

100% general-purpose configuration (zero task-specific logic, rules, hints, or web/delegation tools):
- **Agent binary:** Unmodified official prebuilt Linux x86_64 release [`angelX v0.2.87-pre.7`](https://github.com/newjordan/angelX/releases/tag/v0.2.87-pre.7) (`angelX-linux-x86_64.tar.gz`, SHA256 `f4a1643317e8418db5aa5652971520892c8b97753ab53ba3c2087e7e343704cb`).
- **Pinned Harbor agent revision:** https://gist.github.com/newjordan/04151ec9e65f9d10e60189efc4b376aa/c3aff06d6b131ba833f51587b7e75064590e26d4
- **Model & provider settings:** Direct Z.ai Coding API (`https://api.z.ai/api/coding/paas/v4`, `glm-5.3-flash`, default temperature, `reasoning_effort=max`, `max_output_tokens=131072`, preserved thinking `ANGEL_GLM_PRESERVED_THINKING=1`, native `["text","image"]` multimodal `vision_look` via `glm-5.3-flash` itself — single-model purity).
- **General-purpose harness updates in `0.2.87-pre.7`:** Lean 16-tool upfront surface, `task_pace=rapid`, `compact_prompt=1`, `coding_discipline=0`, `treebeard=off`, `task_recon=off`, `task_preread=0`, `task_call_timeout_secs=240`, `tool_idle_secs=180`, persistent services (`ANGEL_PROC_PERSISTENT_SERVICES=1`), tool-free stateless `vision_look` sidecar, raw `--yolo` container exit-127 shell diagnostics, 180s `--yolo` `proc_wait` (returning immediately on process exit) with live-job `loops.same-batch` exemption, and automatic Responses API HTTP-400 replay fallback.
- **Verified summary:** **89/99 scored (89.9% Pass@1; 89/100 = 89.0% including 1 verifier timeout on `model-extraction-relu-logits`), 94.0% Pass@2, 96.0% Pass@4 (24/25 tasks solved, 19/25 tasks 4/4)** · **$0.0161/pass** ($1.44 total across all 100 trials) · **408s/pass** (367s/task) · **90.8% prompt cache hit** · **29,129 uncached input tokens/task** · **0 non-timeout exceptions**.
