"""Shared canvas2d performance craft rules (glow / trails / particles).

Injected into codegen, repair, and refine so generated draw() stays
interactive on retina Studio without banning legitimate craft.
"""

from __future__ import annotations

# Canvas2d-focused; three/p5 get a short pointer via PERF_CRAFT_LIGHT.
PERF_CRAFT_CANVAS2D = """\
Performance craft (canvas2d — required for kinetic/glow tools):
- Prefer ≤ ~2–4 full-canvas fills and ≤ ~3 full path strokes for the hero effect per frame.
- Particle `count` default ≤ 48; max ≤ 100. Prefer soft discs / globalAlpha over blur.
- Trail / curve samples ~40–80 is enough; avoid 100+ steps with multi-pass effects.
- **Never** assign `shadowBlur` or `ctx.filter` inside a per-segment `for`/`while` loop.
  One soft edge outside a loop is OK; hundreds of blurred strokes will lag Studio hard.
- Neon / glow trails: build **one** path (Path2D or continuous lineTo), then 2–3 strokes with
  increasing lineWidth + low globalAlpha — or import helpers:
  `import { strokeSoftGlow, fillSoftDisc } from "@repo/contracts/skeletons/canvas2d";`
  Prefer strokeSoftGlow / fillSoftDisc over inventing per-segment blur.
- Fade-buffer trails (semi-transparent clear + draw head) are fine for comet looks.
- Cache static geometry when only phase/time changes (rebuild on resize / curve enum).
- `"lighter"` composite is OK on whole glow passes, not required on every tiny segment.
- Drive glow intensity via alpha/width, not by multiplying blurred segment count.
"""

PERF_CRAFT_LIGHT = """\
Performance (all targets): keep per-frame work bounded; avoid nested blur/filter loops;
prefer harness helpers; particle counts default low (≤48). canvas2d: see soft-glow path rules.
"""

PERF_CRAFT_REPAIR = """\
If errors mention perf: or the draw uses shadowBlur/filter inside segment loops, rewrite glow
to single-path multi-width alpha (strokeSoftGlow) or fade-buffer — keep the same look, cut cost.
Do not "fix" lag by deleting craft into a stub; rewrite the expensive path.
"""

PERF_CRAFT_REFINE = """\
When editing trails, glow, particles, or motion: preserve look but prefer efficient patterns
(single-path multi-width glow / fillSoftDisc / bounded particle count). Do not introduce
shadowBlur or ctx.filter inside per-segment loops.
"""
