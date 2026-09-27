# Aiditr design language (forensic extraction)

This is extracted from `/Users/ashutosh/devlopment/nuanz/aiditr-landing`. It is meant to be applied mechanically to the product app (gallery, studio editor, create flow, auth forms, profile) so that it matches the marketing site **down to the class strings**.

- **Source of truth:** `app/globals.css`, `app/fonts.ts`, `app/layout.tsx`, `features/landing/ui/*`, `features/landing/sections/*`, `features/landing/site.ts`, `features/landing/Landing.tsx`.
- **Code wins over `DESIGN.md`.** Where they disagree, see §8.
- **Citations:** every `file:line` is relative to `aiditr-landing/features/landing/` unless it starts with `app/`.
- **"Derived" means not in the source.** Anything marked *derived* is a recommendation for product screens that the landing does not have. Everything else is quoted.

**Stack requirement.** The class strings use Tailwind **v4** syntax: `h-10!` (important suffix), `shadow-(--shadow-panel)` / `outline-(--focus)` / `h-(--nav-h)` (CSS-var shorthand), `pointer-coarse:`, `has-[:focus-visible]:`, `xs:` (custom breakpoint), `@utility`, `@custom-variant`, and `@theme inline`. The target app (`vibeit/apps/web`) is on `tailwindcss ^4.3.3` / Next 16.2, so everything here ports verbatim.

---

## In this app (`vibeit/apps/web`)

**The landing page is `aiditr-landing`; the app has none.** `/` redirects to `/gallery`, the URL the landing links to (`routes.gallery` in `aiditr-landing/features/landing/site.ts`). The redirect is temporary (307) on purpose, so `/` stays free if the landing is ever served from the same origin.

| Piece | Where | Notes |
|---|---|---|
| Tokens, utilities, controls CSS | `app/globals.css` | Mirrors `aiditr-landing/app/globals.css` verbatim, plus an "App additions" layer: shadcn aliases (`--background`, `--primary`… → the short tokens), `--danger`, `shadow-panel / shadow-frame / shadow-knob`, `ease-ui`, `duration-press / fast / ui` (120 / 180 / 240), `btn-ghost`, and chat/studio keyframes. |
| Fonts | `app/fonts.ts` | Geist + Geist Mono from `next/font/google`, same variables as the landing. |
| Theme | `app/layout.tsx` boot script, `components/prefs.tsx` | Same `aiditr-theme` key, so a visitor's choice carries from landing to app. `ThemeToggle` lives on the gallery canvas and the profile page. |
| Wordmark, icons | `components/wordmark.tsx`, `components/icons.tsx` | Copied from the landing. Icons add Pencil, PanelLeft, Upload, Copy, ArrowUp, ArrowLeft, Globe, Alert on the same 16px / 1.5px grid. Leftover lucide icons are thinned to 1.5px globally (`svg.lucide`). |
| Nav | `components/app-header.tsx` | Port of `sections/Nav.tsx`, identical on every page: always the centred 1320px `wrap`, so the wordmark, links and CTA never shift between screens. `bordered` keeps the hairline on for full-height screens (the gallery canvas); elsewhere it appears on scroll, as on the landing. Floating chrome on full-bleed screens sits on the same `wrap` grid. |
| Studio / Create chrome | `features/playground/styles.ts`, `playground-shell.tsx` | The landing Studio panel as shared class strings: 48px bars, `t-label` panel titles, dot-grid stage, square canvas frame with registration marks and `shadow-frame`, outline / ink / accent pills, LIVE chip. |
| Gallery | `features/gallery/*` | Landing tile anatomy on an infinite dot-grid canvas (the grid pans with the world). Frames hug each capture's own ratio; nothing tilts, lifts or springs. Detail opens with `panel-in`. |

**Two deliberate fixes over the landing CSS.** `:focus-visible` and `.hit` sit in CSS layers here. On the landing they are unlayered, so they silently beat Tailwind utilities: pills turn into 6px rectangles when keyboard-focused, and `hit` overrides an `absolute` utility on the same element.

### Design audit

`pnpm --filter web design:audit` (`apps/web/scripts/design-audit.mjs`) turns §7 into checks: weights 400/500, landing tokens only (no palette, hex, hue or legacy tokens), no gradients or glass, borders before shadows, pill solid buttons, ink selection, one easing curve and 120/180/240 ms, no springs or hover lift, px type scale and radii, `t-label` for uppercase, and copy (…, ×, en dashes, curly quotes, British spelling). Errors fail the run. Use `--strict` to fail on warnings too, `--json` for tooling, and pass paths to narrow the scope. A deliberate exception gets a `design-audit-ignore` comment with the reason, on the same line or the line above.

---

## 0. The whole language in ten lines

1. The chrome is monochrome: `bg` / `surface` / `band` / `workspace` greys plus `fg` / `muted` text. The user's canvases supply the colour.
2. There is one accent, `#0000FF`. As a fill it means **go / live / done** (primary CTA, done-check, "Copied", "Exporting", publish toggle).
3. Selection uses **ink**, not blue: `bg-fg text-bg`, `bg-ink text-ink-fg`, `border-fg`, or `peer-checked:font-medium peer-checked:text-fg`.
4. Geist is used at weights 400 and 500 only (`font-medium`). Headings are 500 with negative tracking. The only 600 is the wordmark.
5. Numbers, dimensions, ratios, timecodes and URLs are mono and tabular (`t-mono`). Small caps-style labels use `t-label`, which is mono, uppercase and +0.04em.
6. Interactive things are pills (`rounded-full`). Surfaces are 12 / 10 / 8 / 6 px.
7. Borders come before shadows. The default is `border border-border` with no shadow. Only the top-level tool panel and the canvas frame get lift.
8. Motion is 120 / 180 / 240 ms (360 ms for resizing), always `cubic-bezier(0.4,0,0.2,1)`, with 6–14 px moves. Nothing bounces. `prefers-reduced-motion` and the `aiditr-motion` pause preference are honoured.
9. Class names use arbitrary px sizes (`text-[12.5px]`), not the Tailwind named scale.
10. Copy is short, declarative and sentence case, in British spelling. It uses curly quotes, `×` for dimensions, en dash for ranges, `·` as a separator, and `…` for ellipses.

---

## 1. Tokens

### 1.1 CSS variables: colour (`app/globals.css:9-90`)

| Variable | Light `:root` | Dark `:root[data-theme="dark"]` | No-JS dark fallback¹ | Role |
|---|---|---|---|---|
| `--bg` | `#ffffff` | `#0c0c0d` | `#0c0c0d` | Page background, input fill, `text-bg` on ink fills |
| `--fg` | `#1c1d1f` | `#ededee` | `#ededee` | Primary text; **selected fills**; slider fill; hover borders |
| `--muted` | `#5c5c5c` | `#a1a1a7` | `#a1a1a7` | Secondary text, labels, unselected options, reg-marks |
| `--band` | `#fafafa` | `#121214` | `#121214` | Alternate section fill, nav-link hover, step-visual card, idle "Copy" pill, theme-toggle selected |
| `--border` | `#e4e7ec` | `#25262a` | `#25262a` | Default 1px borders and dividers |
| `--border-strong` | `#cfd4dc` | `#37383e` | `#37383e` | Input hover, outline buttons, slider track, toggle-off, dashed placeholders |
| `--surface` | `#ffffff` | `#141416` | `#141416` | Panels, cards, chips, slider/toggle knob |
| `--workspace` | `#f4f5f7` | `#0f0f11` | `#0f0f11` | Canvas area, segmented tracks, thumbnail wells |
| `--workspace-dot` | `#dfe2e7` | `#222328` | `#222328` | Dot grid in `.workspace-grid` (not mapped to a class) |
| `--accent` | `#0000ff` | `#0000ff` | *(not redeclared; same)* | Accent **fill** |
| `--accent-hover` | `#0000d1` | `#2b2bff` | `#2b2bff` | `btn-primary:hover` |
| `--accent-fg` | `#ffffff` | `#ffffff` | *(not redeclared; same)* | Text on accent (also `::selection` text) |
| `--accent-text` | `#0000ff` | `#9a9aff` | `#9a9aff` | Accent as **text / dot / thin ring** on the page |
| `--ink` | `#202124` | `#ededee` | `#ededee` | Secondary solid button, toast, user chat bubble, tab indicator, skip link |
| `--ink-hover` | `#36373b` | `#d6d6d9` | `#d6d6d9` | `btn-ink:hover` |
| `--ink-fg` | `#ffffff` | `#0c0c0d` | `#0c0c0d` | Text on ink |
| `--focus` | `#0000ff` | `#9a9aff` | `#9a9aff` | Focus outline (not mapped to a class) |

¹ `app/globals.css:71-90`: `@media (prefers-color-scheme: dark) { :root:not([data-theme]) {…} }`. This applies only when JS never ran. It **omits `--shadow-panel`** (see §8).

The dark theme is not an inverted light theme. Surfaces step **up** in lightness: `bg 0c` → `workspace 0f` → `band 12` → `surface 14`.

### 1.2 CSS variables: non-colour (`app/globals.css:30-39, 65`)

| Variable | Value | Used by |
|---|---|---|
| `--shadow-panel` (light) | `0 1px 2px rgb(16 24 40 / 0.04), 0 12px 32px -12px rgb(16 24 40 / 0.1)` | `shadow-(--shadow-panel)`: Studio panel (`ui/Studio.tsx:101`) and the mini tool panel (`sections/Concept.tsx:268`) |
| `--shadow-panel` (dark) | `0 1px 2px rgb(0 0 0 / 0.4), 0 16px 40px -16px rgb(0 0 0 / 0.6)` | same |
| `--ease` | `cubic-bezier(0.4, 0, 0.2, 1)` | all CSS transitions; `animate-[… var(--ease) …]` |
| `--dur-1` | `120ms` | press (`btn:active` scale), slider-thumb scale |
| `--dur-2` | `180ms` | colour / border / background changes |
| `--dur-3` | `240ms` | position, arrow nudge, link-draw, reveal/enter, accordion |
| `--radius-card` | `10px` | **declared, never referenced** (code writes `rounded-[10px]`) |
| `--radius-panel` | `12px` | **declared, never referenced** (code writes `rounded-[12px]`) |
| `--nav-h` | `64px` | `h-(--nav-h)` (`sections/Nav.tsx:49`), `scroll-padding-top`, `.concept-stick`, `lg:top-[calc(var(--nav-h)+2rem)]` (`sections/Faq.tsx:105`) |

Also set per element (not in `:root`): `--pct` (`.range` fill %), `--ar` (`.frame`, `.gallery-frame`, `.slot` aspect ratio w/h), `--enter-delay`, `--reveal-delay`, `--gutter` (`.bleed-x`), `--shelf-h` (`.slot`).

