"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { Monitor, Moon, Sun } from "@/components/icons";

/*
 * Theme preference, shared with the landing (aiditr-landing/features/landing/ui/prefs.tsx).
 * `aiditr-theme` in localStorage holds "light" | "dark"; absent = follow the
 * system. The boot script in app/layout.tsx applies it before first paint.
 */

type Pref = "light" | "dark" | "system";
const KEY = "aiditr-theme";
const DARK = "(prefers-color-scheme: dark)";
const prefListeners = new Set<() => void>();

function readPref(): Pref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: Pref) {
  const dark =
    pref === "dark" || (pref === "system" && window.matchMedia(DARK).matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function setPref(pref: Pref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Storage blocked: still switch for this page view.
  }
  apply(pref);
  for (const fn of prefListeners) fn();
}

function subscribePref(cb: () => void) {
  prefListeners.add(cb);
  return () => {
    prefListeners.delete(cb);
  };
}

/** The applied theme, following the attribute the boot script and toggle set. */
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => mo.disconnect();
}

export const useTheme = () =>
  useSyncExternalStore(
    subscribeTheme,
    () =>
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light",
    () => "light" as const,
  );

/** Keeps the page on the system theme while no explicit choice is stored. */
export function useSystemThemeSync() {
  useEffect(() => {
    const m = window.matchMedia(DARK);
    const on = () => {
      if (readPref() === "system") apply("system");
    };
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useSyncExternalStore(
    subscribePref,
    readPref,
    () => "system" as Pref,
  );

  const opts: { v: Pref; label: string; icon: ReactNode }[] = [
    { v: "light", label: "Light theme", icon: <Sun size={14} /> },
    { v: "dark", label: "Dark theme", icon: <Moon size={14} /> },
    { v: "system", label: "Match system theme", icon: <Monitor size={14} /> },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`inline-flex rounded-full border border-border bg-bg p-0.5 ${className}`}
    >
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={pref === o.v}
          aria-label={o.label}
          title={o.label}
          onClick={() => setPref(o.v)}
          className={`hit grid size-8 cursor-pointer place-items-center rounded-full transition-colors duration-[180ms] ${
            pref === o.v
              ? "bg-band text-fg shadow-[inset_0_0_0_1px_var(--border)]"
              : "text-muted hover:text-fg"
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
