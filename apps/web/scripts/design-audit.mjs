#!/usr/bin/env node
/**
 * design-audit — checks the web app against the Aiditr design language.
 *
 * The landing page (aiditr-landing) is the reference; its rules are written
 * up in md/design-language.md. This script turns the hard ones into checks
 * so the product can't drift: weights 400/500 only, tokens instead of raw
 * colours, pills for solid buttons, ink (not blue) for selection, one
 * easing curve, no gradients or glass in the chrome, mono uppercase labels.
 *
 *   pnpm --filter web design:audit            # report, exit 1 on errors
 *   pnpm --filter web design:audit --strict   # warnings fail too
 *   pnpm --filter web design:audit --json     # machine-readable
 *   pnpm --filter web design:audit features/gallery   # limit to paths
 *
 * Silence a deliberate exception on one line with a comment containing
 * `design-audit-ignore` (same line) or `design-audit-ignore-next-line`
 * (line above). Say why in the comment.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import process from "node:process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DIRS = ["app", "components", "features"];
const EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo"]);

/** Files that legitimately break a rule, by rule id. */
const ALLOW = {
  "font-weight": ["components/wordmark.tsx"], // the logotype is 600 on the landing too
  "raw-hex": ["components/wordmark.tsx"], // logo blue is never themed
};

/** Radii on the landing: pills, 12 panel, 10 card, 8 input, 6–7 thumb, 4–5 swatch/tag, 2 glyph. */
const RADII_PX = new Set([2, 4, 5, 6, 7, 8, 10, 12]);

const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";

/**
 * Line rules: `re` runs on each source line (comments stripped).
 * `test` (optional) receives the match and can veto it.
 */
