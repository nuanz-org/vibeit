/**
 * Golden: neon-trail (efficient kinetic glow).
 * Single-path multi-width glow — no per-segment shadowBlur.
 * Teaches loop phase + strokeSoftGlow / fillSoftDisc patterns for codegen.
 */
import {
  createCanvas2dTool,
  fillSoftDisc,
  strokeSoftGlow,
} from "@repo/contracts/skeletons/canvas2d";

function lemniscate(t: number, scale: number): { x: number; y: number } {
  const sinT = Math.sin(t);
  const denom = 1 + sinT * sinT;
  return {
    x: (Math.cos(t) / denom) * 1.35 * scale,
    y: ((sinT * Math.cos(t)) / denom) * 1.35 * scale,
  };
}

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        {
          name: "loopDuration",
          kind: "number",
          label: "Loop duration",
          default: 3,
          min: 1,
          max: 8,
          step: 0.25,
          group: "Motion",
          uiHint: "slider",
        },
        {
          name: "glowIntensity",
          kind: "number",
          label: "Glow",
          default: 0.85,
          min: 0.2,
          max: 1.5,
          step: 0.05,
          group: "Look",
          uiHint: "slider",
        },
        {
          name: "trailLength",
          kind: "number",
          label: "Trail length",
          default: 0.55,
          min: 0.2,
          max: 1,
          step: 0.05,
          group: "Motion",
          uiHint: "slider",
        },
        {
          name: "lineThickness",
          kind: "number",
          label: "Thickness",
          default: 5,
          min: 2,
          max: 14,
          step: 1,
          group: "Look",
          uiHint: "slider",
        },
        {
          name: "primaryColor",
          kind: "color",
          label: "Tracer",
          default: "#00F0FF",
          group: "Look",
        },
        {
          name: "accentColor",
          kind: "color",
          label: "Glow color",
          default: "#FF007F",
          group: "Look",
        },
        {
          name: "bg",
          kind: "color",
          label: "Background",
          default: "#120224",
          group: "Look",
        },
      ],
      getDefaultParams: () => ({
        loopDuration: 3,
        glowIntensity: 0.85,
        trailLength: 0.55,
        lineThickness: 5,
        primaryColor: "#00F0FF",
        accentColor: "#FF007F",
        bg: "#120224",
      }),
      getAssetSlots: () => [],
      draw(c) {
        const g = c.ctx;
        const w = c.width;
        const h = c.height;
        const loopDur = Math.max(0.5, Number(c.params.loopDuration ?? 3));
        const glowInt = Math.max(0.1, Number(c.params.glowIntensity ?? 0.85));
        const trailLen = Math.max(
          0.15,
          Math.min(1, Number(c.params.trailLength ?? 0.55)),
        );
        const thickness = Math.max(1, Number(c.params.lineThickness ?? 5));
        const tracer = String(c.params.primaryColor ?? "#00F0FF");
        const glow = String(c.params.accentColor ?? "#FF007F");
        const bg = String(c.params.bg ?? "#120224");

        const phase = (c.time % loopDur) / loopDur;
        const headTheta = phase * Math.PI * 2;
        const minDim = Math.min(w, h);
        const scale = minDim * 0.32;
        const cx = w * 0.5;
        const cy = h * 0.5;

        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);

        // Soft atmosphere (one gradient fill — cheap)
        const aura = g.createRadialGradient(cx, cy, minDim * 0.04, cx, cy, scale * 1.5);
        aura.addColorStop(0, tracer);
        aura.addColorStop(0.45, glow);
        aura.addColorStop(1, "rgba(0,0,0,0)");
        g.save();
        g.globalAlpha = 0.16 * glowInt;
        g.fillStyle = aura;
        g.fillRect(0, 0, w, h);
        g.restore();

        // Ghost full loop — one path, one stroke
        const ghost = new Path2D();
        const ghostSteps = 72;
        for (let i = 0; i <= ghostSteps; i++) {
          const t = (i / ghostSteps) * Math.PI * 2;
          const pt = lemniscate(t, scale);
          if (i === 0) ghost.moveTo(cx + pt.x, cy + pt.y);
          else ghost.lineTo(cx + pt.x, cy + pt.y);
        }
        ghost.closePath();
        g.save();
        g.strokeStyle = tracer;
        g.globalAlpha = 0.1;
        g.lineWidth = Math.max(1, thickness * 0.45);
        g.stroke(ghost);
        g.restore();

        // Trail window as ONE path, then soft multi-width glow (no shadowBlur)
        const trailSteps = 56;
        const trailAngle = trailLen * Math.PI * 2;
        const trail = new Path2D();
        for (let i = 0; i <= trailSteps; i++) {
          const frac = i / trailSteps;
          const t = headTheta - (1 - frac) * trailAngle;
          const pt = lemniscate(t, scale);
          if (i === 0) trail.moveTo(cx + pt.x, cy + pt.y);
          else trail.lineTo(cx + pt.x, cy + pt.y);
        }

        strokeSoftGlow(g, trail, {
          color: glow,
          lineWidth: thickness * 1.15,
          intensity: glowInt * 0.85,
          layers: 3,
          composite: "lighter",
        });
        strokeSoftGlow(g, trail, {
          color: tracer,
          lineWidth: thickness,
          intensity: Math.min(1.1, glowInt),
          layers: 2,
          composite: "lighter",
        });

        const head = lemniscate(headTheta, scale);
        const hx = cx + head.x;
        const hy = cy + head.y;
        fillSoftDisc(g, hx, hy, thickness * 3.2 * glowInt, glow, {
          alpha: 0.55 * glowInt,
          composite: "lighter",
        });
        fillSoftDisc(g, hx, hy, Math.max(2, thickness * 0.75), "#FFFFFF", {
          alpha: 0.95,
          composite: "lighter",
        });
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
