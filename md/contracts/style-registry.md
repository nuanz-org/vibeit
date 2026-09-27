# Style registry

Every Create run builds the tool in **one locked visual style**. The style decides the
technique, palette structure, texture, typeface class and motion character. The model's
freedom is limited to what the style marks as adaptable: layout, scale, subject, copy,
exact colours within the palette rule, lighting, timing.

- Seed: `apps/api/src/agent/style_registry/styles.seed.json` (48 entries: 43 looks + 5 type treatments)
- Code: `apps/api/src/agent/style_registry/` (`registry`, `select`, `apply`, `prompt_block`, `lint`)
- Tests: `apps/api/tests/test_style_registry.py`
- Switch: `AIDITR_STYLE_LOCK=0` turns the registry off (legacy pipeline). Default on.

## How a style is chosen

1. **User pick (Plan mode).** Clarify puts a `visualStyle` question first, offering the top 4
   shortlisted looks. The answer is saved as `clarify.result.styleId`. It locks the look and
   does *not* become an enum control.
2. **Named in the prompt.** "risograph poster", "in pixel art" → keyword match, locked.
3. **Plan LLM pick.** Otherwise the plan prompt gets a shortlist of 6 looks, scored on
   mood / subject / format words in the vision (at most 2 per family; photo-only looks are
   down-ranked unless the prompt mentions a photo). The plan returns `styleId`.
4. **Fallback.** An invalid or missing pick → top of the shortlist. No match at all →
   `editorial, swiss, flat-vector, paper-cut, risograph, grainy-gradient`.

Type treatments (`type.*`) combine with any look: locked when named ("kinetic typography"),
otherwise the plan may set `typeTreatmentId`.

## How the lock is enforced

| Stage | What happens |
|---|---|
| Plan | `apply_style_to_plan` sets `plan.styleId`, adds the style's controls to `params` and drops plan colour params that duplicate a colour role the style owns (bg / ink / accent). It rewrites `paletteRoles` from the style colours and adds an image slot for photo looks. The plan may adapt colour defaults via `styleColors`. |
| Codegen | Full **STYLE LOCK** block: essence, palette rule + defaults, font stacks, composition, texture, lighting, motion, numbered recipe, MUST / NEVER, style controls, the automatic checks, LOCKED vs YOU MAY ADAPT. Reference code is the neutral `golden/setup-shell.ts` (or a golden the style names). Tag-matched goldens are skipped because their own dark / glow look fights the lock. |
| Validate | `lint_style` rejects forbidden techniques and missing required ones (`style:` errors → repair). |
| Smoke | `param_coverage` already forces every style control to be read in code. |
| Repair / refine code patch | Compact STYLE LOCK: fixes and chat edits must stay in the look unless the user asks for another style. |
| Critic | Compact STYLE LOCK plus a `styleAdherence` score (outside the mean). A NEVER violation caps palette at 2, and the first fix must restore the style. |

## Entry schema

```jsonc
{
  "id": "look.risograph",          // slot prefix + kebab name; never reuse ids
  "slot": "look" | "type",
  "family": "print|movement|digital|craft|photo|data|type",  // shortlist diversity
  "name": "Risograph",
  "tier": "core" | "extended",     // core = build first, gets a small ranking bonus
  "status": "active",
  "summary": "…",                  // one line, shown to users in the style picker
  "keywords": ["risograph", "riso"],  // explicit mentions that LOCK the style (use strong words only)
  "suits": { "moods": [], "subjects": [], "formats": [] },   // shortlist scoring
  "avoidFor": [],                  // words that push the style down
  "image": "none" | "optional" | "required",
  "conflicts": ["look.y2k-chrome"],
  "spec": {                        // looks; type entries use essence/rule/must/never
    "essence": "…",
    "palette": { "rule": "…", "defaults": { "paper": "#…" }, "adaptable": "…" },
    "typography": { "rule": "…", "fonts": ["slab", "serifText"] },   // keys of fontStacks
    "composition": { "rule": "…", "adaptable": "…" },
    "texture": "…", "lighting": "…",
    "motion": { "rule": "…", "fps": 10 },
    "recipe": ["canvas2d step 1", "step 2", "…"],
    "must": ["…"], "never": ["…"]
  },
  "controls": [ /* param objects; colour controls may carry "role": bg|ink|accent */ ],
  "lint": { "forbid": ["noGradient"], "require": ["requireMultiply"] },   // keys of lintRules
  "goldens": [],                   // golden ids that show this look (optional)
  "preview": null                  // preview image path, once rendered
}
```

Top-level `lockPolicy`, `fontStacks` (system fonts only — the runtime frame blocks web fonts)
and `lintRules` (regex + message) are shared by all entries.

## Writing a good style entry

- **Technique, not mood.** "Warm and cozy" does nothing. "Two flat inks, multiply overprint,
  1–3px misregistration, no gradients" tells the model exactly what to draw.
- The recipe must be implementable in canvas2d with the harness (offscreen canvases,
  composite modes, getImageData, stepped time via `Math.floor(time * fps)`).
- Every MUST / NEVER should be checkable by eye; put the ones a regex can check in `lint`.
  Only lint what is always wrong for the style (a false positive burns repair budget).
- Controls are the style's own knobs (misregistration, grain, boil fps). 2–6 per style.
- Colour defaults: light grounds unless the look is dark by nature (neon, CRT, terminal).

## Adding or changing a style

1. Add the entry to `styles.seed.json`. `load_registry()` validates ids, conflicts, fonts,
   lint rules and controls on load.
2. Run `uv run python tests/test_style_registry.py` (update the 48 count test).
3. Build one test tool in the style (for example a Create run naming it). Render it at 3–4
   points in time and check it against the MUST / NEVER lists before setting `tier: core`.
4. Save a preview image and set `preview`. It's needed for the visual style picker.

## Core set (build and verify first)

risograph, letterpress, swiss, memphis, editorial, neo-brutalism, pixel-art, blueprint,
paper-cut, flat-vector, grainy-gradient, editorial-chart, plus type.kinetic.

## Not done yet

- Preview images per style (the clarify chips show name + description only).
- A style picker on the Create form outside Plan mode (needs `styleId` on the job API).
- A TypeScript mirror in `packages/contracts` for the web picker.
- A default image library for photo looks (they draw a procedural stand-in until then).
