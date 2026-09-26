# Aiditr design language

The landing page is the reference. This document pulls out its rules so the product (Studio, gallery, auth, settings) looks and feels like the same thing. Source of truth for the values: `apps/web/app/globals.css`.

---

## 1. Character

**A quiet design tool with one loud colour.** The interface is monochrome and precise, like Figma or Linear. Colour lives in two places only: the user's canvases, and a single electric blue (`#0000FF`) for primary action and "live" signals.

| Principle | What it means in practice |
| --- | --- |
| **The canvas is the colour** | Chrome stays black/white/grey so the user's vivid work pops. Never tint panels, never use gradients in UI. |
| **One accent, used sparingly** | `#0000FF` marks the primary action, live/active state, and completion. If more than one blue thing competes on a screen, one is wrong. |
| **Ink for selection** | Selected/active state in controls is **near-black (`--fg`) fill**, not blue. Blue = "go / alive", ink = "chosen". |
| **Tool-like precision** | Mono labels, tabular numbers, registration marks, dot-grid workspace, exact dimensions (`1080 × 1350`). It should feel like an instrument. |
| **Calm, fast motion** | 120–240 ms, one easing curve, small distances (6–14 px). Nothing bounces. Everything respects reduced motion. |
| **Plain, confident copy** | Short declarative sentences. Says what it does and what it doesn't. |

---

## 2. Colour

### Tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#0c0c0d` | Page background |
| `--fg` | `#1c1d1f` | `#ededee` | Primary text, selected fills, slider fill |
| `--muted` | `#5c5c5c` | `#a1a1a7` | Secondary text, labels, unselected options |
| `--band` | `#fafafa` | `#121214` | Alternate section / card fill, nav-link hover |
| `--surface` | `#ffffff` | `#141416` | Panels, cards, popovers |
| `--workspace` | `#f4f5f7` | `#0f0f11` | Canvas area, segmented-control track, icon wells |
| `--workspace-dot` | `#dfe2e7` | `#222328` | Dot grid on workspace |
| `--border` | `#e4e7ec` | `#25262a` | Default 1px borders and dividers |
| `--border-strong` | `#cfd4dc` | `#37383e` | Input hover, outline buttons, slider track, off-toggle |
| `--accent` | `#0000ff` | `#0000ff` | Primary button fill, done-check, on-state for publish |
| `--accent-hover` | `#0000d1` | `#2b2bff` | Primary hover |
| `--accent-fg` | `#ffffff` | `#ffffff` | Text on accent |
| `--accent-text` | `#0000ff` | `#9a9aff` | Accent used **as text or small dots** (readable on dark) |
| `--ink` | `#202124` | `#ededee` | Secondary solid button, toasts, user chat bubble |
| `--ink-hover` | `#36373b` | `#d6d6d9` | |
| `--ink-fg` | `#ffffff` | `#0c0c0d` | Text on ink |
| `--focus` | `#0000ff` | `#9a9aff` | Focus rings |

Rules:
- Accent as **fill** → `--accent`. Accent as **text/dot/border on the page** → `--accent-text` (pure blue fails contrast on dark).
- Accent tints: `bg-accent/[0.06]` (light) / `bg-accent/20` (dark) for a highlighted control; `bg-accent/5` for a drag-over drop zone.
- Swatch/thumbnail edges: `border-black/10` light, `border-white/15` dark.
- Text selection is accent on accent-fg.
- No other UI colours. If the product needs error/success, keep them desaturated and rare (`--danger`), and prefer ink + an icon over colour.

### Canvas palette (for templates, defaults, examples — not UI chrome)

Blue `#0000FF` · Black `#111113` · Lime `#D6FF3D` · Paper `#F2EFE8` · Vermilion `#FF4F2B` · Periwinkle `#6B6BFF` · Peach `#FF8A5C` · Sand `#F4E6DA` · Violet `#B04CFF` · Cyan `#1FE0FF`

Signature pairings: white on blue, lime on black, black on paper.

---

## 3. Typography

**Fonts** (local woff in `apps/web/app/fonts`):
- **Geist** — everything. `font-feature-settings: "ss01"`.
- **Geist Mono** — labels, values, timecodes, dimensions, step numbers. Always `tabular-nums`.
- **Instrument Serif** — only *inside* canvases (e.g. quote cards). Never in UI.

Weights: **400 and 500 only.** No bold (`font-semibold`/`font-bold` are mapped to 500 as a safety net). Headings are 500 with tight negative tracking.

### Scale