### 1.3 Theme wiring (`app/globals.css:1-3, 92-112`)

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme inline {
  --color-bg: var(--bg);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-band: var(--band);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-surface: var(--surface);
  --color-workspace: var(--workspace);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-fg: var(--accent-fg);
  --color-accent-text: var(--accent-text);
  --color-ink: var(--ink);
  --color-ink-hover: var(--ink-hover);
  --color-ink-fg: var(--ink-fg);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --breakpoint-xs: 30rem;
}
```

**Not mapped, so no utility class exists:** `--workspace-dot`, `--focus`, `--shadow-panel`, `--radius-*`, `--dur-*`, `--nav-h`. Reach them with Tailwind v4 var shorthand: `shadow-(--shadow-panel)`, `outline-(--focus)`, `h-(--nav-h)`.

### 1.4 Resulting Tailwind vocabulary

Any colour prefix works with any mapped token (`bg-`, `text-`, `border-`, `outline-`, `fill-`, `stroke-`, `placeholder:text-`, opacity modifiers `/N`). This is what the source **actually uses**, with counts from a grep over `features/` and `app/`:

| Class | Uses | Meaning / where |
|---|---|---|
| `text-muted` | 68 | secondary text, labels, unselected |
| `border-border` | 55 | default 1px border |
| `text-fg` | 40 | primary text |
| `bg-surface` | 23 | cards, chips, panels |
| `bg-fg` | 14 | **selected fill** (segmented ink thumb, selected rows/tags, quick reply, open FAQ icon), slider fill, progress fill |
| `border-fg` | 13 | hover border, active/selected outline |
| `text-white` | 10 | text on `bg-accent` (the code never uses `text-accent-fg`) |
| `bg-accent` | 9 | primary fill, done-check, "Copied", "Exporting", pinned chip, publish-on |
| `border-border-strong` | 7 | dashed placeholders, todo circles, "Not for" marker |
| `bg-band` | 7 | section band, nav hover, idle copy pill, step visual card |
| `text-accent-text` | 6 | accent links, FAQ question hover, current step number, chip hover |
| `bg-accent-text` | 6 | **dots only** (`size-1` / `size-1.5`), including `live-dot` |
| `border-black/10` + `dark:border-white/15` | 6 / 5 | edge on colour swatches and paper chips |
| `bg-ink` / `text-ink-fg` | 5 / 5 | toast, user bubble, tab indicator, "Export" pill, skip link |
| `text-bg` | 5 | text on `bg-fg` |
| `border-accent` | 5 | chip hover, drop zone drag-over, Remix pill hover, pinned chip, MiniSlider active thumb |
| `bg-workspace` | 4 | segmented tracks, thumbnail well, icon-button hover (image remove) |
| `bg-border-strong` | 4 | toggle off, slider track (MiniSlider), connector line |
| `bg-bg` | 4 | text input fill, custom-colour "+" chip, mini text field, `header` |
| `bg-border` | 2 | Studio transport progress track; `gap-px` grid-line trick (`Expectations.tsx:53`) |
| `bg-white/90`, `text-[#111113]`, `bg-black/65` | – | **canvas overlays only** (badges on top of user art) |
| `bg-accent/[0.06]`, `dark:bg-accent/20`, `bg-accent/5` | 1 each | highlighted control row; drag-over drop zone |
| `border-band` | 1 | timeline stop-dot knockout ring (`UseCases.tsx:354`) |
| `border-accent-text` | 1 | progress "busy" ring (`HowItWorks.tsx:189`) |
| `text-white/80` | 1 | meta line on the accent CTA band |
| `ease-standard` | many | `transition-* ease-standard` |
| `xs:` | several | ≥ 30rem (480px) |
| `font-sans` / `font-mono` | – | mapped but never written; body sets sans and `t-mono`/`t-label` set mono |

**Generated but never used:** `bg-accent-hover`, `bg-ink-hover`, `text-accent-fg`. They are used only inside `btn-*` utilities or not at all.

### 1.5 Base layer (`app/globals.css:118-147`)

```css
html { -webkit-text-size-adjust: 100%; scroll-padding-top: calc(var(--nav-h) + 16px); }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
body {
  background: var(--bg); color: var(--fg);
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  font-feature-settings: "ss01" on;
  text-rendering: optimizeLegibility;
  overflow-x: clip;
}
::selection { background: var(--accent); color: var(--accent-fg); }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; border-radius: 6px; }
```

### 1.6 Fonts (`app/fonts.ts`, `app/layout.tsx:46`)

```ts
export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Only drawn inside tool canvases (the quote card), so it never blocks first paint.
export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif", subsets: ["latin"], weight: "400",
  style: ["normal", "italic"], preload: false, display: "swap",
});
```

```tsx
<html lang="en" suppressHydrationWarning
  className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}>
```

Viewport `themeColor`: `#ffffff` (light) / `#0c0c0d` (dark) (`app/layout.tsx:30-35`).

### 1.7 Type scale

**Utilities** (`app/globals.css:170-216`):

| Utility | Size | Line-height | Tracking | Weight | Extra |
|---|---|---|---|---|---|
| `t-display` | `clamp(2.375rem, 1rem + 5vw, 3.75rem)` (38→60px); at `≥64rem` `clamp(3rem, 1rem + 3.2vw, 4rem)` (48→64px) | 1 | −0.042em | 500 | |
| `t-h2` | `clamp(2.125rem, 1.35rem + 2.6vw, 3.75rem)` (34→60px) | 1.02 | −0.038em | 500 | `text-wrap: balance` |
| `t-h3` | `1.1875rem` (19px) | 1.3 | −0.018em | 500 | |
| `t-lead` | `clamp(1.0625rem, 0.98rem + 0.35vw, 1.25rem)` (17→20px) | 1.5 | −0.008em | 400 | `color: var(--muted)`, `text-wrap: pretty` |
| `t-label` | `0.71875rem` (11.5px) | 1.2 | +0.04em | 400 | Geist Mono, `text-transform: uppercase` |
| `t-mono` | inherits | inherits | inherits | inherits | Geist Mono, `tabular-nums` |

**Arbitrary sizes actually used.** This is the allowed set; nothing else appears.

| Class | Where (examples) |
|---|---|
| `text-[10px]` | `t-label` status pill (LIVE), canvas-overlay badges, workspace dims in mini panel, mini size tags (`t-mono`) |
| `text-[10.5px]` | mono tag chips, size-picker sub-ratio |
| `text-[11px]` | transport timecode, build timer, "2/4 references", ✓/– marker glyph |
| `text-[11.5px]` | **control value readout**, image-control hint, "Copy" pill, share URL, secondary line in list rows, mini-panel body |
| `text-[12px]` | toast, size-picker label, step number (`t-mono`), gallery meta (`t-mono`), quick-reply chip, prompt-card footer |
| `text-[12.5px]` | **control label**, segmented option, chat bubble / chat input, progress rows, Remix pill, drop-zone filename, helper text |
| `text-[13px]` | MotionToggle, hero `dd`, footer ©, control-chip, live caption, gallery footnote |
| `text-[13.5px]` | **text input**, Studio tool name, hero `dt`, footer email, list-row right column, prompt text |
| `text-[14px]` | nav links, "Sign in", nav CTA (`text-[14px]!`), role tabs, skip link, accent text link, facts `dd` |
| `text-[14.5px]` | footer blurb and links, quoted "what they typed" card |
| `text-[15px]` | gallery card title, step body copy, step titles, list-card `h3`, side note |
| `text-[15.5px]` | FAQ answer, list-row left column |
| `text-[16px]` | mobile menu links, big CTA (`text-[16px]!`) |
| `text-[17px] md:text-[18px]` | FAQ question |
| `text-[18px]` | Wordmark text |
| `text-[1.375rem]` | fact value (22px) |
| `text-[1.75rem]` | role title (28px) |

**Tracking used:** `tracking-[-0.005em]` (control label), `tracking-[-0.01em]` (UI titles, `dt`, names), `tracking-[-0.015em]` (FAQ question), `tracking-[-0.03em]` (22–28px titles), `tracking-[-0.035em]` (wordmark). Buttons are −0.01em via `btn`.

**Leading used:** `leading-none` (control label/value), `leading-snug`, `leading-tight`, `leading-[1.1]`, `leading-[1.35]` (input), `leading-[1.45]`, `leading-[1.5]`, `leading-[1.55]` (body), `leading-[1.6]` (FAQ answer).

**Weights used:** default 400 and `font-medium` (27×). `font-semibold` appears once (wordmark). There is no `font-bold`.

### 1.8 Radii used

| Radius | Where |
|---|---|
| `rounded-full` | all buttons, chips, pills, tabs, segmented tracks (choice), toggles, chat input, icon buttons, dots, swatches |
| `rounded-[12px]` | top-level panels: Studio, step-visual cards, list cards, facts grid, gallery card anchor |
| `rounded-[10px]` | inner cards, gallery frame, size-picker track, chat bubbles, share rows, prompt card, quoted input |
| `rounded-[8px]` | text input, drop zone, highlighted-control wrapper, logo focus box, small canvas thumb |
| `rounded-[7px]` | size-picker thumb and labels, export-format rows |
| `rounded-[6px]` | thumbnail wells, reference-image slots, mini text field |
| `rounded-[5px]` | mono tag chip |
| `rounded-[4px]` | Studio top-bar colour chip, mini size tags |
| `rounded-[3px]` | mini-panel colour chip |
| `rounded-[2px]` | ratio glyph, shelf slot |

Named radii (`rounded`, `rounded-md`, `rounded-lg`, …) are **never** used.

### 1.9 Spacing and layout

- Gap scale in use: `gap-0.5 · 1 · 1.5 · 2 · 2.5 · 3 · 4 · 5 · 6 · 7 · 8 · 10 · 12 · 14 · 16`. The most common are 1.5, 2 and 3.
- The container is `wrap`: max 1320px with 20 / 32 (`≥48rem`) / 48 (`≥80rem`) px side padding.
- Section header grid: `grid gap-6 lg:grid-cols-12 lg:items-end` with title `lg:col-span-7` and lead `lg:col-span-5 lg:pb-1`.
- Three-card row: `mt-14 grid gap-x-6 gap-y-14 md:mt-20 lg:grid-cols-3` (`HowItWorks.tsx:29`).
- Studio split: `grid md:grid-cols-[minmax(0,1fr)_248px]` (`ui/Studio.tsx:127`). It splits at **md**, not lg.
- Control stack: `grid grid-cols-2 gap-x-4 gap-y-4 p-4 md:flex md:flex-col md:gap-4`. Within a group: `gap-x-4 gap-y-2 md:gap-1`. Label to control is `mb-1.5` (6px).
- Breakpoints are Tailwind defaults plus `xs` = 30rem. JS desktop means `(min-width: 1024px)` (`ui/motion.ts:125`).

### 1.10 Canvas palette (tool content only, never chrome)

`#0000FF` blue · `#111113` black · `#D6FF3D` lime · `#F2EFE8` paper · `#FF4F2B` vermilion · `#6B6BFF` periwinkle · `#FF8A5C` peach · `#F4E6DA` sand · `#B04CFF` violet · `#1FE0FF` cyan. The kinetic tool swatches are `PAPERS = ["#0000FF","#111113","#F2EFE8","#FF4F2B","#D6FF3D"]` and `INKS = ["#FFFFFF","#111113","#0000FF","#FF4F2B","#D6FF3D"]` (`tools/kinetic.ts:37-38`). The signature pairings are white on blue, lime on black, and black on paper.

---

## 2. Utilities and global classes (`app/globals.css`)

| Name | Kind | Definition (summary) | Use it for |
|---|---|---|---|
| `wrap` | `@utility` :153 | `w-full max-w-[1320px] mx-auto`, padding-inline 20 → 32 (≥48rem) → 48 (≥80rem) | Every page container. Replaces `container mx-auto`. |
| `section-y` | `@utility` :166 | `padding-block: clamp(88px, 6rem + 4vw, 168px)` | Marketing section rhythm only. App screens use 24–48px. |
| `t-display` | `@utility` :170 | see §1.7 | Marketing hero `h1` only |
| `t-h2` | `@utility` :182 | see §1.7 | Section and page titles, big empty-state title |
| `t-h3` | `@utility` :190 | see §1.7 | Card, dialog and panel titles |
| `t-lead` | `@utility` :197 | see §1.7 (already muted) | Intro paragraph under a title. Don't add `text-muted` too. |
| `t-label` | `@utility` :205 | mono 11.5px uppercase +0.04em | Eyebrows, group headers ("Colour"), status ("Building"), dims ("Portrait · 1080 × 1350"), captions. Write the source in sentence case; CSS uppercases it. |
| `t-mono` | `@utility` :213 | mono and tabular-nums | Any number, ratio, timecode, counter, URL, embed code, step number |
| `btn` | `@utility` :222 | inline-flex pill, `h-48px px-22px gap-10px`, 15px/500/−0.01em, nowrap, no-select; `:active` scale .985 (120ms); `.btn-arrow` nudges `translateX(3px)` on hover (240ms) | Base for every button-shaped CTA |
| `btn-primary` | `@utility` :252 | `bg: --accent`, `color: --accent-fg`, hover `--accent-hover` | **The** go action. One per view. |
| `btn-outline` | `@utility` :260 | `1px --border-strong`, `color --fg`, `bg --bg`; hover border `--fg` | Secondary action next to a primary |
| `btn-ink` | `@utility` :269 | `bg --ink`, `color --ink-fg`; hover `--ink-hover` | Solid action inside tools ("Export PNG") |
| `btn-sm` | `@utility` :277 | `h-36px px-14px 13px gap-8px` | Compact buttons in bars and panels |
| `link-draw` | `@utility` :285 | 1px `currentColor` underline that grows 0 → 100% width from the left on hover or focus (240ms) | Footer links, accent text links, mailto |
| `[data-reveal]` + `.reveal-ready` | global :302-312 | Hidden `opacity 0, translateY(14px)` until `[data-revealed]`, 240ms, `--reveal-delay` | Below-the-fold scroll reveal (needs `RevealObserver`) |
| `.enter` | global :322 | `animation: rise-in 240ms var(--ease) both`, `--enter-delay` | Above-the-fold entrance (fade and rise 10px) |
| `.enter-text` | global :335 | `rise-only` (no fade) | The LCP headline and lead, which are painted on the first frame |
| `.live-dot` | global :394 | `live-dot 1.6s ease-in-out infinite` (opacity 1 ↔ .35) | The only "alive/working" indicator (no spinners) |
| `.caret` | global :398 | `caret 1s steps(1) infinite` | Typing caret: `caret ml-px inline-block h-[1.05em] w-px translate-y-[3px] bg-fg` |
| `.range` | global :406-507 | Native range: 24px (40px on coarse pointer) hit area; 4px pill track `--border-strong` filled with `--fg` up to `--pct`; 16px thumb `--surface` + `1.5px --fg` border + `0 1px 2px rgb(0 0 0/.14)`; hover scale 1.12, active 1.22; focus ring `0 0 0 3px surface, 0 0 0 5px focus`; `[data-hint]` sets the thumb border to `--accent-text` with a `pulse-ring 1.8s` | Every slider |
| `.workspace-grid` | global :510 | `--workspace` with a 1px radial dot in `--workspace-dot` every 16px (offset 8px) | Canvas area behind any artboard |
| `.frame-host` | global :519 | `container-type: size; display: grid; place-items: center` | Parent of `.frame` |
| `.frame` | global :525 | `--ar` driven `width: min(100cqw, 100cqh*ar)`, `height: min(100cqh, 100cqw/ar)`, 360ms resize | Artboard that animates between aspect presets |
| `.frame-marks` (+ child `.mark-b`) | global :536-575 | 9×9px L-shaped corner registration marks at −6px, `--muted` at .55 opacity | Artboard corners in the editor. Needs `<span className="mark-b" />` inside for the bottom two. |
| `.mark` / `.wm-link` | global :578-590 | Knob circles transition 240ms; on `.wm-link:hover/focus-visible` knob A moves −5px and knob B +5px | Logo link hover |
| `.concept` / `.concept-stick` | global :593-610 | 340vh scroll-pinned section (desktop, motion OK) | Landing-only |
| `.shelf` / `.slot` | global :613-629 | Container query shelf with equal-height slots of varying `--ar` | Landing-only (row of outputs) |
| `.hit` | global :632-642 | `position: relative`; on `pointer: coarse` an `::after` at `inset: -8px` | Enlarge small targets (32px icon buttons, swatches, toggles) |
| `.no-scrollbar` | global :645 | Hides scrollbars | Horizontal scrollers (tabs, gallery) |
| `.accordion` | global :654-667 | `grid-template-rows: 0fr → 1fr` over 240ms when `[data-open="true"]`; child `overflow: hidden; min-height: 0` | FAQ, collapsible panels |
| reduced-motion block | global :673-682 | Everything goes to 0.01ms, 1 iteration, no smooth scroll | Always copy it |
| `.tabs:not([data-ready]) [aria-selected="true"]` | global :684 | `background: var(--ink)` | No-JS/pre-measure fallback for the sliding-pill tab bar |
| `.bleed-x` | global :689-705 | Full-bleed scroller whose first item lines up with `wrap`, with gutter 20/32/48 | Horizontal carousels |
| `.gallery-frame` | global :707-717 | `height: 300px` (360px ≥48rem), `width: calc(h * var(--ar))` | Gallery tile artboard |

**Keyframes** (`app/globals.css:315-392`): `rise-in` (opacity 0 and 10px up), `rise-only` (10px up), `pulse-ring` (0 → 10px box-shadow in `--accent-text` 45% → 0%), `live-dot`, `caret`, `flash` (opacity .9 → 0), `panel-in` (opacity 0 and 8px up), `toast-in` (opacity 0, 6px up, scale .98).

---

## 3. Component recipes (exact class strings)

### 3.1 Nav bar (`sections/Nav.tsx`)

- **Height:** 64px via `h-(--nav-h)`.
- **Sticky, border on scroll:** A 2px sentinel sits at the top of the page. An `IntersectionObserver` sets `scrolled` when it leaves the viewport. The header border goes `border-transparent` → `border-border` over 240ms. The border is also shown while the mobile menu is open.
- **The theme toggle is not in the nav.** It lives in the footer bottom bar (§3.3).

```tsx
{/* Nav.tsx:43 */}
<div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-2" />

{/* Nav.tsx:44-48 */}
<header className={`sticky top-0 z-50 border-b bg-bg transition-colors duration-[240ms] ease-standard ${
  scrolled || open ? "border-border" : "border-transparent"}`}>

  {/* Nav.tsx:49 */}
  <nav aria-label="Main" className="wrap flex h-(--nav-h) items-center gap-2">
    {/* Nav.tsx:50 — logo */}
    <a href="#top" className="wm-link -ml-1 rounded-[8px] p-1" aria-label="Aiditr, back to top"><Wordmark /></a>

    {/* Nav.tsx:54 */}
    <ul className="ml-6 hidden items-center gap-0.5 md:flex">
      {/* Nav.tsx:59 — ghost nav link */}
      <a className="inline-flex h-9 items-center rounded-full px-3 text-[14px] text-muted transition-colors duration-[180ms] hover:bg-band hover:text-fg">Gallery</a>
    </ul>

    {/* Nav.tsx:67 */}
    <div className="ml-auto flex items-center gap-1.5">
      {/* Nav.tsx:70 — text link, no hover bg */}
      <a className="hidden h-10 items-center rounded-full px-3.5 text-[14px] text-muted transition-colors duration-[180ms] hover:text-fg sm:inline-flex">Sign in</a>
      {/* Nav.tsx:74 — CTA */}
      <a className="btn btn-primary h-10! px-4! text-[14px]!">Start creating</a>
      {/* Nav.tsx:80 — mobile menu toggle (icons size 18) */}
      <button className="-mr-2 grid size-11 place-items-center rounded-full text-fg md:hidden"
        aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} />
    </div>
  </nav>

  {/* Nav.tsx:91-98 — mobile menu */}
  <div id="mobile-menu" hidden={!open} className="border-t border-border md:hidden">
    <ul className="wrap flex flex-col py-2">
      <a className="flex h-12 items-center border-b border-border text-[16px] last:border-0">…</a>
    </ul>
  </div>
</header>
```

Escape closes the menu and returns focus to the toggle (`Nav.tsx:29-39`). Nav links are "Gallery", "How it works", "Use cases", "FAQ"; the mobile menu adds "Sign in".

**Skip link** (`Landing.tsx:16-21`):
```tsx
<a href="#main" className="sr-only z-[60] rounded-full bg-ink px-4 py-2.5 text-[14px] text-ink-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
```

### 3.2 Wordmark / logo (`ui/Wordmark.tsx`)

```tsx
// Wordmark.tsx:2-17 — the mark (colours are hard-coded and never themed)
<svg width={size /*22*/} height={size} viewBox="0 0 22 22" aria-hidden="true" focusable="false" className={`mark shrink-0 ${className}`}>
  <rect width="22" height="22" rx="6" fill="#0000FF" />
  <path d="M5.5 8.25h11M5.5 13.75h11" stroke="#fff" strokeOpacity="0.42" strokeWidth="1.6" strokeLinecap="round" />
  <circle className="mark-knob-a" cx="13.25" cy="8.25" r="2.35" fill="#fff" />
  <circle className="mark-knob-b" cx="8.25" cy="13.75" r="2.35" fill="#fff" />
</svg>

// Wordmark.tsx:22-24
<span className={`group/wm inline-flex items-center gap-2 ${className}`}>
  <Mark />
  <span className="text-[18px] font-semibold leading-none tracking-[-0.035em]">Aiditr</span>
</span>
```

Wrap it in `a.wm-link` to get the knob hover: knob A (top, right) moves −5px and knob B (bottom, left) moves +5px, over 240ms. The favicon (`app/icon.svg`) is the same SVG at 32px. The apple icon is the same tracks and knobs on a full-bleed `#0000FF` square.

### 3.3 Footer (`sections/Footer.tsx`, `sections/FooterMark.tsx`)

```tsx
<footer className="pt-16 md:pt-20">                                                    {/* :17 */}
  <div className="wrap">
    <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between"> {/* :19 */}
      <div>
        <a href="#top" className="wm-link -ml-1 inline-block rounded-[8px] p-1" aria-label="Aiditr, back to top"><Wordmark /></a> {/* :21 */}
        <p className="mt-4 max-w-[22rem] text-[14.5px] leading-snug text-muted">Describe it once. Make it every day. Motion design tools, made from a sentence.</p> {/* :24 */}
      </div>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap gap-x-7 gap-y-3 text-[14.5px]">                   {/* :29 */}
          <li><a className="link-draw inline-block py-1 text-fg pointer-coarse:py-3">Gallery</a></li> {/* :32 */}
        </ul>
        <p className="mt-3 text-[13.5px] text-muted md:text-right">hello@aiditr.com</p> {/* :38 */}
      </nav>
    </div>
    <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"> {/* :42 */}
      <p className="text-[13px] text-muted">© {year} Aiditr</p>                          {/* :43 */}
      <div className="flex items-center gap-2.5"><MotionToggle /><ThemeToggle /></div>   {/* :44-47 */}
    </div>
  </div>
  {/* FooterMark.tsx:29-30 — a live kinetic-type canvas spelling "Aiditr", theme-aware paper/ink */}
  <div className="wrap mt-10" aria-hidden="true"><div className="relative aspect-[5.4/1] w-full">…</div></div>
</footer>
```

The footer links are "Gallery", "Sign in", "Terms", "Privacy" and "Contact".

**Theme toggle** (`ui/prefs.tsx:79-94`). It is a three-way icon radio group with icons at 14px:
```tsx
<div role="radiogroup" aria-label="Theme" className="inline-flex rounded-full border border-border p-0.5">
  <button role="radio" aria-checked={sel} aria-label="Light theme" title="Light theme"
    className={`hit grid size-8 place-items-center rounded-full transition-colors duration-[180ms] ${
      sel ? "bg-band text-fg shadow-[inset_0_0_0_1px_var(--border)]" : "text-muted hover:text-fg"}`}>
    <Sun size={14} />  {/* then <Moon size={14}/> "Dark theme", <Monitor size={14}/> "Match system theme" */}
  </button>
</div>
```

**Motion toggle** (`ui/prefs.tsx:103-114`):
```tsx
<button type="button" aria-pressed={paused}
  className={`inline-flex items-center gap-2 rounded-full border border-border text-[13px] text-fg transition-colors duration-[180ms] hover:border-fg ${
    compact ? "size-11 justify-center" : "h-9 px-3.5"}`}
  aria-label={compact ? (paused ? "Play animations" : "Pause animations") : undefined}>
  {paused ? <Play size={12} /> : <Pause size={12} />}
  {!compact && (paused ? "Play animations" : "Pause animations")}
</button>
```

### 3.4 Section header: eyebrow, headline, lead

**Standard (12-column; title 7, lead 5)**, from `sections/HowItWorks.tsx:13-27`. The same shape appears in UseCases, Gallery and Expectations.
```tsx
<section id="how" aria-labelledby="how-title" className="section-y">
  <div className="wrap">
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <p className="t-label text-muted" data-reveal>02 — How it works</p>
        <h2 id="how-title" className="t-h2 mt-5" data-reveal>Describe. Tune. Ship.</h2>
      </div>
      <p className="t-lead lg:col-span-5 lg:pb-1" data-reveal>A couple of minutes from a sentence to a tool you can use every day. No timeline, no keyframes, no code.</p>
    </div>
```

**Two-line h2** (all section h2s): a plain `<br />` with **no** colour change (`UseCases.tsx:204-208`, `Concept.tsx:164-168`, `Expectations.tsx:36-40`):
```tsx
<h2 className="t-h2 mt-5">Described once.<br />Used every day.</h2>
```

**Two-tone headline** (hero only, `sections/Hero.tsx:13-24`):
```tsx
<p className="enter t-label text-muted" style={d(0)}>Motion design tools, made from a sentence</p>
<h1 id="hero-title" className="t-display mt-5 text-balance">
  <span className="enter-text block" style={d(40)}>Describe it once.</span>
  <span className="enter-text block text-muted" style={d(90)}>Make it every day.</span>
</h1>
<p className="enter-text t-lead mt-6 max-w-[33rem]" style={d(140)}>…</p>
```
(`const d = (ms) => ({ "--enter-delay": `${ms}ms` })`.)

**Sticky side header, 4 / 8 columns** (`sections/Faq.tsx:103-118`):
```tsx
<div className="wrap grid gap-12 lg:grid-cols-12">
  <div className="lg:col-span-4">
    <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)]">
      <p className="t-label text-muted">06 — FAQ</p>
      <h2 className="t-h2 mt-5">Questions, answered.</h2>
      <p className="mt-5 text-[15px] text-muted">Something else? <a className="link-draw text-accent-text">hello@aiditr.com</a></p>
```

**Band section** (alternate background): `section-y border-y border-border bg-band` (`UseCases.tsx:197`, `Expectations.tsx:29`).

**Sub-header inside a panel** (role title): `t-label text-muted` job, then `h3` `mt-3 text-[1.75rem] leading-[1.1] font-medium tracking-[-0.03em]` (`UseCases.tsx:261-262`).

### 3.5 Buttons

| Variant | Exact classes | Source |
|---|---|---|
| Primary + arrow | `btn btn-primary` + `<ArrowRight className="btn-arrow" />` | `Hero.tsx:29-31` |
| Outline | `btn btn-outline` | `Hero.tsx:33` |
| Outline small | `btn btn-outline btn-sm mt-6` ("Replay") | `Concept.tsx:200` |
| Ink small (in tool bar) | `btn btn-ink btn-sm` + `<Download size={14} />` + `<span>Export <span className="hidden sm:inline">PNG</span></span>` | `ui/Studio.tsx:117-122` |
| Nav CTA (40px) | `btn btn-primary h-10! px-4! text-[14px]!` | `Nav.tsx:74` |
| Big CTA on the accent band (56px, inverted) | `btn h-14! bg-white px-7! text-[16px]! text-[#0000FF] hover:bg-white/90` + `btn-arrow`, wrapped in `<Magnetic>` | `FinalCta.tsx:17-25` |
| Ghost (nav) | `inline-flex h-9 items-center rounded-full px-3 text-[14px] text-muted transition-colors duration-[180ms] hover:bg-band hover:text-fg` | `Nav.tsx:59` |
| Text-only ghost | `hidden h-10 items-center rounded-full px-3.5 text-[14px] text-muted transition-colors duration-[180ms] hover:text-fg sm:inline-flex` | `Nav.tsx:70` |
| Accent text link + arrow | `link-draw mr-2 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent-text` + `<ArrowRight size={14} />` | `Gallery.tsx:82-83` |
| Inline body link | `text-accent-text underline underline-offset-3` | `Faq.tsx:80` |

The CTA pair row is `enter mt-8 flex flex-col gap-3 xs:flex-row` (`Hero.tsx:28`). There is **no `btn-ghost` utility**; ghost styling is ad hoc. The accent band section is `bg-accent text-white [--focus:#ffffff]` (`FinalCta.tsx:7`). It overrides `--focus` to white so focus rings stay visible on blue.

**Icon buttons**

| Kind | Exact classes | Source |
|---|---|---|
| 32px bordered, surface (transport play/pause, icons at 13) | `hit grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-fg transition-colors duration-[180ms] hover:border-fg` | `ui/Studio.tsx:162` |
| 44px bordered (carousel arrows, icons at 16) | `grid size-11 place-items-center rounded-full border border-border text-fg transition-colors duration-[180ms] hover:border-fg` | `Gallery.tsx:90, 98` |
| 32px borderless (remove, icon at 14) | `hit grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-workspace hover:text-fg` | `ui/controls.tsx:344` |
| 44px bare (mobile menu, icon at 18) | `-mr-2 grid size-11 place-items-center rounded-full text-fg md:hidden` | `Nav.tsx:80` |

Every icon-only button has an `aria-label` in verb form: "Play preview", "Scroll gallery left", "Remove logo".

### 3.6 Pill chips and tags

| Chip | Exact classes | Source |
|---|---|---|
| **Toggleable control chip** (aria-pressed; pinned = accent) | `h-8 rounded-full border px-3 text-[13px] pointer-coarse:h-11 transition-colors duration-[180ms] ${on ? "border-accent bg-accent text-white" : "border-border bg-surface text-fg hover:border-accent hover:text-accent-text"}` | `UseCases.tsx:287-291` |
| Chip list | `flex flex-wrap gap-1.5` | `UseCases.tsx:274` |
| **Quick-reply chip** (selected = ink) | `rounded-full border px-2.5 py-1 text-[12px] transition-colors duration-[180ms] ${chosen ? "border-fg bg-fg text-bg" : "border-border bg-surface text-muted"}` | `HowItWorks.tsx:162-164` |
| **Stat pill** (with accent dot) | `t-label mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 text-fg` + `<span className="size-1.5 rounded-full bg-accent-text" />` | `UseCases.tsx:303-304` |
| **Mono tag** (selected = fg outline) | `t-mono rounded-[5px] border px-1.5 py-0.5 text-[10.5px] transition-colors duration-[180ms] ${sel ? "border-fg text-fg" : "border-border text-muted"}` | `HowItWorks.tsx:364-366` |
| Mono tag, filled (selected = ink fill) | `t-mono rounded-[4px] px-1 py-0.5 text-[10px] transition-colors duration-[180ms] ${sel ? "bg-fg text-bg" : "text-muted"}` | `Concept.tsx:321-323` |
| **Action pill** (Remix, on card hover goes accent) | `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-medium text-fg transition-colors duration-[180ms] group-hover:border-accent group-hover:bg-accent group-hover:text-white` + `<Remix size={13} />` | `Gallery.tsx:171-173` |
| Copy pill (idle band / done accent) | `inline-flex h-7 min-w-[4.5rem] items-center justify-center gap-1 rounded-full px-2.5 text-[11.5px] font-medium transition-colors duration-[180ms] ${copied ? "bg-accent text-white" : "bg-band text-fg"}`, done shows `<Check size={11} /> Copied` | `HowItWorks.tsx:421-431` |
| Export state pill (ink / accent while exporting) | `ml-auto inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium transition-colors duration-[180ms] ${exporting ? "bg-accent text-white" : "bg-ink text-ink-fg"}` | `Concept.tsx:277-279` |
| Note line with dot | `t-label mt-4 flex items-center gap-2 text-muted` + `<span className="size-1 rounded-full bg-accent-text" aria-hidden="true" />` | `HowItWorks.tsx:82-83` |
| Canvas overlay badge (light) | `t-label pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[10px] text-[#111113] transition-[opacity,transform] duration-[240ms] ease-standard` + `translate-y-0 opacity-100` / `-translate-y-1 opacity-0` | `Gallery.tsx:156-158` |
| Canvas overlay hint (dark) | `t-label pointer-events-none absolute top-3 left-3 rounded-full bg-black/65 px-2.5 py-1.5 text-[10px] text-white` | `UseCases.tsx:330` |

### 3.7 Status / LIVE pill and live caption

```tsx
{/* ui/Studio.tsx:111-114 — in the panel top bar; hidden below xs */}
<span className="t-label hidden h-5 shrink-0 items-center gap-1.5 rounded-full border border-border px-2 text-[10px] text-muted xs:inline-flex">
  <span className="live-dot size-1.5 rounded-full bg-accent-text" />
  Live
</span>

{/* sections/HeroStudio.tsx:61-64 — caption under a live panel */}
<p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
  <span className="live-dot size-1.5 rounded-full bg-accent-text" aria-hidden="true" />
  Live demo. Type your own words, drag a slider, export a PNG.
</p>
```

Status is always a neutral pill with a border, muted mono text and a 6px accent-text dot. There is never a coloured badge background.

### 3.8 Segmented controls (three real variants and one icon variant)

**A. Light thumb (option choice)**, `ui/controls.tsx:211-241`:
```tsx
<fieldset>
  <legend className="text-[12.5px] font-medium leading-none tracking-[-0.005em] text-fg mb-2">Style</legend>
  <div className="relative grid rounded-full border border-border bg-workspace p-[3px]"
       style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
    <span aria-hidden="true"
      className="absolute inset-y-[3px] left-[3px] rounded-full border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-transform duration-[240ms] ease-standard"
      style={{ width: `calc((100% - 6px) / ${n})`, transform: `translateX(${idx * 100}%)` }} />
    <label className="relative z-10 flex h-8 cursor-pointer items-center justify-center rounded-full pointer-coarse:h-11 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid">
      <input type="radio" className="peer sr-only" … />
      <span className="text-[12.5px] text-muted transition-colors duration-[180ms] peer-checked:font-medium peer-checked:text-fg">Stretch</span>
    </label>
  </div>
</fieldset>
```

**B. Ink thumb (strong mode switch; canvas size)**, `ui/Studio.tsx:240-285`. The track is **rectangular** (radius 10), not a pill:
```tsx
<fieldset className="col-span-2">
  <legend className="t-label mb-2 text-muted">Canvas size</legend>
  <div className="relative grid rounded-[10px] border border-border bg-workspace p-[3px]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
    <span aria-hidden="true" className="absolute inset-y-[3px] left-[3px] rounded-[7px] bg-fg transition-transform duration-[240ms] ease-standard"
      style={{ width: `calc((100% - 6px) / ${n})`, transform: `translateX(${idx * 100}%)` }} />
    <label title="Portrait 4:5, 1080 × 1350"
      className={`relative z-10 flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[7px] transition-colors duration-[180ms] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid ${
        tall ? "h-11" : "h-9 pointer-coarse:h-11"} ${active ? "text-bg" : "text-muted hover:text-fg"}`}>
      <input type="radio" className="sr-only" … />
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block rounded-[2px] border-[1.25px] border-current" style={{ width: iw, height: ih }} /> {/* ratio glyph, longest side 12px */}
        <span className="text-[12px] font-medium">{note ?? "4:5"}</span>
      </span>
      {tall && <span className="t-mono text-[10.5px] leading-none opacity-70">4:5</span>}
    </label>
```

**C. Sliding-pill tab bar (ink indicator, JS-measured)**, `sections/UseCases.tsx:217-248`:
```tsx
<div className="no-scrollbar -mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
  <div role="tablist" aria-label="Roles" className="tabs relative inline-flex rounded-full border border-border bg-surface p-1">
    <span aria-hidden="true" className="absolute top-1 bottom-1 left-0 rounded-full bg-ink transition-[transform,width] duration-[240ms] ease-standard" />
    <button role="tab" aria-selected={sel} tabIndex={sel ? 0 : -1}
      className={`relative z-10 h-10 rounded-full px-4 pointer-coarse:h-11 text-[14px] font-medium whitespace-nowrap transition-colors duration-[180ms] sm:px-5 ${
        sel ? "text-ink-fg" : "text-muted hover:text-fg"}`}>Social</button>
```
The indicator's `width` and `translateX` are set from `offsetWidth`/`offsetLeft`, then `data-ready` is set on the list. Until then, the `.tabs:not([data-ready]) [aria-selected="true"]` CSS paints the selected tab. Arrow keys, Home and End move between tabs. The panel re-mounts with `animate-[panel-in_240ms_var(--ease)_both]`.

**D. Icon radio group**: the theme toggle in §3.3.

The ink fill differs by variant. B uses `bg-fg`/`text-bg`; C uses `bg-ink`/`text-ink-fg`. They are the same in dark mode and differ slightly in light (`#1c1d1f` vs `#202124`).

### 3.9 Slider row (`ui/controls.tsx:35-83`)

```tsx
const labelCls = "text-[12.5px] font-medium leading-none tracking-[-0.005em] text-fg";   // :39
const valueCls = "t-mono text-[11.5px] leading-none text-muted";                         // :40

<div>
  <div className="mb-1.5 flex items-baseline justify-between gap-3">                    {/* Row :36 */}
    <label htmlFor={id} className={labelCls}>Speed</label>
    <output htmlFor={id} className={valueCls}>0.9×</output>
  </div>
  <input id={id} type="range" className="range" min max step value
    aria-valuetext="0.9×" data-hint={hint ? "" : undefined}
    style={{ "--pct": `${pct}%` }} />
</div>
```

Value formats (`engine/types.ts:61-62`): `times` → `` `${v.toFixed(1)}×` `` (`1.6×`); `pct` → `` `${Math.round(v*100)}%` `` (`62%`). Pixels are `` `${v}px` `` and counts are `String(v)`.

**Highlighted control wrapper** (every control; rings a control that the adjacent copy points at), `ui/controls.tsx:19-23`:
```tsx
<div data-control={key} className={`-mx-2 rounded-[8px] px-2 py-1.5 transition-[background-color,box-shadow] duration-[240ms] ease-standard ${
  highlighted ? "bg-accent/[0.06] shadow-[0_0_0_1px_var(--accent)] dark:bg-accent/20" : ""}`}>
```

**Static mini-slider** (display only, for illustrations; `HowItWorks.tsx:295-317`): a label row `mb-1.5 flex justify-between text-[11.5px]`, a track `absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-border-strong`, a fill `… h-[3px] … rounded-full bg-fg transition-[width] duration-[900ms] ease-standard`, and a thumb `absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] bg-surface transition-[left,border-color] duration-[900ms] ease-standard ${active ? "border-accent" : "border-fg"}`.

### 3.10 Toggle switch

**Standard** (`ui/controls.tsx:256-275`). It is 38×22, off `--border-strong`, on `--fg`, with a 16px **`bg-surface`** knob:
```tsx
<div className="flex min-h-8 items-center justify-between gap-3">
  <span id={id} className={labelCls}>Invert alternate rows</span>
  <button type="button" role="switch" aria-checked={value} aria-labelledby={id}
    className={`hit relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-[180ms] ease-standard ${value ? "bg-fg" : "bg-border-strong"}`}>
    <span className="absolute top-[3px] left-[3px] size-4 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform duration-[240ms] ease-standard"
      style={{ transform: value ? "translateX(16px)" : "none" }} />
  </button>
</div>
```

**"Go live / publish" toggle** (the only accent toggle; illustration, `HowItWorks.tsx:381-396`). It is 34×20 with a 14px white knob inside a bordered row card:
```tsx
<div className={`mt-auto flex items-center justify-between rounded-[10px] border bg-surface px-3 py-2.5 transition-colors duration-[240ms] ${published ? "border-fg" : "border-border"}`}>
  <div>
    <p className="text-[12.5px] font-medium">Publish to gallery</p>
    <p className="text-[11.5px] text-muted">{published ? "Anyone can find and remix it" : "Private until you publish"}</p>
  </div>
  <span className={`relative h-[20px] w-[34px] rounded-full transition-colors duration-[180ms] ${published ? "bg-accent" : "bg-border-strong"}`}>
    <span className="absolute top-[3px] left-[3px] size-[14px] rounded-full bg-white shadow transition-transform duration-[240ms] ease-standard"
      style={{ transform: published ? "translateX(14px)" : "none" }} />
  </span>
</div>
```

### 3.11 Colour swatches (`ui/controls.tsx:133-196`)

```tsx
const swatchRing =
  "absolute inset-0 rounded-full border border-black/10 transition-[box-shadow,transform] duration-[180ms] ease-standard group-hover:scale-[1.08] peer-checked:shadow-[0_0_0_2px_var(--surface),0_0_0_3.5px_var(--fg)] peer-focus-visible:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--focus)] dark:border-white/15";

// ≤4 options → inline row next to the label; more → label above
<div role="radiogroup" aria-labelledby={labelId} className={inline ? "flex min-h-8 items-center justify-between gap-3" : ""}>
  <span id={labelId} className={`${labelCls} block ${inline ? "" : "mb-2"}`}>Paper</span>
  <div className={`flex flex-wrap items-center ${inline ? "gap-1.5" : "gap-2"}`}>
    <label className={`hit group relative ${inline ? "size-6" : "size-7"} cursor-pointer`} title="electric blue">
      <input type="radio" className="peer sr-only" … />
      <span className={swatchRing} style={{ background: c }} />
      <span className="sr-only">electric blue</span>
    </label>
    {/* last: custom picker */}
    <label className={`hit group relative ${inline ? "size-6" : "size-7"} cursor-pointer`} title="Pick any colour">
      <input type="color" className="peer sr-only" aria-label="Pick any paper colour" … />
      <span className={`absolute inset-0 grid place-items-center rounded-full border transition-[box-shadow,transform] duration-[180ms] ease-standard group-hover:scale-[1.08] peer-focus-visible:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--focus)] ${
        isCustom ? "border-black/10 shadow-[0_0_0_2px_var(--surface),0_0_0_3.5px_var(--fg)] dark:border-white/15"
                 : "border-dashed border-border-strong bg-bg"}`}
        style={isCustom ? { background: value } : undefined}>
        {!isCustom && <Plus size={12} className="text-muted" />}
      </span>
    </label>
```

