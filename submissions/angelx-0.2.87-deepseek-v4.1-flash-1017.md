# angelX 0.2.87 on deepseek/deepseek-v4.1-flash-1017

- Harness name: angelX
- Version: 0.2.87
- Model: deepseek/deepseek-v4.1-flash-1017
- Public Harbor link: https://hub.harborframework.com/jobs/dbf71ef5-146d-4adf-b76e-5dac76ffa87d

## Notes

Native Rust coding agent harness (`angelX`, https://github.com/newjordan/angelX) evaluated on `frontier-harness-eval/frontier-harness-eval-lite@v1.0.0` via Runta (25 tasks x 4 attempts = 100/100 scored, 0 infra errors, `--override-storage-mb 32768`, `reasoning_effort=max`, `max_output_tokens=131072`).

100% general-purpose configuration (zero task-specific rules, hints, or hacks):
- Lean 16-tool immutable surface (`read_file,write_file,str_replace,multi_edit,apply_patch,shell,grep,find_files,list_dir,outline,handle_read,proc_run,proc_status,proc_stop,proc_wait,vision_look`), `task_pace=rapid`, `compact_prompt=1`, `coding_discipline=0`, `treebeard=off`, `task_recon=off`, `task_call_timeout_secs=600`, `ANGEL_PROC_PERSISTENT_SERVICES=1`, DeepSeek Messages API (`ANGEL_DEEPSEEK_API=messages`).
- General-purpose engineering updates in `0.2.87`: parallel read-only `vision_look` dispatch, double-fork persistent service process-owner survival, streamed SSE usage telemetry in `wire/*.jsonl`, V8 live-policy deadline raised (`200ms -> 2000ms`), non-prefix-breaking elapsed-time stopwatch checkpoints (`7m/14m/25m/40m`), and a standing KV-cached general engineering contract.
- Verified summary: 92/100 (92.0% Pass@1, 98.0% Pass@2, 100.0% Pass@4, 20/25 tasks 4/4), $2.50 total ($0.0272/pass), 469s/pass, 98.0% prompt cache hit, 16,743 uncached input tokens/task.
- Logo: happy to provide our square black-background Excalibur `angelX` icon mark for the leaderboard if helpful.
