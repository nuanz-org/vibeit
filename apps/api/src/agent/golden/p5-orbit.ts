/**
 * Golden: p5-orbit (AM6).
 * Hand-authored p5-style tool — orbiting ellipse with palette params.
 */
import { createP5Tool } from "@repo/contracts/skeletons/p5";

export const createTool = () =>
  createP5Tool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", label: "Background", default: "#0b1020" },
        { name: "accent", kind: "color", label: "Accent", default: "#5ce1ff" },
        { name: "ink", kind: "color", label: "Ink", default: "#e8f4ff" },
        {
          name: "speed",
          kind: "number",
          label: "Speed",
          default: 1,
          min: 0,
          max: 2.5,
          step: 0.05,
        },
        {
          name: "title",
          kind: "text",
          label: "Title",
          default: "ORBIT",
          maxLength: 24,
        },
      ],
      getDefaultParams: () => ({
        bg: "#0b1020",
        accent: "#5ce1ff",
        ink: "#e8f4ff",
        speed: 1,
        title: "ORBIT",
      }),
      getAssetSlots: () => [],
      draw(p) {
        p.background(String(p.params.bg ?? "#0b1020"));
        const speed = Number(p.params.speed ?? 1);
        const t = p.time * speed;
        // soft field of secondary dots
        p.noStroke();
        p.fill(String(p.params.accent ?? "#5ce1ff") + "55");
        for (let i = 0; i < 12; i++) {
          const a = t + (i / 12) * Math.PI * 2;
          p.ellipse(
            p.width * 0.5 + Math.cos(a) * p.width * 0.28,
            p.height * 0.48 + Math.sin(a * 1.3) * p.height * 0.18,
            10 + (i % 3) * 4,
          );
        }
        p.fill(String(p.params.accent ?? "#5ce1ff"));
        p.ellipse(
          p.width * 0.5 + Math.cos(t) * p.width * 0.22,
          p.height * 0.48 + Math.sin(t) * p.height * 0.14,
          56 + 10 * Math.sin(t * 2),
        );
        p.fill(String(p.params.ink ?? "#e8f4ff"));
        p.textSize(Math.max(16, Math.floor(p.width * 0.07)));
        p.textAlign("center", "middle");
        p.text(String(p.params.title ?? "ORBIT"), p.width * 0.5, p.height * 0.78);
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