**Display-only mini swatches** (`Concept.tsx:380-384`, `HowItWorks.tsx:258-263`): `size-3.5` or `size-4 rounded-full border border-black/10 transition-shadow duration-[180ms] dark:border-white/15`, with the selected ring `0 0 0 1.5px var(--surface), 0 0 0 2.75px var(--fg)` inline.

**Paper colour chip** in a panel top bar: `size-3.5 shrink-0 rounded-[4px] border border-black/10 dark:border-white/15` with `style={{ background }}` (`ui/Studio.tsx:107`).

### 3.12 Drop zone (image slot) (`ui/controls.tsx:302-364`)

```tsx
<div className="flex items-center gap-2.5">
  <button type="button"
    className={`group flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[8px] border border-dashed px-2 text-left transition-colors duration-[180ms] ${
      over ? "border-accent bg-accent/5" : "border-border-strong hover:border-fg"}`}>
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-workspace text-muted">
      {value ? <img className="size-full object-contain" /> : <ImageIcon />}
    </span>
    <span className="min-w-0 truncate text-[12.5px] text-fg">{value ? value.name : "Drop or choose an image"}</span>
  </button>
  {value && <button className="hit grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-workspace hover:text-fg" aria-label="Remove logo"><Close size={14} /></button>}
</div>
{hint && <p className="mt-1.5 text-[11.5px] text-muted">{hint}</p>}
```