| Name | Size | Line-height | Tracking | Weight | Where |
| --- | --- | --- | --- | --- | --- |
| `t-display` | 38 → 60px (64px in 2-col) | 1.0 | −0.042em | 500 | Marketing hero only |
| `t-h2` | 34 → 60px | 1.02 | −0.038em | 500 | Section / page titles |
| `t-h3` | 19px | 1.3 | −0.018em | 500 | Card titles, dialog titles |
| `t-lead` | 17 → 20px, `--muted` | 1.5 | −0.008em | 400 | Intro paragraphs |
| body | 15px, `--muted` | 1.55 | — | 400 | Descriptive text |
| UI | 13.5–14px | ~1.35 | −0.01em | 400/500 | Nav, inputs, panel titles |
| control label | 12.5px | 1 | −0.005em | 500 | Slider/field labels |
| control value | 11.5px mono, `--muted` | 1 | — | 400 | Slider readouts, counters |
| `t-label` | 11.5px mono, UPPERCASE | 1.2 | +0.04em | 400 | Eyebrows, group headers, status |

In the app, most screens live at the UI/control sizes. Use `t-h2` sparingly (empty states, gallery header); use `t-h3` for dialog/panel headings.

**Two-tone headlines**: second line in `--muted`. Use `text-balance` on headings, `text-pretty` on leads.

**Eyebrows**: `t-label text-muted`, optionally numbered: `02 — How it works`.

---

## 4. Layout & spacing

- **Container** (`wrap`): max 1320px; side padding 20 / 32 (≥768) / 48 (≥1280).
- **Section rhythm**: `clamp(88px, 6rem + 4vw, 168px)` — marketing only; app screens use 24–48px.
- **Nav**: 64px, sticky, `--bg`, border appears only after scroll.
- **Spacing scale**: 4px base. Common: 6, 8, 12, 16, 24, 32, 48. Controls stack at 16px gaps; label→control 6px.
- **Breakpoints**: Tailwind defaults. Desktop behaviour switches at `lg` (1024px).
- **Studio layout**: workspace `1fr` + controls column **248px** fixed, separated by a 1px border. Controls stack below on mobile.

---

## 5. Shape & elevation

| Radius | Tailwind | Use |
| --- | --- | --- |
| `999px` | `rounded-full` | Buttons, chips, pills, segmented tracks, chat input, toggles |
| 12px | `rounded-panel` / `rounded-2xl` | Top-level panels (Studio, step cards) |
| 10px | `rounded-card` / `rounded-xl` | Inner cards, size picker track |
| 8px | `rounded-control` / `rounded-lg` | Inputs, drop zones, small canvases, highlighted rows |
| 6px | `rounded-md` | Thumbnails, selected list rows, segment thumbs |
| 4–5px | `rounded-xs` / `rounded-sm` | Swatch squares, mono tag chips |

Shadows are rare and soft:
- Panel: `shadow-panel`.
- Canvas frame: `shadow-frame`.
- Segment thumb / knob: `shadow-knob`.

Default to a **1px `--border` and no shadow**. Only the main working panel and the canvas get lift.

---

## 6. Components

### Buttons
- Pill, 48px tall (36px small, 40px in nav, 56px big CTA), padding 22px, 15px/500, gap 10px.
- **Primary** — accent fill. One per view.
- **Ink** — near-black fill. Secondary solid action inside tools ("Export PNG").
- **Outline** — `--border-strong` 1px, hover border → `--fg`.
- **Ghost / nav** — muted text, hover `bg-band` + `text-fg`.
- Press: `scale(0.985)`. Trailing arrow nudges `translateX(3px)` on hover.
- Icon button: 32px circle, 1px border, `--surface`; hover border → `--fg`.

### Inputs
- 36px (44px on touch), radius 8, 1px `--border`, `--bg` fill, 13.5px.
- Hover → `--border-strong`; focus → border `--fg` (no glow ring on text fields).
- Character counter in mono at the label's right: `12/40`.

### Slider (signature control)
- 4px track, `--border-strong`; filled portion `--fg`.
- 16px thumb: `--surface` fill, 1.5px `--fg` ring. Hover scale 1.12, active 1.22.
- Label left (12.5/500), value right (mono 11.5, muted), e.g. `1.6×`.

### Segmented control
- Track: pill, `--workspace` fill, 1px border, 3px padding.
- Thumb slides (240ms). Light thumb (`--surface` + border + `shadow-knob`) for options; **ink thumb** (`--fg` fill, text `--bg`) for strong mode switches like canvas size.

### Toggle
38×22 pill; off `--border-strong`, on `--fg`. 16px white knob. Use `--accent` for on-state only when the toggle means "go live / publish".

