# Three target eval corpus (Track B5)

Offline quality gates for the real three harness + agent path.

## Run

```bash
cd apps/api
uv run python scripts/eval_three.py
uv run python scripts/eval_three.py --json
```

Exit code **0** = all required offline gates green → safe to opt-in:

```bash
AIDITR_TARGET_THREE_ENABLED=1
```

Default remains **off** until an operator enables the flag after a green run.

## What is gated (offline)

| Gate | Meaning |
|------|---------|
| `policy_default_off` | three disabled without env flag |
| `policy_enable_resolves` | flag enables plan target three |
| `vendor_pin` | npm three pin matches product constant |
| `harness_real_three` | skeleton owns Scene / WebGLRenderer / Camera |
| `golden_static` | three-depth passes static validate |
| `golden_structural` | structural smoke |
| `golden_compile` | esbuild bundle under size limit |
| `golden_param_coverage` | plan params referenced in golden |
| `golden_host` | Playwright host smoke + capture |
| `allowlist_blocks_cdn` | esm.sh / bare three rejected |
| `agent_prompts_three` | B4 three codegen craft present |
| `studio_mount_target` | B3 resolveRuntimeTarget present |
| `corpus_defined` | this prompts.json is valid |

## Live eval (optional)

Live Create on three prompts still uses the main create runner with three enabled; not required for B5 offline green:

```bash
AIDITR_TARGET_THREE_ENABLED=1 EVAL_LIVE=1 uv run python scripts/eval_create.py
```

Live first-pass thresholds in `prompts.json` → `gates.minLive*` are advisory until a committed shootout.