**Reference-image slots** (a multi-image attach row; `HowItWorks.tsx:123-147`): `grid size-8 place-items-center overflow-hidden rounded-[6px] border transition-all duration-[240ms] ${filled ? "border-transparent" : "border-dashed border-border-strong text-muted"}` with `<ImageIcon size={12} />` when empty. The counter is `t-mono ml-1 text-[11px] text-muted` reading `2/4 references`.

### 3.13 Text input (`ui/controls.tsx:85-131`)

```tsx
const cls = "block w-full rounded-[8px] border border-border bg-bg px-3 text-[13.5px] leading-[1.35] text-fg transition-colors duration-[180ms] placeholder:text-muted hover:border-border-strong focus:border-fg focus:outline-none focus-visible:outline-none";

<div className="mb-1.5 flex items-baseline justify-between gap-3">
  <label htmlFor={id} className={labelCls}>Words</label>
  <span className={valueCls} aria-hidden="true">{value.length}/{maxLength}</span>   {/* 17/22 */}
</div>
<input  className={`${cls} h-9 pointer-coarse:h-11`} spellCheck={false} autoComplete="off" />
<textarea className={`${cls} resize-none py-2`} rows={2} />
```

Focus is shown by the border turning `--fg`. Text fields get no outline ring; this is the **only** place the global focus outline is suppressed.

