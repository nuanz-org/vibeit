"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

import { EASE_UI, FLOW_STAGGER } from "../motion";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — From messy to made
 *
 *  in-view: steps stagger 100ms
 * ───────────────────────────────────────────────────────── */

const STEPS = [
  {
    title: "Describe",
    body: "Dump the messy vision. Optional references. Aiditr plans a living tool — not a static mock.",
  },
  {
    title: "Play",
    body: "Knobs, assets, and chat. Tune until it matches what you meant.",
  },
  {
    title: "Ship",
    body: "PNG, short video, share link, embed. Publish to the gallery when you’re proud.",
  },
] as const;

export function StoryFlow() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const show = inView || reduce;

  return (
    <section
      ref={ref}
      className="border-y border-border bg-surface"
      aria-labelledby="story-flow-heading"
    >
      <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-6 md:py-20">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={
            reduce ? { duration: 0 } : { duration: 0.45, ease: EASE_UI }
          }
        >
          <h2
            id="story-flow-heading"
            className="m-0 max-w-[18ch] text-[clamp(1.5rem,2.8vw,1.85rem)] font-medium leading-[1.15] tracking-[-0.025em] text-balance text-ink"
          >
            From messy to made.
          </h2>
          <p className="mt-3 mb-10 max-w-[40ch] text-[15px] leading-[1.55] text-pretty text-muted-ink">
            Describe once. Play with the controls. Export when it’s real.
          </p>
        </motion.div>

        <ol className="m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              className="relative flex flex-col gap-2.5"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      duration: 0.45,
                      delay: 0.08 + i * FLOW_STAGGER,
                      ease: EASE_UI,
                    }
              }
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[12px] tabular-nums text-ink-caption">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="m-0 text-[17px] font-medium tracking-[-0.02em] text-ink">
                  {step.title}
                </h3>
              </div>
              <p className="m-0 max-w-[32ch] pl-[calc(1.5rem+0.75rem)] text-[15px] leading-[1.55] text-pretty text-muted-ink">
                {step.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