const LINE_RULES = [
  {
    id: "font-weight",
    severity: "error",
    re: /\bfont-(semibold|bold|extrabold|black)\b|\bfont-\[(?:[6-9]\d\d)\]/g,
    message: "Weights are 400 and 500 only (font-normal / font-medium).",
  },
  {
    id: "legacy-token",
    severity: "error",
    re: /\b(?:bg-cta|text-ink-muted|border-subtle|shadow-elev(?:-hover)?|shadow-hover|ease-snap|ease-base|accent-ink|surface-elevated|stage-bg|muted-ink|ink-caption|ink-secondary|base-blue)\b/g,
    message:
      "Pre-landing token. Use bg/fg/muted/band/surface/workspace/border(-strong)/accent(-text)/ink.",
  },
  {
    id: "alias-token",
    severity: "warn",
    re: /\b(?:bg-background|text-foreground|border-foreground|bg-foreground|bg-card|text-card-foreground|bg-primary|text-primary(?:-foreground)?|text-muted-foreground|bg-secondary|text-secondary-foreground|bg-popover|border-input|bg-input|ring-ring|outline-ring|ring-offset-background|text-background)\b/g,
    message:
      "shadcn alias. Write the landing tokens: bg-bg, text-fg, bg-surface, bg-accent, text-accent-fg, text-muted, bg-band…",
  },
  {
    id: "palette-colour",
    severity: "error",
    re: new RegExp(
      `\\b(?:bg|text|border|ring|outline|from|via|to|fill|stroke|decoration|shadow|divide|caret|accent)-(?:${PALETTE})-\\d{2,3}\\b`,
      "g",
    ),
    message: "No Tailwind palette colours in the chrome — tokens only.",
  },
  {
    id: "raw-hex",
    severity: "error",
    re: /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration)-\[#[0-9a-fA-F]{3,8}\]/g,
    message:
      "Raw hex in a class. Use a token (the canvas palette belongs inside canvases only).",
  },
  {
    id: "hue-colour",
    severity: "error",
    re: /oklch\(|hsl\(|\brgb\((?!0 0 0|255 255 255|16 24 40)/g,
    message:
      "Hued colour in the chrome. The canvas is the colour; UI stays black/white/grey + one blue.",
  },
  {
    id: "gradient",
    severity: "error",
    re: /\bbg-(?:gradient|linear|radial|conic)-|\b(?:linear|radial|conic)-gradient\(/g,
    message: "No gradients in UI chrome.",
  },
  {
    id: "glass",
    severity: "warn",
    re: /\bbackdrop-blur(?:-[\w[\]]+)?\b/g,
    message: "No glassmorphism. Use a solid --bg / --surface fill.",
  },
  {
    id: "heavy-shadow",
    severity: "warn",
    re: /\bshadow-(?:sm|md|lg|xl|2xl|inner)\b|\bshadow-(?:black|white)\/[\d.[\]]+/g,
    message:
      "Borders before shadows. Default to a 1px border-border; lift only the main panel (shadow-panel) and canvas (shadow-frame).",
  },
  {
    id: "ring-edge",
    severity: "warn",
    re: /\bring-(?:black|white)\/[\d.[\]]+/g,
    message: "Edges are 1px border-border hairlines, not translucent rings.",
  },
  {
    id: "easing",
    severity: "warn",
    re: /\bease-(?:in|out|in-out|linear)\b|\bease-\[cubic-bezier\((?!0\.4,0,0\.2,1\))[^\]]*\]/g,
    message:
      "One easing curve: ease-standard / ease-ui (cubic-bezier(0.4, 0, 0.2, 1)).",
  },
  {
    id: "duration",
    severity: "warn",
    re: /\bduration-(?:75|100|150|200|300|400|500|700|1000)\b|\bduration-\[(?!120ms|180ms|240ms|360ms)[^\]]+\]/g,
    message:
      "Durations are 120 / 180 / 240 ms (duration-press / duration-fast / duration-ui).",
  },
  {
    id: "spring",
    severity: "warn",
    re: /type:\s*["']spring["']|\bbounce:\s*[\d.]+/g,
    message:
      "Nothing bounces. Tween with the house curve (ease [0.4, 0, 0.2, 1], 120–240 ms).",
  },
  {
    id: "radius",
    severity: "warn",
    re: /\brounded(?:-[trblse]{1,2})?-\[([\d.]+)(px|rem|em)\]/g,
    test: (m) => {
      const n = Number(m[1]);
      const px = m[2] === "px" ? n : n * 16;
      return !RADII_PX.has(px);
    },
    message:
      "Off-scale radius. Use full (pills), 12 panel, 10 card, 8 input, 6–7 thumb, 4–5 swatch/tag.",
  },
  {
    id: "radius-scale",
    severity: "warn",
    re: /\brounded(?:-[trblse]{1,2})?-(?:3xl|4xl)\b/g,
    message: "Largest radius is 12px (rounded-2xl / rounded-[12px]).",
  },
  {
    id: "rem-type",
    severity: "warn",
    // 1.375rem (22px) and 1.75rem (28px) are the landing's two rem titles.
    re: /\btext-\[(?!1\.375rem\]|1\.75rem\])[\d.]+rem\]/g,
    message:
      "Type scale is in px on the landing: 11.5 / 12.5 / 13.5 / 14 / 15 / 17–20.",
  },
  {
    id: "named-type",
    severity: "warn",
    re: /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/g,
    message:
      "Use the landing's px sizes (text-[12.5px], text-[13.5px], text-[15px]…) or t-h2 / t-h3 / t-lead / t-label.",
  },
  {
    id: "blue-selection",
    severity: "error",
    re: /\b(?:aria-selected|aria-checked|aria-pressed|aria-current(?:=\w+)?|data-\[(?:active|selected|state)=?[\w-]*\]|checked|peer-checked|data-active|data-selected|data-checked)[^\s"'`]*:(?:bg|border|ring)-(?:accent|primary)\b/g,
    message:
      "Selection is ink (bg-fg / border-fg), not blue. Blue means “go / alive”.",
  },
  {
    id: "focus-ring",
    severity: "warn",
    re: /\bfocus(?:-visible)?:ring-(?:\d|\[)/g,
    message:
      "Focus uses the global 2px --focus outline (3px offset), not a ring.",
  },
  {
    id: "named-radius",
    severity: "warn",
    re: /\brounded(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?-(?:xs|sm|md|lg|xl|2xl)\b/g,
    message:
      "Write radii as the landing does: rounded-full, or rounded-[12px] / [10px] / [8px] / [6px] / [4px].",
  },
  {
    id: "stock-animation",
    severity: "warn",
    re: /\banimate-(?:spin|ping|pulse|bounce)\b/g,
    message:
      "No spinners, skeleton pulses or bounces. “Working” is a .live-dot plus a t-label status.",
  },
  {
    id: "hover-lift",
    severity: "warn",
    re: /\b(?:group-)?hover:(?:enabled:|not-disabled:)?(?:scale-(?!\[1\.08\])[\w[\].]+|-?translate-y-[\w[\].]+)/g,
    message:
      "Cards and buttons don't lift or grow on hover. Change border/fill colour instead (press is scale 0.985).",
  },
  {
    id: "accent-as-text",
    severity: "error",
    re: /\b(?:text|border|decoration)-accent\b(?![-/])/g,
    test: (m) => !m[0].startsWith("border"),
    message:
      "Accent as text/dots uses text-accent-text (pure blue fails contrast on dark).",
  },
  {
    id: "transition-all",
    severity: "warn",
    re: /\btransition-all\b/g,
    message:
      "Name the properties: transition-colors / transition-[border-color,background-color] …",
  },
  {
    id: "divide",
    severity: "warn",
    re: /\bdivide-[xy]\b|\bdivide-(?:border|fg|muted)/g,
    message: "Use explicit rows: border-b border-border last:border-0.",
  },
  {
    id: "serif-italic",
    severity: "warn",
    re: /\b(?:font-serif|italic)\b/g,
    message:
      "No serif or italic in UI (Instrument Serif lives inside canvases only).",
  },
  {
    id: "us-spelling",
    severity: "warn",
    re: /(?:aria-label|title|placeholder|alt)=["{`][^"`}]*\b(?:[Cc]olors?|[Ff]avorites?|[Cc]ustomiz(?:e|ed|es|ing)|[Cc]anceled)\b/g,
    message:
      "British spelling in copy (colour, favourite, customise, cancelled).",
  },
];

/** String rules: run on each string literal (class strings in cn() etc). */
const STRING_RULES = [
  {
    id: "label-not-mono",
    severity: "warn",
    test: (s) =>
      /(^|\s)uppercase(\s|$)/.test(s) &&
      !/(^|\s)(t-label|font-mono|t-mono)(\s|$)/.test(s),
    message: "Uppercase labels are t-label (Geist Mono, 11.5px, +0.04em).",
  },
  {
    id: "solid-not-pill",
    severity: "warn",
    test: (s) =>
      /(^|\s)(bg-accent|bg-primary|btn-primary|btn-ink)(\s|$)/.test(s) &&
      /(^|\s)(h-(?:7|8|9|10|11|12|14)|min-h-(?:9|10|11))(\s|$)/.test(s) &&
      /(^|\s)rounded-(?!full)[\w[\]-]+(\s|$)/.test(s),
    message: "Solid buttons are pills (rounded-full), 36 / 40 / 48px tall.",
  },
  {
    id: "copy-ellipsis",
    severity: "warn",
    test: (s) => /[A-Za-z]\.\.\.(\s|$)/.test(s),
    message: "Use a real ellipsis (…), not three dots.",
  },
];

/**
 * Copy rules: run on JSX text — `>text<` segments and lines that are plain
 * prose inside JSX.
 */
const COPY_RULES = [
  {
    id: "copy-ellipsis",
    severity: "warn",
    re: /[A-Za-z]\.\.\./g,
    message: "Use a real ellipsis (…), not three dots.",
  },
  {
    id: "copy-exclaim",
    severity: "warn",
    re: /[A-Za-z]!(?=\s|$)/g,
    message: "No exclamation marks. Plain, confident copy.",
  },
  {
    id: "copy-quotes",
    severity: "warn",
    re: /&apos;|&#39;|&quot;|&#34;/g,
    message: "Use curly quotes and apostrophes (’ “ ”) in copy.",
  },
  {
    id: "copy-times",
    severity: "warn",
    re: /\d\s?[xX]\s?\d/g,
    message: "Use × for dimensions (1080 × 1350).",
  },
  {
    id: "copy-range",
    severity: "warn",
    re: /\b\d+-\d+(?!\d)/g,
    message: "Use an en dash for ranges (3–6).",
  },
  {
    id: "us-spelling",
    severity: "warn",
    re: /\b(colors?|colored|favorites?|customiz(?:e|ed|es|ing)|organiz(?:e|ed|es|ing)|center(?:ed)?|canceled)\b/gi,
    message:
      "British spelling in copy (colour, favourite, customise, organise, centre, cancelled).",
  },
];

// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const strict = argv.includes("--strict");
const targets = argv.filter((a) => !a.startsWith("--"));
const roots = (targets.length ? targets : DEFAULT_DIRS).map((p) =>
  resolve(ROOT, p),
);

function walk(path, out) {
  let st;
  try {
    st = statSync(path);
  } catch {
    return out;
  }
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (SKIP_DIRS.has(name)) continue;
      walk(join(path, name), out);
    }
  } else if (EXTENSIONS.has(path.slice(path.lastIndexOf(".")))) {
    out.push(path);
  }
  return out;
}

/** Blank out // and /* *\/ comments so prose about a rule doesn't trip it. */
function stripComments(src) {
  let out = "";
  let i = 0;
  let inBlock = false;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (inBlock) {
      if (c === "*" && n === "/") {
        out += "  ";
        i += 2;
        inBlock = false;
      } else {
        out += c === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }
    if (quote) {
      out += c;
      if (c === "\\") {
        out += n ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === "/" && n === "*") {
      inBlock = true;
      out += "  ";
      i += 2;
      continue;
    }
    if (c === "/" && n === "/" && src[i - 1] !== ":") {
      while (i < src.length && src[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    out += c;
    i++;
  }
  return out;
}

const STRING_RE =
  /"((?:\\.|[^"\\\n])*)"|'((?:\\.|[^'\\\n])*)'|`((?:\\.|[^`\\])*)`/g;

const findings = [];

for (const file of roots.flatMap((r) => walk(r, []))) {
  const rel = relative(ROOT, file);
  const raw = readFileSync(file, "utf8");
  const rawLines = raw.split("\n");
  const code = stripComments(raw);
  const lines = code.split("\n");

  const ignored = (idx) =>
    rawLines[idx]?.includes("design-audit-ignore") ||
    (idx > 0 && rawLines[idx - 1]?.includes("design-audit-ignore-next-line"));

  const allowed = (id) => (ALLOW[id] ?? []).includes(rel);

  lines.forEach((line, idx) => {
    if (ignored(idx)) return;
    for (const rule of LINE_RULES) {
      if (allowed(rule.id)) continue;
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line))) {
        if (rule.test && !rule.test(m)) continue;
        findings.push({
          file: rel,
          line: idx + 1,
          col: m.index + 1,
          rule: rule.id,
          severity: rule.severity,
          match: m[0],
          message: rule.message,
        });
      }
    }
  });

  // Copy rules: JSX text segments and plain-prose lines inside JSX.
  if (file.endsWith(".tsx")) {
    lines.forEach((line, idx) => {
      if (ignored(idx)) return;
      const segments = [];
      const seg = />([^<>{}]*[A-Za-z][^<>{}]*)</g;
      let sm2;
      while ((sm2 = seg.exec(line)))
        segments.push({ text: sm2[1], at: sm2.index + 1 });
      const trimmed = line.trim();
      if (
        !segments.length &&
        /^[A-Z][a-z’]*[ ,][^"'`<>{}=;()[\]|&]*$/.test(trimmed) &&
        !/^(?:import|export|return|const|let|type|interface|case|default|else|if)\b/.test(
          trimmed,
        )
      ) {
        segments.push({ text: trimmed, at: line.indexOf(trimmed) });
      }
      for (const { text, at } of segments) {
        for (const rule of COPY_RULES) {
          if (allowed(rule.id)) continue;
          rule.re.lastIndex = 0;
          let m;
          while ((m = rule.re.exec(text))) {
            findings.push({
              file: rel,
              line: idx + 1,
              col: at + m.index + 1,
              rule: rule.id,
              severity: rule.severity,
              match:
                text.trim().length > 72
                  ? `${text.trim().slice(0, 69)}…`
                  : text.trim(),
              message: rule.message,
            });
          }
        }
      }
    });
  }

  // String rules need the literal's line: map offsets back to lines.
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++)
    if (code[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (offset) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  STRING_RE.lastIndex = 0;
  let sm;
  while ((sm = STRING_RE.exec(code))) {
    const s = sm[1] ?? sm[2] ?? sm[3] ?? "";
    if (!s.includes(" ") && !s.includes("-")) continue;
    const idx = lineOf(sm.index);
    if (ignored(idx)) continue;
    for (const rule of STRING_RULES) {
      if (allowed(rule.id) || !rule.test(s)) continue;
      findings.push({
        file: rel,
        line: idx + 1,
        col: sm.index - lineStarts[idx] + 1,
        rule: rule.id,
        severity: rule.severity,
        match: s.length > 72 ? `${s.slice(0, 69)}…` : s,
        message: rule.message,
      });
    }
  }
}

findings.sort((a, b) =>
  a.file === b.file
    ? a.line - b.line || a.col - b.col
    : a.file.localeCompare(b.file),
);

const errors = findings.filter((f) => f.severity === "error").length;
const warnings = findings.length - errors;

if (asJson) {
  process.stdout.write(
    `${JSON.stringify({ errors, warnings, findings }, null, 2)}\n`,
  );
} else {
  const tty = process.stdout.isTTY;
  const dim = (s) => (tty ? `\x1b[2m${s}\x1b[0m` : s);
  const bold = (s) => (tty ? `\x1b[1m${s}\x1b[0m` : s);
  const sev = (s) =>
    s === "error"
      ? tty
        ? "\x1b[31merror\x1b[0m"
        : "error"
      : tty
        ? "\x1b[33mwarn \x1b[0m"
        : "warn ";

  let current = "";
  for (const f of findings) {
    if (f.file !== current) {
      current = f.file;
      process.stdout.write(`\n${bold(f.file)}\n`);
    }
    process.stdout.write(
      `  ${dim(`${f.line}:${f.col}`.padEnd(8))} ${sev(f.severity)}  ${f.rule.padEnd(15)} ${f.match}\n`,
    );
  }

  const byRule = new Map();
  for (const f of findings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  if (findings.length) {
    process.stdout.write(`\n${bold("Rules")}\n`);
    const all = [...LINE_RULES, ...STRING_RULES, ...COPY_RULES];
    for (const [id, n] of [...byRule].sort((a, b) => b[1] - a[1])) {
      const rule = all.find((r) => r.id === id);
      process.stdout.write(
        `  ${String(n).padStart(4)}  ${id.padEnd(15)} ${dim(rule?.message ?? "")}\n`,
      );
    }
  }
  process.stdout.write(
    `\n${findings.length ? "" : "No drift from the design language. "}${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}\n`,
  );
}

// exitCode (not exit()) so large piped output is flushed first.
process.exitCode = errors > 0 || (strict && warnings > 0) ? 1 : 0;
