/**
 * Golden: particle field (AM1).
 * Soft orbiting dots with palette roles, tempo, and param-driven density.
 */
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", label: "Background", default: "#07070c" },
        { name: "accent", kind: "color", label: "Particle", default: "#6ee7ff" },
        { name: "core", kind: "color", label: "Core", default: "#a78bfa" },
        {
          name: "title",
          kind: "text",
          label: "Label",
          default: "field",
          maxLength: 32,
        },
        {
          name: "count",
          kind: "number",
          label: "Count",
          default: 48,
          min: 12,
          max: 120,
          step: 1,
        },
        {
          name: "speed",
          kind: "number",
          label: "Speed",
          default: 0.8,
          min: 0,
          max: 2.5,
          step: 0.05,
        },
      ],
      getDefaultParams: () => ({
        bg: "#07070c",
        accent: "#6ee7ff",
        core: "#a78bfa",
        title: "field",
        count: 48,
        speed: 0.8,
      }),
      getAssetSlots: () => [],
      draw(c) {
        const g = c.ctx;
        const w = c.width;
        const h = c.height;
        const bg = String(c.params.bg ?? "#07070c");
        const accent = String(c.params.accent ?? "#6ee7ff");
        const core = String(c.params.core ?? "#a78bfa");
        const title = String(c.params.title ?? "field");
        const countRaw = typeof c.params.count === "number" ? c.params.count : 48;
        const count = Math.max(8, Math.min(120, Math.floor(countRaw)));
        const speed = typeof c.params.speed === "number" ? c.params.speed : 0.8;
        const t = c.time * speed;
        const cx = w * 0.5;
        const cy = h * 0.46;
        const R = Math.min(w, h) * 0.32;

        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);

        // radial atmosphere
        const glow = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.6);
        glow.addColorStop(0, core);
        glow.addColorStop(0.35, "rgba(0,0,0,0)");
        glow.addColorStop(1, "rgba(0,0,0,0.5)");
        g.save();
        g.globalAlpha = 0.22;
        g.fillStyle = glow;
        g.fillRect(0, 0, w, h);
        g.restore();

        // soft core
        g.save();
        g.shadowColor = core;
        g.shadowBlur = Math.min(w, h) * 0.08;
        g.fillStyle = core;
        g.globalAlpha = 0.55;
        g.beginPath();
        g.arc(cx, cy, R * 0.12, 0, Math.PI * 2);
        g.fill();
        g.restore();

        // particles (deterministic pseudo-random from index)
        for (let i = 0; i < count; i++) {
          const seed = i * 1.6180339887;
          const orbit = 0.25 + (seed % 1) * 0.85;
          const phase = seed * 2.3 + t * (0.6 + (seed % 1) * 0.9);
          // ease: smooth elliptical motion
          const x = cx + Math.cos(phase) * R * orbit;
          const y = cy + Math.sin(phase * 0.92) * R * orbit * 0.72;
          const size =
            Math.min(w, h) *
            (0.004 + 0.01 * (0.5 + 0.5 * Math.sin(phase * 1.7 + i)));
          const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(phase + i * 0.3));

          g.save();
          g.globalAlpha = alpha;
          g.fillStyle = i % 3 === 0 ? core : accent;
          g.beginPath();
          g.arc(x, y, size, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }

        // label
        g.save();
        g.fillStyle = accent;
        g.globalAlpha = 0.85;
        g.font = `500 ${Math.max(11, Math.floor(w * 0.04))}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.fillText(title, w * 0.5, h * 0.86, w * 0.8);
        g.restore();
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
