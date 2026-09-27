/** Soft-truncate on a word boundary; never mid-glyph. */
export function clipAtWord(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const base = (sp > Math.floor(max * 0.45) ? cut.slice(0, sp) : cut)
    .replace(/[.,;:\-—…\s]+$/u, "")
    .trim();
  return base ? `${base}…` : `${cut.trim()}…`;
}

function looksTruncatedToken(name: string): boolean {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length !== 1) return false;
  const w = words[0] ?? "";
  if (w.length < 6 || w.length > 16) return false;
  if (/^(dvd|vhs|logo|grid|type|clock|morph)$/i.test(w)) return false;
  return !/(ions?|ings?|ments?|ness|able|ally|ed|er|ly|ty|al|ous|ive|parc)$/i.test(
    w,
  );
}

/** Prefer a short craft name; vision dumps become a tight line. */
export function displayTitle(raw: string | null | undefined): string {
  let t = (raw ?? "").trim();
  if (!t) return "Untitled tool";

  t = t.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();

  const called = t.match(/(?:called|named)\s+["'“”‘’]([^"'“”‘’\n]{2,56})/i);
  if (called?.[1]) {
    const name = called[1].replace(/[.,;:\-—…"']+$/u, "").trim();
    if (name.length >= 2 && !looksTruncatedToken(name)) {
      return clipAtWord(name, 42);
    }
  }

  t = t
    .replace(
      /^(build|create|make|design|generate|i want|i need|please)\s+(an|a|me|my)?\s*/i,
      "",
    )
    .replace(/^(remixable\s+)?(creative\s+)?(motion\s+)?tool\s*/i, "")
    .replace(/^a\s+tool\s*/i, "")
    .replace(/^(which|that|whihc|simple)\s+/i, "")
    .replace(/^(these are|this is|here(?:'s| are))\s+/i, "")
    .replace(/(?:^|\s+)(?:called|named)\s+["'“”‘’]?.*$/i, "")
    .trim();

  if (t.length > 48) {
    const cut = t.slice(0, 48);
    const stop = Math.max(
      cut.lastIndexOf(". "),
      cut.lastIndexOf(" — "),
      cut.lastIndexOf(" - "),
      cut.lastIndexOf(", "),
    );
    t = (stop > 16 ? cut.slice(0, stop) : cut).trim();
  }

  if (t.length < 3) {
    const fallback = (raw ?? "")
      .trim()
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .replace(
        /^(build|create|make)\s+(an|a)?\s*(remixable\s+)?(creative\s+)?(motion\s+)?tool\s*/i,
        "",
      )
      .replace(/(?:^|\s+)(?:called|named)\s+["'“”‘’]?.*$/i, "")
      .trim();
    t = fallback.length >= 3 ? fallback : "Creative tool";
  }

  t = clipAtWord(t, 44);

  // Sentence case, like all Aiditr copy: capitalise the first letter only.
  t = t.charAt(0).toUpperCase() + t.slice(1);

  return t || "Untitled tool";
}

/** "12 Sep 2026" — or null when the date is missing or unparseable. */
export function formatPublished(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return null;
  }
}

/** Mono meta line under a tile: first tags, else the publish date. */
export function tileMeta(card: {
  tags?: string[] | null;
  publishedAt?: string | null;
}): string {
  const tags = (card.tags ?? []).filter(Boolean).slice(0, 2);
  if (tags.length) return tags.join(" · ");
  return formatPublished(card.publishedAt) ?? "Published tool";
}

export function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}