### Colour swatches
Circles 24–28px, `border-black/10`. Selected: `0 0 0 2px var(--surface), 0 0 0 3.5px var(--fg)` ring. Hover scale 1.08.

### Drop zone
44px, radius 8, **dashed** `--border-strong`; hover border `--fg`; drag-over `--accent` border + `accent/5` fill. 32px thumbnail well in `--workspace`.

### Panel (Studio frame)
- 12px radius, 1px border, `--surface`, `shadow-panel`.
- 48px top bar: name (13.5/500) · `LIVE` pill (mono, blinking accent dot) · actions right.
- Workspace uses `workspace-grid` (16px dot grid), mono dimension label top-left (`PORTRAIT · 1080 × 1350`), canvas centred with corner registration marks.
- Control groups headed by `t-label`.

### Chat
- User bubble: `--ink` fill, right-aligned. AI bubble: `--surface` + border, left. Radius 10, 12.5px.
- Input: pill, 36px, placeholder "Ask for a change…".
- Quick replies as outline pills; chosen one flips to `--fg` fill.

### Progress / status list
16px circles: todo = border; busy = accent-text ring + blinking dot; done = accent fill + white check. Header in `t-label` with a mono timer.

### Toast
Pill, `--ink` fill, 12px/500, check icon, `animate-toast-in`, auto-dismiss ~2.6s, `role="status"`.

### Chips / tags
- Status pill: 20px, mono 10px uppercase, 1px border.
- Mono tag: radius 5, 10.5px, border; active = `--fg` border + text.

---

## 7. Iconography

- Inline SVG or Lucide at `strokeWidth={1.5}`, round caps/joins, `currentColor`. Rendered at 12–18px. Always `aria-hidden`.
- Logo: 22px blue tile (radius 6). Blue is always `#0000FF`, never themed.

---

## 8. Motion

| Token | Tailwind | Value | Use |
| --- | --- | --- | --- |
| `--ease` | `ease-ui` | `cubic-bezier(0.4, 0, 0.2, 1)` | Everything |
| `--dur-1` | `duration-press` | 120ms | Press / scale |
| `--dur-2` | `duration-fast` | 180ms | Colour, border, hover |
| `--dur-3` | `duration-ui` | 240ms | Position, entrances, thumbs, accordions |
| — | `duration-[360ms]` | 360ms | Canvas frame resizing between aspect ratios |

Patterns: `animate-panel-in` (8px rise), `animate-toast-in`, `animate-live-blink` (1.6s accent dot), `animate-caret`. Reduced motion is honoured globally in `globals.css`.

---

## 9. Theming

- `data-theme="light|dark"` on `<html>`, persisted as `aiditr-theme` in localStorage, set by an inline boot script in `app/layout.tsx` before paint. Falls back to `prefers-color-scheme` when no JS. `useTheme()` in `lib/theme.ts` reads/sets it.
- Tailwind v4: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`; tokens mapped in `@theme inline` so classes read `bg-surface`, `text-muted`, `border-border-strong`, `bg-accent`, `text-ink-fg`…
- shadcn names (`background`, `foreground`, `primary`, `card`, `muted-foreground`, …) are aliases of the canonical tokens. Prefer canonical names in new code.
- Dark mode is not inverted light: surfaces step up in lightness (`bg` 0c → `workspace` 0f → `band` 12 → `surface` 14), accent text lightens to `#9a9aff`, ink flips to light.

---

## 10. Accessibility baseline

- Focus: 2px `--focus` outline, 3px offset. Swatches/sliders use a double ring (`surface` gap + `focus`).
- Touch: `pointer-coarse` raises controls to 44px; `hit` expands small targets by 8px.
- `aria-live` toasts, labelled radiogroups for swatches and segments, `role="switch"` toggles, `aria-valuetext` on sliders.

---

## 11. Voice

- **Short, declarative, concrete.** Say what it *doesn't* do as plainly as what it does.
- Specific numbers over adjectives: "3–6 second loop", "1080 × 1350".
- **British spelling** (colour, favourite). Sentence case everywhere. Curly quotes (“ ”), `×` for dimensions, en dash for ranges.
- Buttons are verbs: "Start creating", "Export PNG", "Publish to gallery".
- Status copy is past-tense and factual: "Exported 1080 × 1080 PNG".

---

## 12. Checklist for any new screen

- [ ] Only one accent-filled element?
- [ ] Selection shown with ink, not blue?
- [ ] Numbers/dimensions in mono, tabular?
- [ ] Weights 400/500 only?
- [ ] Borders before shadows?
- [ ] Works in dark mode and with reduced motion?