**Prompt / describe card** (create-flow composer; `HowItWorks.tsx:118-121`):
```tsx
<div className="rounded-[10px] border border-border bg-surface p-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
  <p className="min-h-[4.2em] text-[13.5px] leading-[1.45] text-fg">{typed}<span className="caret ml-px inline-block h-[1.05em] w-px translate-y-[3px] bg-fg" /></p>
```

The larger variant is `relative flex flex-col rounded-[12px] border border-border bg-surface p-4`, with `t-label text-muted` ("You type"), body `mt-3 min-h-[7.5rem] text-[15px] leading-[1.45] tracking-[-0.01em] text-fg`, and footer status `mt-auto flex items-center gap-2 border-t border-border pt-3 text-[12px] text-muted` (`Concept.tsx:240-261`).

The quoted-input display is `rounded-[10px] border border-border bg-surface px-3.5 py-3 text-[14.5px] leading-[1.5] text-fg`, with the content wrapped in curly quotes (`UseCases.tsx:269`).

The read-only mini field is `truncate rounded-[6px] border border-border bg-bg px-2 py-1.5` (`Concept.tsx:303`).

### 3.14 Chat bubbles and chat input (`HowItWorks.tsx:155-290`)

```tsx
{/* AI question line */}
<p className="text-[12.5px] leading-snug text-muted"><span className="font-medium text-fg">Aiditr</span> Should the logo sit bottom-right or top-left?</p>

{/* message stack */}
<div className="flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden">
  <p className={`max-w-[85%] animate-[panel-in_240ms_var(--ease)_both] rounded-[10px] px-2.5 py-1.5 text-[12.5px] leading-snug ${
    who === "you" ? "self-end bg-ink text-ink-fg" : "self-start border border-border bg-surface text-fg"}`}>slower</p>
</div>

{/* input (pill, 36px) */}
<div className="flex h-9 shrink-0 items-center rounded-full border border-border bg-surface px-3 text-[12.5px]">
  <span className="text-muted">Ask for a change…</span>
</div>
```

Quick replies are in §3.6 (they flip to `border-fg bg-fg text-bg` when chosen). AI replies are short past-tense facts: "Done. Speed 1.6× → 0.4×", "Swapped to lime on black".

### 3.15 Progress / status list (`HowItWorks.tsx:172-199`)

```tsx
<div className="mt-auto rounded-[10px] border border-border bg-surface p-3">
  <div className="mb-2 flex items-center justify-between">
    <span className="t-label text-muted">{ready ? "Tool ready" : "Building"}</span>
    <span className="t-mono text-[11px] text-muted">0:42</span>
  </div>
  <ul className="flex flex-col gap-1.5">
    <li className="flex items-center gap-2 text-[12.5px]">
      <span className={`grid size-4 shrink-0 place-items-center rounded-full transition-colors duration-[180ms] ${
        state === "done" ? "bg-accent text-white" : state === "busy" ? "border border-accent-text" : "border border-border-strong"}`}>
        {state === "done" && <Check size={10} />}
        {state === "busy" && <span className="live-dot size-1.5 rounded-full bg-accent-text" />}
      </span>
      <span className={state === "todo" ? "text-muted" : "text-fg"}>Rendering in a real browser</span>
    </li>
```

The inline single-line equivalent (`Concept.tsx:246-260`) shows the done state as `grid size-4 place-items-center rounded-full bg-accent text-white` + `<Check size={10} />` + "Tool ready, checked in a real browser". The busy state is `live-dot size-1.5 rounded-full bg-accent-text` + "Building your tool" + `t-mono ml-auto` "~1–2 min".

**Numbered step list with progress underline** (`Concept.tsx:173-195`):
```tsx
<ol className="mt-10 border-t border-border">
  <li className="relative grid grid-cols-[2rem_1fr] border-b border-border py-4 transition-colors duration-[240ms]">
    <span className={`t-mono pt-0.5 text-[12px] ${current ? "text-accent-text" : "text-muted"}`}>01</span>
    <div>
      <p className={`text-[15px] font-medium tracking-[-0.01em] ${reached ? "text-fg" : "text-muted"}`}>One sentence</p>
      <p className="mt-1 text-[14px] leading-snug text-muted">You describe what you want, once.</p>
    </div>
    <span aria-hidden="true" className="absolute bottom-[-1px] left-0 h-px w-full origin-left bg-fg" style={{ transform: `scaleX(${k})` }} />
  </li>
```

**Vertical timeline** (`UseCases.tsx:264, 349-360`): `relative mt-8 flex flex-col gap-7 border-l border-border pl-6`. Each stop is `li.relative` with a dot `absolute top-[3px] -left-[calc(1.5rem+4.5px)] size-2 rounded-full border-2 border-band bg-fg` and a label `t-label mb-2.5 text-muted`.

### 3.16 Toast (`ui/Studio.tsx:175-181`)

```tsx
<div role="status" aria-live="polite" className="pointer-events-none absolute top-3 right-3">
  {toast && (
    <span className="flex animate-[toast-in_240ms_var(--ease)_both] items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-ink-fg shadow-lg">
      <Check size={13} />
      {toast}
    </span>
  )}
</div>
```

The toast sits at the top-right of the panel workspace and auto-dismisses after `2600` ms. Its copy is "Exported 1080 × 1350 PNG" or "Export didn’t work in this browser".

### 3.17 Panel / Studio frame (`ui/Studio.tsx:99-222`)

```tsx
<div className={`overflow-hidden rounded-[12px] border border-border bg-surface shadow-(--shadow-panel) ${className}`}>   {/* :101 */}

  {/* Top bar, 48px :104 */}
  <div className="flex h-12 items-center gap-3 border-b border-border px-3 sm:px-4">
    <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] border border-black/10 dark:border-white/15" style={{ background: paper }} />
    <span className="truncate text-[13.5px] font-medium tracking-[-0.01em]">{tool.name}</span>
    {/* LIVE pill §3.7 */}
    <div className="ml-auto flex items-center gap-2">{/* btn btn-ink btn-sm Export */}</div>
  </div>

  <div className="grid md:grid-cols-[minmax(0,1fr)_248px]">                                            {/* :127 */}
    {/* Workspace :129 — default height "h-[340px] sm:h-[420px] lg:h-[520px]" */}
    <div className={`workspace-grid relative ${workspaceClass}`}>
      <div className="t-label absolute top-3.5 left-4 flex items-center gap-1.5 text-muted">          {/* :130 */}
        <span>Portrait</span><span aria-hidden="true">·</span><span><TweenNumber value={1080} /> × <TweenNumber value={1350} /></span>
      </div>
      <div className="frame-host absolute inset-x-5 top-10 bottom-14 sm:inset-x-8">                 {/* :138 */}
        <div className="frame frame-marks shadow-[0_1px_2px_rgb(0_0_0/0.08),0_14px_32px_-14px_rgb(0_0_0/0.35)]" style={{ "--ar": w / h }}>
          <canvas className="absolute inset-0 block h-full w-full" role="img" aria-label="…" />      {/* ToolCanvas.tsx:213 */}
          <span className="mark-b" aria-hidden="true" />
        </div>
      </div>

      {/* Transport bar :158 */}
      <div className="absolute inset-x-4 bottom-3 flex items-center gap-3">
        <button className="hit grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-fg transition-colors duration-[180ms] hover:border-fg" aria-label="Pause preview">{/* Pause/Play size 13 */}</button>
        <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
          <span className="absolute inset-0 origin-left bg-fg" style={{ transform: "scaleX(0)" }} />
        </div>
        <span className="t-mono shrink-0 text-[11px] text-muted" aria-hidden="true"><span>0:01.2</span> / 0:04.0</span>
      </div>
      {/* toast §3.16 */}
    </div>

    {/* Controls column :186 */}
    <div className="border-t border-border md:border-t-0 md:border-l">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 md:flex md:flex-col md:gap-4">
        <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 md:flex md:flex-col md:gap-1">   {/* one group */}
          <div className="t-label col-span-2 text-muted">Motion</div>
          <div className={type === "range" ? "col-span-1" : "col-span-2"}><Control … /></div>
        </div>
        {/* SizePicker §3.8B */}
      </div>
    </div>
  </div>
</div>
```

- Timecode format: `` const fmt = (s) => `0:${s.toFixed(1).padStart(4, "0")}` `` (`ui/Studio.tsx:15`).
- Dimension readouts count to the new value (`TweenNumber`, 360ms).
- Control group names used by tools: Text, Motion, Layout, Colour, Brand colours, Image, Effect, Light, Scene, Field, Gradient, Texture, Card, Mark.
- Other workspace heights: `h-[360px] sm:h-[440px] md:h-auto md:min-h-[480px]` (hero) and `h-[340px] sm:h-[420px] md:h-auto md:min-h-[460px]` (use cases).

**Compact panel variant** (`Concept.tsx:267-331`): the top bar is `flex h-10 items-center gap-2 border-b border-border px-3 text-[12.5px]`, the side column is `flex flex-col gap-3 border-l border-border p-3 text-[11.5px]` with `mb-1.5 font-medium` labels, and the dims label is `t-label absolute bottom-2.5 left-3 text-[10px] text-muted` ("1080 × 1350"). The export flash is `absolute inset-0 animate-[flash_420ms_var(--ease)_both] bg-white`.

**Plain cards:**
- Visual card: `relative h-[372px] overflow-hidden rounded-[12px] border border-border bg-band` (`HowItWorks.tsx:76`).
- List card: `rounded-[12px] border border-border bg-surface p-6 md:p-8` (`Expectations.tsx:71`).
- Inner card: `rounded-[10px] border border-border bg-surface p-3` (`HowItWorks.tsx:248, 342`).

### 3.18 Gallery tiles (`sections/Gallery.tsx`)

```tsx
{/* toolbar row :73-102 */}
<div className="mt-10 flex flex-wrap items-center justify-between gap-4">
  <ol className="t-label flex flex-wrap items-center gap-x-3 gap-y-2 text-muted">
    <li>Find something close</li><li aria-hidden="true">→</li><li>Remix</li><li aria-hidden="true">→</li><li className="text-fg">Make it yours</li>
  </ol>
  <div className="flex items-center gap-2">{/* accent link · <MotionToggle compact /> · 44px ‹ › buttons */}</div>
</div>

{/* scroller :106-110 */}
<div className="bleed-x no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:gap-5">

  {/* tile :134-176 */}
  <a href="…" className="group shrink-0 snap-start rounded-[12px] focus-visible:outline-offset-4"
     aria-label="Kinetic type poster, 8 controls. Open the gallery to remix it.">
    <div className="gallery-frame relative overflow-hidden rounded-[10px] border border-border bg-surface" style={{ "--ar": w / h }}>
      <canvas className="absolute inset-0 block h-full w-full" … />
      <span className={`t-label pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[10px] text-[#111113] transition-[opacity,transform] duration-[240ms] ease-standard ${
        remixed ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}>
        <Remix size={11} /> Remixed · Lime and black
      </span>
    </div>
    <div className="mt-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium tracking-[-0.01em]">Kinetic type poster</p>
        <p className="t-mono mt-0.5 text-[12px] text-muted">8 controls · 4:5</p>
      </div>
      <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-medium text-fg transition-colors duration-[180ms] group-hover:border-accent group-hover:bg-accent group-hover:text-white">
        <Remix size={13} /> Remix
      </span>
    </div>
  </a>
