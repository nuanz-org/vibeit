"""
Parse / normalize clarify LLM output and user answers (A3).

Answer styles:
  - single option value → forced enum with that default (full option list)
  - multi-select values → forced enum with selected options (or full if all)
  - { "type": "all_options" } → forced enum with full question options
  - free text / unknown → locked notes + transcript
"""

from __future__ import annotations

import json
import re
from typing import Any

from agent.plan_parse import extract_json_object

_ID_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{0,47}$")
_MAX_QUESTIONS = 4
_MAX_OPTIONS = 5
_MIN_OPTIONS = 2


class ClarifyParseError(ValueError):
    pass


def _slug_id(raw: str, *, fallback: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_]+", "", (raw or "").strip())
    if not s:
        s = fallback
    if s[0].isdigit():
        s = f"q{s}"
    if not _ID_RE.match(s):
        s = fallback
    # camelCase-ish: lower first char
    return s[0].lower() + s[1:] if len(s) > 1 else s.lower()


def _normalize_option(raw: Any) -> dict[str, str] | None:
    if not isinstance(raw, dict):
        return None
    value = str(raw.get("value") or "").strip()
    label = str(raw.get("label") or value).strip()
    if not value:
        return None
    # stable value: strip spaces
    value = re.sub(r"\s+", "", value)
    if not value:
        return None
    out: dict[str, str] = {"value": value, "label": label or value}
    desc = raw.get("description")
    if isinstance(desc, str) and desc.strip():
        out["description"] = desc.strip()[:200]
    return out


def _normalize_question(raw: Any, *, index: int) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    prompt = str(raw.get("prompt") or raw.get("question") or "").strip()
    if not prompt:
        return None
    opts_raw = raw.get("options")
    if not isinstance(opts_raw, list):
        return None
    options: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in opts_raw:
        opt = _normalize_option(item)
        if opt is None or opt["value"] in seen:
            continue
        seen.add(opt["value"])
        options.append(opt)
        if len(options) >= _MAX_OPTIONS:
            break
    if len(options) < _MIN_OPTIONS:
        return None

    qid = _slug_id(str(raw.get("id") or ""), fallback=f"axis{index + 1}")
    multi = bool(raw.get("multiSelect") or raw.get("multi_select"))
    allow_all = raw.get("allowAllOptions")
    if allow_all is None:
        allow_all = raw.get("allow_all_options")
    if allow_all is None:
        allow_all = True

    q: dict[str, Any] = {
        "id": qid,
        "prompt": prompt[:280],
        "options": options,
        "multiSelect": multi,
        "allowAllOptions": bool(allow_all),
    }
    group = raw.get("group")
    if isinstance(group, str) and group.strip():
        q["group"] = group.strip()[:48]
    return q


def parse_clarify_response(text: str) -> dict[str, Any]:
    """
    Parse LLM clarify JSON → { understanding, questions[], skipReason? }.
    """
    try:
        data = extract_json_object(text)
    except Exception as exc:  # PlanParseError or other
        raise ClarifyParseError(str(exc)) from exc

    understanding = str(data.get("understanding") or "").strip()[:500]
    questions_raw = data.get("questions")
    questions: list[dict[str, Any]] = []
    if isinstance(questions_raw, list):
        for i, item in enumerate(questions_raw):
            q = _normalize_question(item, index=i)
            if q is None:
                continue
            # de-dupe ids
            if any(existing["id"] == q["id"] for existing in questions):
                q["id"] = f"{q['id']}{i + 1}"
            questions.append(q)
            if len(questions) >= _MAX_QUESTIONS:
                break

    out: dict[str, Any] = {
        "understanding": understanding
        or "I'll refine a few control axes before building.",
        "questions": questions,
    }
    skip = data.get("skipReason") or data.get("skip_reason")
    if isinstance(skip, str) and skip.strip():
        out["skipReason"] = skip.strip()[:280]
    return out


def _is_all_options(value: Any) -> bool:
    if isinstance(value, dict):
        t = value.get("type") or value.get("kind")
        return str(t).strip().lower() in ("all_options", "all", "alloptions")
    if isinstance(value, str):
        return value.strip().lower() in (
            "all_options",
            "all",
            "__all__",
            "all options",
            "all of them",
        )
    return False


def _option_map(question: dict[str, Any]) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for opt in question.get("options") or []:
        if isinstance(opt, dict) and opt.get("value"):
            out[str(opt["value"])] = {
                "value": str(opt["value"]),
                "label": str(opt.get("label") or opt["value"]),
            }
    return out


def _forced_enum_from_options(
    question: dict[str, Any],
    options: list[dict[str, str]],
    *,
    default: str,
) -> dict[str, Any]:
    qid = str(question["id"])
    label = str(question.get("prompt") or qid)
    # Prefer short label from group or id
    if isinstance(question.get("group"), str) and question["group"].strip():
        label = question["group"].strip()
    else:
        # first few words of prompt or id
        label = qid
    enum: dict[str, Any] = {
        "name": qid,
        "label": label[:48],
        "options": [
            {"value": o["value"], "label": o.get("label") or o["value"]}
            for o in options
        ],
        "default": default,
        "sourceQuestionId": qid,
    }
    if isinstance(question.get("group"), str) and question["group"].strip():
        enum["group"] = question["group"].strip()[:48]
    return enum


