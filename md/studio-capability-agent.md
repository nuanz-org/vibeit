# Studio capability agent (continuous refine)

## Goal

After Create, Studio chat follows the **Brik product pattern**: each turn the agent receives **current controllers + values + history + message**, then edits **control ranges / values** (not vague “regen”) so requests like “gallery arc more than 600” expand `max` (e.g. to 3000) and tell the user to dial the slider.

No separate intent-classifier service. The capability LLM returns a JSON ops plan; appliers enforce Brik-style range-before-value.

## Ops (v1)

| Op | Effect |
|----|--------|
| `update_param_meta` | `min` / `max` / `step` / `label` / `default` / `group` + code `getParamSchema` sync |
| `update_param_value` | `tools.draft_params` (optional `alsoDefault`) |
| `patch_code` | Structural TS edit (existing code-patch path) |

## Flow

1. `POST /tools/{id}/refine` `{ message, baseVersionId?, clientParams? }`
2. Append user turn to **`tools.chat_history`** (and job history)
3. Worker builds **context pack** (`refine_context.py`)
4. Capability agent → ops → `refine_ops.apply_capability_ops`
5. Validate/smoke when a new version is needed; draft-only can finalize without full rewrite
6. Finalize: new version if schema/code changed; merge draft; assistant **explain** on job + tool history
7. Studio hydrates history, remounts, applies draft

## Key files

- Migration `010_tool_chat_history.sql`
- `services/refine_ops.py`, `services/refine_context.py`
- `agent/nodes/refine_capability.py`, `agent/prompts/refine_capability.py`
- `agent/runner.py` (default `patch_mode=capability`)
- Studio: `refine-chat-panel.tsx`, `studio-shell.tsx`

## Manual check

Chat: “increase card spacing max to 500 and set it to 500” → Controls max ≥ 500, value 500, history survives reload.