</div>
<p className="mt-6 text-[13px] text-muted">Picks from the Aiditr team. Point at one to see it remixed in someone else’s colours.</p>
```

- **Framing:** tiles have a fixed height of 300px (360px from md) and a width equal to height × aspect ratio. There is no cropping, so mixed ratios share a baseline. The frame is `rounded-[10px] border border-border bg-surface`, with no shadow and no hover lift or scale.
- **Hover and focus:** the canvas swaps to remixed params, the overlay badge fades in (opacity plus a 4px drop, 240ms), and the Remix pill turns accent. Mouse enter/leave and focus/blur both trigger it.
- **Performance:** canvases only animate while visible, the page is idle, and playback is allowed (`ToolCanvas.tsx:101-110`). They use `maxDpr={1.5}` and `startAt={index * 1.7}` so tiles don't move in lockstep.
- **Product grid (derived):** keep the tile anatomy exactly. For a wrapping grid use `flex flex-wrap gap-4 md:gap-5` with the same `.gallery-frame`, or use a CSS grid with `aspect-[var(--ar)]` frames inside equal-height rows. Don't crop to squares.

### 3.19 Accordion / FAQ row (`sections/Faq.tsx:121-160`)

```tsx
<ul className="border-t border-border lg:col-span-8">
  <li className="border-b border-border">
    <h3>
      <button id={bid} type="button" aria-expanded={isOpen} aria-controls={pid}
        className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-medium tracking-[-0.015em] md:py-6 md:text-[18px]">
        <span className="transition-colors duration-[180ms] group-hover:text-accent-text">Is Aiditr a video editor?</span>
        <span aria-hidden="true" className={`relative grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-[240ms] ${
          isOpen ? "border-fg bg-fg text-bg" : "border-border text-fg group-hover:border-fg"}`}>
          <span className="absolute h-[1.5px] w-3 rounded-full bg-current" />
          <span className="absolute h-3 w-[1.5px] rounded-full bg-current transition-transform duration-[240ms] ease-standard"
                style={{ transform: isOpen ? "rotate(90deg) scaleY(0)" : "none" }} />
        </span>
      </button>
    </h3>
    <div id={pid} role="region" aria-labelledby={bid} className="accordion" data-open={isOpen} inert={!isOpen}>
      <div><p className="max-w-[46rem] pr-10 pb-6 text-[15.5px] leading-[1.6] text-muted">No. It doesn’t edit your footage…</p></div>
    </div>
  </li>