def normalize_clarify_answers(
    *,
    questions: list[dict[str, Any]],
    answers: dict[str, Any],
    understanding: str = "",
) -> dict[str, Any]:
    """
    Fold user answers into ClarifyResult.

    Returns:
      {
        transcript, forcedEnums[], lockedNotes[], summary?
      }
    """
    forced: list[dict[str, Any]] = []
    locked: list[str] = []
    lines: list[str] = []
    if understanding.strip():
        lines.append(f"Understanding: {understanding.strip()}")

    q_by_id = {
        str(q["id"]): q
        for q in questions
        if isinstance(q, dict) and q.get("id")
    }

    for qid, question in q_by_id.items():
        raw = answers.get(qid)
        if raw is None:
            continue
        prompt = str(question.get("prompt") or qid)
        opt_map = _option_map(question)
        all_opts = list(opt_map.values())

        if _is_all_options(raw):
            if not all_opts:
                continue
            default = all_opts[0]["value"]
            forced.append(
                _forced_enum_from_options(question, all_opts, default=default)
            )
            lines.append(
                f"Q: {prompt}\nA: all options → enum "
                f"[{', '.join(o['value'] for o in all_opts)}]"
            )
            continue

        if isinstance(raw, list):
            selected: list[dict[str, str]] = []
            for item in raw:
                key = str(item).strip()
                if key in opt_map:
                    selected.append(opt_map[key])
            if not selected:
                text = ", ".join(str(x) for x in raw if str(x).strip())
                if text:
                    locked.append(f"{prompt}: {text}")
                    lines.append(f"Q: {prompt}\nA: {text}")
                continue
            # If user picked every option, treat as full enum
            if len(selected) >= len(all_opts) and all_opts:
                selected = all_opts
            default = selected[0]["value"]
            forced.append(
                _forced_enum_from_options(question, selected, default=default)
            )
            lines.append(
                f"Q: {prompt}\nA: multi "
                f"[{', '.join(o['value'] for o in selected)}]"
            )
            continue

        # string answer
        s = str(raw).strip()
        if not s:
            continue
        if s in opt_map:
            # Single choice still becomes a playable enum with full options
            # (default = selected) so Studio can switch variants.
            if all_opts:
                forced.append(
                    _forced_enum_from_options(
                        question, all_opts, default=s
                    )
                )
            locked.append(f"{prompt}: prefer {opt_map[s]['label']} (default)")
            lines.append(f"Q: {prompt}\nA: {opt_map[s]['label']} ({s})")
        else:
            locked.append(f"{prompt}: {s}")
            lines.append(f"Q: {prompt}\nA: {s}")

    # Answers for unknown keys → free-text notes
    for key, raw in answers.items():
        if key in q_by_id:
            continue
        if raw is None:
            continue
        if isinstance(raw, (list, dict)):
            try:
                text = json.dumps(raw, ensure_ascii=False)
            except (TypeError, ValueError):
                text = str(raw)
        else:
            text = str(raw).strip()
        if text:
            locked.append(f"{key}: {text}")
            lines.append(f"Note ({key}): {text}")

    summary_parts: list[str] = []
    if forced:
        summary_parts.append(
            f"{len(forced)} control axis"
            f"{'es' if len(forced) != 1 else ''} from answers"
        )
    if locked:
        summary_parts.append(f"{len(locked)} locked note(s)")
    summary = "; ".join(summary_parts) if summary_parts else "Answers recorded"

    return {
        "transcript": "\n\n".join(lines).strip() or "No clarify answers.",
        "forcedEnums": forced,
        "lockedNotes": locked,
        "summary": summary,
    }


def clarify_has_result(clarify: Any) -> bool:
    """True when answers were folded and build may proceed."""
    if not isinstance(clarify, dict):
        return False
    if clarify.get("answered") is True:
        return True
    result = clarify.get("result")
    return isinstance(result, dict) and bool(
        result.get("forcedEnums") is not None or result.get("transcript")
    )


def merge_forced_enums_into_plan(
    plan: dict[str, Any],
    forced_enums: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Ensure plan.params includes every forced enum (upsert by name).
    Used after plan LLM so axes are not collapsed.
    """
    if not forced_enums:
        return plan
    params = plan.get("params")
    if not isinstance(params, list):
        params = []
    by_name: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for p in params:
        if isinstance(p, dict) and p.get("name"):
            name = str(p["name"])
            by_name[name] = dict(p)
            order.append(name)

    for fe in forced_enums:
        if not isinstance(fe, dict):
            continue
        name = str(fe.get("name") or "").strip()
        if not name:
            continue
        options = fe.get("options") if isinstance(fe.get("options"), list) else []
        norm_opts = []
        for o in options:
            if isinstance(o, dict) and o.get("value"):
                norm_opts.append(
                    {
                        "value": str(o["value"]),
                        "label": str(o.get("label") or o["value"]),
                    }
                )
        if len(norm_opts) < 2:
            continue
        default = str(fe.get("default") or norm_opts[0]["value"])
        if default not in {o["value"] for o in norm_opts}:
            default = norm_opts[0]["value"]
        field: dict[str, Any] = {
            "name": name,
            "kind": "enum",
            "label": str(fe.get("label") or name),
            "default": default,
            "options": norm_opts,
            "uiHint": "segmented" if len(norm_opts) <= 4 else "select",
        }
        if isinstance(fe.get("group"), str) and fe["group"].strip():
            field["group"] = fe["group"].strip()
        if name in by_name:
            # Keep existing extra fields; force enum shape
            existing = by_name[name]
            existing.update(field)
            by_name[name] = existing
        else:
            by_name[name] = field
            order.append(name)

    plan = dict(plan)
    plan["params"] = [by_name[n] for n in order if n in by_name]
    return plan