```

The first item is open by default (`useState(0)`) and only one item is open at a time.

### 3.20 Data rows and definition lists

- **Hero stats `dl`** (`Hero.tsx:38-51`): `mt-12 grid grid-cols-1 border-t border-border xs:grid-cols-3`. Each cell is `py-4 xs:pr-4` plus, for cells after the first, `border-t border-border xs:border-t-0 xs:border-l xs:pl-4`. `dt` is `text-[13.5px] font-medium tracking-[-0.01em] text-fg`; `dd` is `mt-1 text-[13px] leading-snug text-muted`.
- **Hairline grid of facts** (`Expectations.tsx:52-62`): `mt-4 grid gap-px overflow-hidden rounded-[12px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4`, cell `bg-surface p-6`, `dt` `text-[1.375rem] leading-tight font-medium tracking-[-0.03em]`, `dd` `mt-2 text-[14px] leading-snug text-muted`. This is the "gap-px on a border background" trick.
- **Key/value list in a card** (`Expectations.tsx:86-91`): `mt-5 border-t border-border`. Rows are `flex flex-col gap-0.5 border-b border-border py-3.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6`, left `text-[15.5px] tracking-[-0.01em] text-fg`, right `text-[13.5px] text-muted sm:text-right`.
- **Card title with marker** (`Expectations.tsx:75-85`): `flex items-center gap-2.5 text-[15px] font-medium`. The marker is `grid size-5 place-items-center rounded-full text-[11px] ${yes ? "bg-accent text-white" : "border border-border-strong text-muted"}` containing a `✓` or `–` glyph.
- **Selectable list rows** (export format picker; `HowItWorks.tsx:349-357`): `flex items-center justify-between rounded-[7px] px-2 py-1.5 text-[12.5px] transition-colors duration-[180ms] ${sel ? "bg-fg text-bg" : "text-fg"}`, with the name in `font-medium` and the detail `text-[11.5px] ${sel ? "opacity-75" : "text-muted"}`.
- **Share row** (`HowItWorks.tsx:413-433`): `flex h-10 items-center gap-2 rounded-[10px] border bg-surface pr-1.5 pl-3 transition-colors duration-[240ms] ${active ? "border-fg" : "border-border"}`, icon in `text-muted`, value `t-mono min-w-0 flex-1 truncate text-[11.5px] text-fg`, then the copy pill (§3.6).

### 3.21 Empty and placeholder states

The landing has **no dedicated empty-state screen**. These are the placeholder idioms it does use; compose product empty states from them.

| Idiom | Classes | Source |
|---|---|---|
| Dashed slot awaiting output | `frame rounded-[2px] border border-dashed border-border-strong` | `Concept.tsx:345` |
| Dashed thumbnail slot | `rounded-[6px] border border-dashed border-border-strong text-muted` + `<ImageIcon size={12} />` | `HowItWorks.tsx:129-143` |
| Empty drop zone | dashed `border-border-strong`, well `bg-workspace text-muted` + `ImageIcon`, copy "Drop or choose an image" | `controls.tsx:321-334` |
| Custom-colour "+" | `border-dashed border-border-strong bg-bg` + `<Plus size={12} className="text-muted" />` | `controls.tsx:186-190` |
| Todo state | `border border-border-strong` circle, `text-muted` label | `HowItWorks.tsx:189-195` |
| Placeholder text | `text-muted` ("Ask for a change…") | `HowItWorks.tsx:288` |
| Dimmed pending block | `style={{ opacity: 0.35 }}` → `1` | `HowItWorks.tsx:174` |

A *derived* product empty state would be: a `workspace-grid` area or a `rounded-[12px] border border-dashed border-border-strong` box; `t-label text-muted` eyebrow; `t-h3` (or `t-h2` for a full page) single declarative line; a `text-[15px] leading-[1.55] text-muted` sentence; and one `btn btn-primary`.

### 3.22 Auth forms and profile (derived; not in source)

Assemble these only from the parts above:
- Card: `rounded-[12px] border border-border bg-surface p-6 md:p-8`, no shadow.
- Title: `t-h3`. Optional eyebrow: `t-label text-muted`.
- Field: `labelCls` label row plus the `cls` input `h-9 pointer-coarse:h-11`. Use a 16px gap between fields.
- Submit: `btn btn-primary w-full`. Secondary actions: `btn btn-outline` or the text link style from `Nav.tsx:70`.
- Errors (none exist in the source): a `text-[12.5px] text-fg` line with an icon, and the input border set to `border-fg`. Don't use red text or red borders; DESIGN.md says "prefer ink + an icon over colour".
- Profile lists: use the key/value rows from §3.20.

---

## 4. Icon set (`ui/icons.tsx`)

**Conventions** (`icons.tsx:5-23`): `viewBox="0 0 16 16"`, default `size = 16`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.5}`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `aria-hidden="true"`, `focusable="false"`. Colour always comes from `currentColor` (`text-muted` / `text-fg`).

| Name | Path(s) | Notes | Used |
|---|---|---|---|
| `ArrowRight` | `M3 8h10M9 4l4 4-4 4` | Add `className="btn-arrow"` inside `.btn` | CTAs, accent link (14) |
| `ArrowUpRight` | `M5 11l6-6M6 5h5v5` | | unused |
| `Play` | `M5 3.5v9l7-4.5-7-4.5z` | **filled** (`fill="currentColor" stroke="none"`) | transport (13), motion toggle (12) |
| `Pause` | `M5.5 3.5v9M10.5 3.5v9` | **`strokeWidth={2}`** override | transport (13), motion toggle (12) |
| `Download` | `M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10` | | Export button (14), export card (13) |
| `ImageIcon` | `rect 2.5,3 11×10 rx1.5` + `circle 6,6.5 r1` + `M13.5 10.5L10.5 7.5 4 13` | | drop zone (16), ref slots (12) |
| `Check` | `M3.5 8.5l3 3 6-7` | | toast (13), done circle (10), Copied (11) |
| `Plus` | `M8 3v10M3 8h10` | | custom colour (12) |
| `Close` | `M4 4l8 8M12 4l-8 8` | | mobile menu (18), remove (14) |
| `Menu` | `M2.5 5.5h11M2.5 10.5h11` | two lines, not three | mobile menu (18) |
| `ChevronLeft` | `M10 3.5L5.5 8l4.5 4.5` | | carousel (16) |
| `ChevronRight` | `M6 3.5L10.5 8 6 12.5` | | carousel (16) |
| `ChevronDown` | `M3.5 6l4.5 4.5L12.5 6` | | unused (FAQ uses a CSS plus/minus) |
| `Sun` | `circle 8,8 r2.75` + 8 rays | | theme (14) |
| `Moon` | `M13 9.5A5.5 5.5 0 116.5 3a4.5 4.5 0 006.5 6.5z` | | theme (14) |
| `Monitor` | `rect 2,3 12×8 rx1.5` + `M6 14h4M8 11v3` | | theme "system" (14) |
| `LinkIcon` | `M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.5l-1 1a2.8 2.8 0 01-4-4l1-1` | | share row (13) |
| `Code` | `M5.5 5L2.5 8l3 3M10.5 5l3 3-3 3` | | embed row (13) |
| `Remix` | `M2.5 5h7.5a3 3 0 010 6H6M4.5 3L2.5 5l2 2M8 9l-2 2 2 2` | | Remix pill (13), badge (11) |

Rendered sizes range from 10 to 18px. For new icons, use Lucide with `strokeWidth={1.5}` and `absoluteStrokeWidth` off, drawn on a 16-unit grid. Keep round caps and `currentColor`. Don't use filled or duotone icons (Play is the only fill).

**Other glyphs as text:** `·` (separator), `×` (dimensions and multiplier), `→` (step flow, "1.6× → 0.4×"), `✓` / `–` (Expectations markers), `—` (eyebrow numbering), `…`.

---

## 5. Motion

### 5.1 Timing

| Token | Value | Used for |
|---|---|---|
| `--ease` / `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Every CSS transition and keyframe (Tailwind v4's default timing function is the same curve) |
| `--dur-1` | 120ms | `.btn:active` scale(.985), slider thumb scale |
| `--dur-2` / `duration-[180ms]` | 180ms (28 uses) | colour, border and background hovers; swatch ring and scale |
| `--dur-3` / `duration-[240ms]` | 240ms (18 uses) | thumbs and indicators, nav border, arrow nudge, link-draw, accordion, reveal and enter, toast, panel-in, Magnetic |
| – | 360ms | `.frame` width/height between aspect presets; `TweenNumber` count (JS `easeInOutCubic`) |
| – | 420ms | `flash` on export (illustration) |
| – | 900ms | MiniSlider illustration only |
| – | 150ms | Tailwind default where no duration is given (`controls.tsx:344`) |
| loops | 1.6s `live-dot` ease-in-out · 1s `caret` steps(1) · 1.8s `pulse-ring` | |

Movement distances are 3px (arrow), 4px (badge), 6px (toast, chat), 8px (panel-in), 10px (enter) and 14px (reveal). Scales are .985 (press), .98 (toast-in), 1.08 (swatch hover), and 1.12 / 1.22 (slider thumb). Nothing overshoots or springs.

### 5.2 Every animation and where it runs

| Animation | Mechanism | Where |
|---|---|---|
| Hero entrance | `.enter` (fade and 10px rise) / `.enter-text` (rise only, for LCP) with `--enter-delay` 0/40/90/120/140/190/240ms | `Hero.tsx` |
| Scroll reveal | `data-reveal` + `RevealObserver` (rootMargin `0px 0px -8% 0px`; elements already on screen are marked revealed immediately; html gets `.reveal-ready`) with optional `--reveal-delay` 0/60/120ms | all section headers, step cards, lists |
| Nav border | `transition-colors duration-[240ms]` on `border-transparent` ↔ `border-border` | `Nav.tsx:45` |
| Button press / arrow | `btn:active` scale; `.btn-arrow` translateX(3px) | all `.btn` |
| Link underline | `link-draw` | footer, accent links |
| Wordmark knobs | `.wm-link:hover .mark-knob-a/b` ∓5px | nav, footer logo |
| Segmented / tab thumb | `transition-transform duration-[240ms] ease-standard` (+ `width` for tabs) | controls, size picker, tabs |
| Toggle | track colour 180ms, knob translate 240ms | controls |
| Swatch | ring and `group-hover:scale-[1.08]` 180ms | controls |
| Slider | thumb scale; `[data-hint]` `pulse-ring 1.8s` until first interaction | Studio |
| Hero auto-nudge | after 2600ms idle and in view, the `wave` slider sweeps sinusoidally over 2400ms (skipped under reduced motion and once touched) | `HeroStudio.tsx:23-42` |
| Canvas resize | `.frame` 360ms | Studio, Concept |
| Dimension readout | `TweenNumber` 360ms (instant under reduced motion) | Studio dims label |
| Toast | `animate-[toast-in_240ms_var(--ease)_both]`, 2600ms dismiss | Studio |
| Tab panel / chat message | `animate-[panel-in_240ms_var(--ease)_both]` | UseCases panel, chat bubbles |
| Export flash | `animate-[flash_420ms_var(--ease)_both] bg-white` | Concept |
| Live indicator | `.live-dot` | LIVE pill, live caption, busy step, "Building your tool" |
| Typing caret | `.caret` | prompt cards, chat input |
| Accordion | `.accordion` grid-rows 240ms; plus → minus via `rotate(90deg) scaleY(0)` 240ms | FAQ |
| Gallery hover | canvas params swap; badge opacity and translate 240ms; Remix pill to accent 180ms | Gallery |
| Carousel paging | `scrollBy({ behavior: reduce ? "auto" : "smooth" })` by 80% width | Gallery |
| Magnetic | child translates toward the pointer (`strength 0.22`), `transition-transform duration-[240ms] ease-standard will-change-transform`, hit area `md:-m-6 md:p-6`; mouse only, off under reduced motion | **FinalCta** button |
| Scroll-pinned story | `.concept` 340vh plus sticky `.concept-stick` (desktop and motion allowed); timed 11s on mobile with a "Replay" button; static final frame under reduced motion | Concept |
| Illustration loops | `useLoopClock(active, period, still)` at 12s / 10s / 11s, ticking at 60ms, frozen to `still` when reduced or paused | HowItWorks visuals |
| Live canvases | `ToolCanvas` runs only when visible (IO rootMargin 100px), the page is idle, and `playing` is true | everywhere |

### 5.3 Reduced motion

- CSS (`app/globals.css:673-682`): 
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
  Smooth scroll and the `.concept` pin only apply under `no-preference`.
- JS: `useReducedMotion()` (`ui/motion.ts:17-22`) uses `useSyncExternalStore` on `(prefers-reduced-motion: reduce)` with server snapshot `false`.
- `usePlayback()` defaults to paused when reduced. `useLoopClock` returns the finished still frame. `Magnetic`, `TweenNumber` and the Gallery scroll check the media query directly. Concept switches to `"static"` mode.

### 5.4 `aiditr-motion`: the global pause switch (WCAG 2.2.2) (`ui/motion.ts:28-80`)

- **localStorage key:** `aiditr-motion`. **Value:** `"paused"` when paused. The key is **removed** (not set to `"playing"`) when unpaused.
- It is a module-level store with `useSyncExternalStore` (server snapshot `{ paused: false, version: 0 }`). `setMotionPaused(paused)` bumps `version`, persists the value, and notifies listeners.
- `usePlayback()` computes `playing = local && local.version === global.version ? local.value : !global.paused && !reduced`. A per-canvas play/pause wins until the global switch flips again.
- UI: `MotionToggle` ("Pause animations" / "Play animations") in the footer, and the compact 44px version in the Gallery toolbar.

### 5.5 `aiditr-theme`: theme persistence

- **Boot script** (`app/layout.tsx:39`), injected inline in `<head>` so it runs before paint:
  ```js
  (function(){try{var d=document.documentElement;d.classList.add('js');var t=localStorage.getItem('aiditr-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.setAttribute('data-theme',t)}catch(e){}})()
  ```
  `<html>` has `suppressHydrationWarning`. The script also adds a `js` class, which no CSS uses.
- **localStorage key:** `aiditr-theme`, with values `"light"` or `"dark"`. "System" is expressed by **removing** the key (`ui/prefs.tsx:30-37`).
- `data-theme="light|dark"` is always written to `<html>`. While the preference is "system", `ThemeToggle` listens to `matchMedia` changes and re-applies.
- `useTheme()` observes the `data-theme` attribute with a MutationObserver. It is used to feed canvas paper and ink (`FooterMark.tsx:22-23` uses `#0C0C0D`/`#EDEDEE` in dark and `#FFFFFF`/`#1C1D1F` in light).

---

## 6. Copy voice

**Rules (as practised in the source)**
1. Write short declarative sentences with a full stop, even in headlines ("Describe. Tune. Ship.", "Questions, answered.").
2. Use sentence case everywhere: headlines, buttons, labels, tabs. `t-label` uppercases via CSS, so write the source as "Canvas size", not "CANVAS SIZE".
3. Buttons are verbs, and short: "Start creating", "Export PNG", "Remix", "Replay", "Copy".
4. Status copy is factual and in the past tense when finished ("Exported 1080 × 1350 PNG", "Blank frame caught and repaired", "Swapped to lime on black"). Use the present participle while working ("Building", "Exporting", "Planning the tool").
5. Say plainly what it doesn't do ("Not a video editor", "It makes graphics, not edits", "Honest about the rest.").
6. Prefer specific numbers to adjectives: "3–6s loops", "10 creations a day", "~1–2 min", "1080 × 1350".
7. Typography in copy:
   - `×` with spaces for dimensions (`1080 × 1350`) and without for multipliers (`1.6×`).
   - En dash for ranges (`3–6`), em dash with spaces for eyebrow numbering (`02 — How it works`).
   - `·` as a separator.
   - `→` for flows.
   - `…` for ellipses.
   - Curly quotes and apostrophes (`“ ”`, `didn’t`).
8. Use British spelling: colour, colours. Code identifiers stay `color`, but visible strings never do.
9. No exclamation marks, no emoji, no "click here", no marketing superlatives.
10. Eyebrows are either a numbered section (`01 — The idea`) or a sentence-case descriptive phrase with no full stop ("Motion design tools, made from a sentence").
11. Accessible labels are full phrases: "Aiditr, back to top", "Scroll gallery left", "Match system theme", "Pause preview".

**Real strings from the site**

| Kind | String | Source |
|---|---|---|
| Primary button | Start creating | `Hero.tsx:30`, `Nav.tsx:75` |
| Secondary button | Browse the gallery | `Hero.tsx:34` |
| Tool button | Export PNG | `Studio.tsx:120` |
| Toggle button | Pause animations / Play animations | `prefs.tsx:113` |
| Eyebrow | 02 — How it works | `HowItWorks.tsx:18` |
| Eyebrow | Motion design tools, made from a sentence | `Hero.tsx:14` |
| Headline | Describe it once. / Make it every day. | `Hero.tsx:18-21` |
| Headline | Good at one thing. / Honest about the rest. | `Expectations.tsx:37-39` |
| Status pill | Live | `Studio.tsx:113` |
| Status header | Building → Tool ready | `HowItWorks.tsx:177` |
| Progress rows | Planning the tool · Writing it · Rendering in a real browser · Blank frame caught and repaired | `HowItWorks.tsx:99-104` |
| Toast | Exported 1080 × 1350 PNG / Export didn’t work in this browser | `Studio.tsx:86` |
| AI reply | Done. Speed 1.6× → 0.4× | `HowItWorks.tsx:237` |
| Placeholder | Ask for a change… | `HowItWorks.tsx:288` |
| Empty drop zone | Drop or choose an image | `controls.tsx:334` |
| Dimension label | Portrait · 1080 × 1350 | `Studio.tsx:130-135` |
| Gallery meta | 8 controls · 4:5 | `Gallery.tsx:168` |
| Overlay badge | Remixed · Lime and black | `Gallery.tsx:161` |
| Publish state | Private until you publish / Anyone can find and remix it | `HowItWorks.tsx:388` |
| Helper | Tap or point at one to find it in the tool. | `UseCases.tsx:299` |
| Meta line | Free in beta · 10 creations a day | `FinalCta.tsx:14` |
| Live caption | Live demo. Type your own words, drag a slider, export a PNG. | `HeroStudio.tsx:63` |
| Counter | 2/4 references · Directions explored: 3 | `HowItWorks.tsx:147`, `UseCases.tsx:338` |

---

## 7. Do / Don't: lint checklist

Each rule has an ID, a detection hint (a regex over `className` strings and JSX text unless stated), and the **only** allowed exceptions (the ones present in the source). Inside these tables, `\|` is an escaped pipe for Markdown; use a plain `|` in the real regex. Apply class regexes per whitespace-separated class token, after stripping variant prefixes (`hover:`, `md:`, `dark:`, `group-hover:`, …), so that compound classes like `transition-shadow` don't trip the `shadow` rules.

### Typography
| ID | Rule | Detect | Allowed exceptions |
|---|---|---|---|
| T1 | Only weights 400 and 500 | `\bfont-(thin\|extralight\|light\|semibold\|bold\|extrabold\|black)\b` | Wordmark text `font-semibold` only |
| T2 | No Tailwind named text sizes | `\btext-(xs\|sm\|base\|lg\|xl\|[2-9]xl)\b` | none |
| T3 | Arbitrary sizes come from the allowed set | `text-\[(?!(10\|10\.5\|11\|11\.5\|12\|12\.5\|13\|13\.5\|14\|14\.5\|15\|15\.5\|16\|17\|18)px\]\|1\.375rem\]\|1\.75rem\])` | `t-display` / `t-h2` / `t-h3` / `t-lead` / `t-label` utilities |
| T4 | No `uppercase` class; uppercase only via `t-label` | `\buppercase\b`, or JSX text in ALL CAPS with 3+ letters | acronyms (PNG, HD, FAQ, ZIP, WebM) |
| T5 | No positive tracking except `t-label` | `\btracking-(wide\|wider\|widest)\b\|tracking-\[0?\.\d` | none |
| T6 | Headings use `t-h2` / `t-h3` / `t-display`, or 500 plus negative tracking | an `h1–h3` without `t-` utility or `font-medium` | – |
| T7 | No serif or italic in UI | `\b(font-serif\|italic)\b` | none (Instrument Serif is canvas-only) |
| T8 | Numbers, dimensions, ratios, timecodes, counters and URLs are mono | JSX text matching `\d+\s*[×x]\s*\d+\|\d+:\d+\|\d+(\.\d+)?×\|\d+/\d+\|\d+%` not inside `t-mono`, `t-label` or `tabular-nums` | prose sentences ("3–6 second loop", "10 creations a day") |
| T9 | `t-lead` is not combined with a text colour | `t-lead[^"]*\btext-(muted\|fg)` | none |
| T10 | Don't mix fonts | `font-(sans\|mono)` on elements that use `t-mono` / `t-label` | none |

### Colour
| ID | Rule | Detect | Allowed exceptions |
|---|---|---|---|
| C1 | No Tailwind palette colours | `\b(bg\|text\|border\|ring\|outline\|fill\|stroke\|from\|via\|to\|divide\|placeholder\|decoration\|shadow\|accent\|caret)-(slate\|gray\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose)-\d{2,3}\b` | none |
| C2 | No raw hex in classes | `\[#[0-9a-fA-F]{3,8}\]` | `text-[#0000FF]` (inverted CTA on accent band), `text-[#111113]` (canvas overlay badge), `[--focus:#ffffff]` (accent band) |
| C3 | `white` / `black` only in whitelisted spots | `\b(bg\|text\|border)-(white\|black)\b` | `border-black/10` + `dark:border-white/15` (swatch and chip edges); `text-white` only with `bg-accent`, `group-hover:bg-accent` or on the accent band; `bg-white` for the inverted CTA, the `flash` overlay, and the publish-toggle knob; `bg-white/90` and `bg-black/65` for **canvas overlays**; `text-white/80` on the accent band |
| C4 | Accent as text uses `text-accent-text`, never `text-accent` | `\btext-accent\b(?!-)` | none |
| C5 | Dots and thin rings use `accent-text` | `bg-accent` on a `size-1`/`size-1.5` element | none |
| C6 | Accent fill means go / live / done only | `bg-accent` on anything that is not: primary CTA, done-check, Copied, Exporting, pinned highlight chip, publish-on toggle, Remix hover, accent band | those listed |
| C7 | **Selection is ink, not blue** | `(aria-selected\|aria-checked\|aria-current\|peer-checked\|data-\[state=(on\|active\|checked)\])[^"]*\b(bg\|border\|text)-accent` | pinned "find it in the tool" chip (`UseCases.tsx:289`) |
| C8 | At most one `btn-primary` per view | count `btn-primary` per screen > 1 | the nav CTA repeating the page CTA |
| C9 | No gradients in chrome | `\b(bg-gradient-to\|bg-linear\|bg-radial\|bg-conic)-\|\b(from\|via\|to)-[a-z]` and `linear-gradient\|radial-gradient` in `style=` | canvas content and thumbnails, `link-draw`, `.range`, `.workspace-grid` |
| C10 | No coloured status badges (success / error / warning) | `(bg\|text\|border)-(red\|green\|emerald\|amber\|yellow\|orange)` or a hex in status components | none: status is a neutral pill, an accent-text dot, or an ink toast with `Check` |
| C11 | `dark:` is only used for the swatch edge and accent tint | `\bdark:(?!border-white/15\|bg-accent/20)` | none (tokens already flip) |
| C12 | Secondary text uses `text-muted`, not opacity | `\btext-fg/\d\|\bopacity-\d+` on text | `opacity-70` (size-picker sub-ratio on ink), `opacity-75` (detail on `bg-fg` row) |
| C13 | Surfaces use tokens | `bg-(white\|black\|gray)` for panels | see C3 |
| C14 | Accent tints are only these | `bg-accent/` other than `bg-accent/[0.06]`, `dark:bg-accent/20`, `bg-accent/5` | none |

### Shape and borders
| ID | Rule | Detect | Allowed exceptions |
|---|---|---|---|
| S1 | No named radii | `\brounded(-(t\|b\|l\|r\|tl\|tr\|bl\|br\|s\|e))?(-(xs\|sm\|md\|lg\|xl\|2xl\|3xl\|4xl\|none))?\b(?![-\[])` excluding `rounded-full` | none |
| S2 | Arbitrary radii come from `{2,3,4,5,6,7,8,10,12}px` | `rounded-\[(?!(2\|3\|4\|5\|6\|7\|8\|10\|12)px\])` | none |
| S3 | Buttons, chips, pills, tabs, toggles, chat inputs and icon buttons are `rounded-full` | `<button>` or `.btn` without `rounded-full` or `btn` | size-picker options (`rounded-[7px]`), drop zone (`rounded-[8px]`), FAQ row, list rows, mobile menu links |
| S4 | Borders are 1px `border-border`; hover/active → `border-fg`; dashed → `border-border-strong` | `border-(2\|4\|8)\b` | `border-2 border-band` timeline dot; `border-[1.5px]` MiniSlider thumb; `border-[1.25px]` ratio glyph |
| S5 | Don't use `divide-*`; use explicit rows `border-b border-border last:border-0` | `\bdivide-` | none |

### Elevation and focus
| ID | Rule | Detect | Allowed exceptions |
|---|---|---|---|
| E1 | No named shadows | token `^shadow(-(2xs\|xs\|sm\|md\|lg\|xl\|2xl\|inner))?$` (not `transition-shadow`) | **known source exceptions**: toast `shadow-lg` (`Studio.tsx:177`) and publish knob `shadow` (`HowItWorks.tsx:392`) |
| E2 | Arbitrary shadows are only: panel, canvas frame, micro-knob, ring | `shadow-\[` not matching `0_1px_2px_rgb\(0_0_0/0\.0[4-8]\)\|0_1px_2px_rgb\(0_0_0/0\.2\)\|0_1px_2px_rgb\(0_0_0/0\.08\),0_1[04]px_\d+px_-1[24]px_rgb\(0_0_0/0\.35\)\|0_0_0_[\d.]+px_var\(--(surface\|fg\|focus\|accent)\)\|inset_0_0_0_1px_var\(--border\)` | `shadow-(--shadow-panel)` on top-level tool panels only |
| E3 | Cards have a border and no shadow | a `rounded-[10px\|12px]` card with both `border` and a non-panel shadow | the Studio panel and the mini tool panel |
| E4 | No `ring-*` utilities; focus comes from the global `:focus-visible` outline | `\bring(-offset)?-` | none |
| E5 | Don't remove outlines except on text fields | `outline-none` without `focus:border-fg` | `.range` (thumb ring) |
| E6 | Focus inside custom radios uses `has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-(--focus) has-[:focus-visible]:outline-solid` | missing on label-wrapped `sr-only` radios | swatches use `peer-focus-visible:shadow-[…var(--focus)]` |
| E7 | Coloured bands override `--focus` | `bg-accent` sections without `[--focus:#ffffff]` | none |

### Motion
| ID | Rule | Detect | Allowed exceptions |
|---|---|---|---|
| M1 | Durations are 120 / 180 / 240 / 360 ms | `\bduration-(75\|100\|150\|200\|300\|500\|700\|1000)\b\|duration-\[(?!(120\|180\|240\|360)ms\])` | `420ms` flash, `900ms` illustration slider |
| M2 | Easing is `ease-standard` / `var(--ease)` | `\bease-(in\|out\|in-out\|linear)\b` | `.live-dot` (ease-in-out), `.caret` (steps) |
| M3 | No Tailwind stock animations | `\banimate-(spin\|ping\|pulse\|bounce)\b` | none: "working" is `.live-dot` |
| M4 | Custom animations reference the declared keyframes | `animate-\[(?!(toast-in\|panel-in\|flash\|rise-in\|rise-only\|pulse-ring\|live-dot\|caret)_)` | none |
| M5 | No hover scale or lift on buttons or cards | `hover:(scale\|-?translate-y)-` / `group-hover:scale-` other than `group-hover:scale-[1.08]` on swatches | none |
| M6 | Moves are ≤ 14px | `translate-y-(4\|5\|6\|8\|10\|12\|16)` or `translate3d` > 14px in styles | none |
| M7 | `transition-all` is discouraged; name the properties | `\btransition-all\b` | `HowItWorks.tsx:129` (known) |
| M8 | Live canvases and loops obey `usePlayback()` / `useLoopClock()` | an animation loop not gated by reduced motion **and** `aiditr-motion` | none |
| M9 | Copy the reduced-motion CSS block verbatim | missing `@media (prefers-reduced-motion: reduce)` global | none |

### Layout and components
| ID | Rule | Detect | Allowed exceptions |
|---|---|---|---|
| L1 | The container is `wrap` | `\bcontainer\b\|max-w-(screen-\w+\|[4-7]xl)\b` on page shells | none |
| L2 | Button height overrides only via `btn-sm`, `h-10!` or `h-14!` | `\bbtn\b` with `h-(?!10!\|14!)` | none |
| L3 | Primary CTAs with a trailing arrow use `<ArrowRight className="btn-arrow" />` | `ArrowRight` inside `.btn` without `btn-arrow` | none |
| L4 | Labels above controls: `text-[12.5px] font-medium leading-none tracking-[-0.005em] text-fg`; readout `t-mono text-[11.5px] leading-none text-muted` | control label using other sizes | none |
| L5 | Group headings in panels are `t-label text-muted` | panel group headings using bold or sentence text | none |
| L6 | Touch targets: `pointer-coarse:h-11` or `.hit` on anything under 44px | interactive `size-8` / `h-8` / `h-9` without `.hit` or `pointer-coarse:` | none |
| L7 | Toggles are `role="switch"` with `aria-checked`; swatches and segments are radiogroups; toasts are `role="status" aria-live="polite"` | ARIA missing | none |
| L8 | Icons are 16-grid, 1.5 stroke, round, `currentColor`, 10–18px, `aria-hidden` | lucide `strokeWidth` ≠ 1.5, `fill=` other than Play, emoji in UI | Pause `strokeWidth={2}` |
| L9 | Don't use loading spinners or skeleton shimmer | `animate-spin`, `skeleton`, shimmer gradients | none: use `live-dot` plus a `t-label` status |

### Copy
| ID | Rule | Detect | Allowed exceptions |
|---|---|---|---|
| V1 | Use `×` for dimensions | `\d\s*[xX*]\s*\d` in JSX text | none |
| V2 | Use a real ellipsis | `\.\.\.` in JSX text | none |
| V3 | Use curly quotes and apostrophes | `[A-Za-z]'[a-z]\|"[^"{}]+"` in JSX text | canvas default text (e.g. "We're hiring" in `Concept.tsx:35`) |
| V4 | No exclamation marks | `[A-Za-z]!` in JSX text | none |
| V5 | British spelling in visible text | `\b(color\|colors\|colored\|favorite\|customize\|organize\|center)\b` in JSX text or aria-labels | none |
| V6 | Sentence case on buttons and headings | two or more consecutive Capitalised words that are not proper nouns | "Aiditr", product names |
| V7 | En dash for ranges | `\d-\d` in JSX text (`3-6`) | code and URLs |

---

## 8. Divergences: DESIGN.md vs code (code wins)

| # | DESIGN.md says | Code actually does | Where |
|---|---|---|---|
| 1 | "Weights: **400 and 500 only.** No bold." | The wordmark text is `font-semibold` (600) | `ui/Wordmark.tsx:24` |
| 2 | "**Magnetic** pull on the single **hero** CTA only" | `Magnetic` wraps the **FinalCta** button; the hero CTA is not magnetic | `sections/FinalCta.tsx:17`, `Hero.tsx:29` |
| 3 | Logo: "On hover the knobs slide **apart** 5px" | Knob A (top, at x 13.25) moves **−5px** and knob B (bottom, at x 8.25) moves **+5px**, so they move toward each other and swap sides | `globals.css:582-590`, `Wordmark.tsx:14-15` |
| 4 | Toggle: "16px **white** knob" | The knob is `bg-surface` (`#141416` in dark) with `shadow-[0_1px_2px_rgb(0_0_0/0.2)]`. Only the illustrative publish toggle uses `bg-white shadow`, and it is **34×20 / 14px**, not 38×22 | `controls.tsx:271`, `HowItWorks.tsx:390-392` |
| 5 | "Only the main working panel and the canvas get lift" | The toast has `shadow-lg`; the prompt card has `shadow-[0_1px_2px_rgb(0_0_0/0.04)]`; the illustration canvas thumbs and shelf outputs have shadows | `Studio.tsx:177`, `HowItWorks.tsx:118, 245`, `Concept.tsx:350` |
| 6 | "Two-tone headlines: second line in `--muted`" (general rule) | Only the **hero h1** is two-tone. Every section h2 is single-colour with a `<br />` | `Hero.tsx:20` vs `UseCases.tsx:205`, `Concept.tsx:165`, `Expectations.tsx:37` |
| 7 | "Ink for selection … Blue = go / alive" | The pinned control chip uses `border-accent bg-accent text-white` (aria-pressed selection), its hover uses `hover:border-accent hover:text-accent-text`, and the current step number is `text-accent-text` | `UseCases.tsx:289-290`, `Concept.tsx:179` |
| 8 | "Accent as text/dot/**border** on the page → `--accent-text`" | Standalone accent borders mostly use `border-accent` (chip hover, drop-zone drag-over, MiniSlider active, Remix hover). Only the busy step ring uses `border-accent-text` | `UseCases.tsx:290`, `controls.tsx:322`, `HowItWorks.tsx:310`, `Gallery.tsx:171` vs `HowItWorks.tsx:189` |
| 9 | "One per view" for primary | The nav "Start creating" and hero "Start creating" are both `btn-primary` in the first viewport (same action) | `Nav.tsx:74`, `Hero.tsx:29` |
| 10 | Segmented control "Track: pill" (both styles) | The ink-thumb canvas-size picker has a **rectangular** track `rounded-[10px]` and thumb `rounded-[7px]`. A third variant (JS-measured `bg-ink` tab pill on a `bg-surface` track, `p-1`) is undocumented | `Studio.tsx:243-248`, `UseCases.tsx:223-228` |
| 11 | Ink thumb is "`--fg` fill, text `--bg`" | True for the size picker; tabs use `bg-ink`/`text-ink-fg` instead (the two differ slightly in light mode) | `Studio.tsx:248` vs `UseCases.tsx:228` |
| 12 | Buttons list a "**Ghost / nav**" variant | There is no `btn-ghost` utility; ghost links are ad hoc class strings | `Nav.tsx:59, 70` |
| 13 | "Icon button: 32px circle, 1px border, `--surface`" | Only the transport button matches. The carousel and compact motion toggle are **44px** without `bg-surface`; the image-remove button is 32px **borderless** with `hover:bg-workspace` | `Studio.tsx:162`, `Gallery.tsx:90`, `prefs.tsx:108`, `controls.tsx:344` |
| 14 | Icons "1.5px stroke … no fill (except Play)" | `Pause` overrides `strokeWidth={2}` | `icons.tsx:45` |
| 15 | Icons "Rendered at 12–18px" | They are also rendered at 10 (`Check` in done circles) and 11 (`Check` in Copied, `Remix` badge) | `HowItWorks.tsx:192, 427`, `Gallery.tsx:160` |
| 16 | Radius tokens `--radius-panel` / `--radius-card` | Declared but **never referenced**; the code hardcodes `rounded-[12px]` / `rounded-[10px]` | `globals.css:37-38` |
| 17 | Motion tokens `--dur-1/2/3` | Used only inside `globals.css`; TSX hardcodes `duration-[180ms]` / `[240ms]`. `--dur-1` (120ms) never appears in TSX | – |
| 18 | "One easing curve" | `TweenNumber` uses JS `easeInOutCubic`; `.live-dot` uses `ease-in-out`; `.caret` uses `steps(1)`. There are also 420ms and 900ms durations, and a 150ms default where the duration is omitted | `TweenNumber.tsx:25`, `globals.css:395-399`, `Concept.tsx:292`, `HowItWorks.tsx:305`, `controls.tsx:344` |
| 19 | Tokens mapped so classes read `bg-accent`, `text-ink-fg`, … | `text-accent-fg`, `bg-accent-hover` and `bg-ink-hover` exist but are **never used**; text on accent is hard-coded `text-white` (10×). `--focus`, `--workspace-dot` and `--shadow-panel` are **not mapped** | `globals.css:92-112` |
| 20 | Dark fallback for no-JS | The `prefers-color-scheme` fallback block **omits `--shadow-panel`**, so no-JS dark visitors get the light panel shadow | `globals.css:71-90` |
| 21 | "Swatch/thumbnail edges: `border-black/10` light, `border-white/15` dark" | The mini-panel paper chip has `border-black/10` **without** `dark:border-white/15` | `Concept.tsx:272` |
| 22 | "No other UI colours" | Canvas overlays use `bg-white/90 text-[#111113]` and `bg-black/65 text-white`; the final CTA uses `bg-white text-[#0000FF]` | `Gallery.tsx:156`, `UseCases.tsx:330`, `FinalCta.tsx:20` |
| 23 | "Desktop behaviour switches at `lg`" | The Studio's workspace/controls split (248px column) switches at **md**; the section grids switch at lg | `Studio.tsx:127` |
| 24 | Colour swatches "Circles 24–28px" | Plus display-only 14px/16px swatches with a thinner ring `0 0 0 1.5px surface, 0 0 0 2.75px fg` | `Concept.tsx:380-383`, `HowItWorks.tsx:258-262` |
| 25 | Theming section: the boot script sets `data-theme` | It also adds a `js` class to `<html>`, which no CSS uses (reveal uses `.reveal-ready`) | `layout.tsx:39` |
| 26 | "Reuse `features/landing/ui/{controls,icons,Wordmark,motion,sizes}.tsx`" | `motion` and `sizes` are `.ts` | – |
| 27 | Iconography (implied: use the icon set) | The Expectations markers use literal text glyphs `✓` / `–` rather than `Check`; the FAQ uses a CSS plus/minus rather than `Plus` / `ChevronDown` (`ArrowUpRight` and `ChevronDown` are unused) | `Expectations.tsx:82`, `Faq.tsx:144-147` |
| 28 | Theme toggle location (unstated) | The theme toggle is **only in the footer**, not in the nav | `Footer.tsx:44-47` |
| 29 | Chat "Quick replies as **outline** pills" | They are filled `bg-surface` pills with a border and `text-muted`, which flip to `border-fg bg-fg text-bg` | `HowItWorks.tsx:162-164` |

Everything else in DESIGN.md checks out against the code: all token hex values, type-scale clamps, the `wrap` / `section-y` values, the nav at 64px with border on scroll, button sizes (48 / 36 / 40 / 56), the input spec (36/44px, radius 8, focus `border-fg`), the slider spec, the drop-zone spec, the Studio anatomy (48px bar, 248px column, dot grid, reg marks, transport format), toast timing (240ms in, 2.6s out), the progress-list states, the `aiditr-motion` and `aiditr-theme` keys, and the focus outline (2px / 3px offset / 6px radius).
