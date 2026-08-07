/**
 * Golden: kinetic type (AM1).
 * Hand-authored canvas2d exemplar — layered type with easing, palette roles, params.
 */
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", label: "Background", default: "#0a0a0f" },
        { name: "ink", kind: "color", label: "Ink", default: "#f4f1ea" },
        { name: "accent", kind: "color", label: "Accent", default: "#ff4d6d" },
        {
          name: "title",
          kind: "text",
          label: "Headline",
          default: "MOTION",
          maxLength: 24,
        },
        {
          name: "intensity",
          kind: "number",
          label: "Intensity",
          default: 0.7,
          min: 0,
          max: 1.5,
          step: 0.05,
        },
        {
          name: "speed",
          kind: "number",
          label: "Speed",
          default: 1,
          min: 0,
          max: 2.5,
          step: 0.05,
        },
      ],
      getDefaultParams: () => ({
        bg: "#0a0a0f",
        ink: "#f4f1ea",
        accent: "#ff4d6d",
        title: "MOTION",
        intensity: 0.7,
        speed: 1,
      }),
      getAssetSlots: () => [],
      draw(c) {
        const g = c.ctx;
        const w = c.width;
        const h = c.height;
        const bg = String(c.params.bg ?? "#0a0a0f");
        const ink = String(c.params.ink ?? "#f4f1ea");
        const accent = String(c.params.accent ?? "#ff4d6d");
        const title = String(c.params.title ?? "MOTION").toUpperCase();
        const intensity =
          typeof c.params.intensity === "number" ? c.params.intensity : 0.7;
        const speed = typeof c.params.speed === "number" ? c.params.speed : 1;

        // smoothstep-ish phase (ease-in-out via sine)
        const t = c.time * speed;
        const ease = 0.5 - 0.5 * Math.cos(t * 1.4);
        const breathe = 0.5 + 0.5 * Math.sin(t * 2.1);

        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);

        // subtle vertical gradient wash (layer 1)
        const wash = g.createLinearGradient(0, 0, 0, h);
        wash.addColorStop(0, accent);
        wash.addColorStop(0.45, "rgba(0,0,0,0)");
        wash.addColorStop(1, "rgba(0,0,0,0.35)");
        g.save();
        g.globalAlpha = 0.12 + 0.08 * intensity;
        g.fillStyle = wash;
        g.fillRect(0, 0, w, h);
        g.restore();

        // baseline rule (layer 2)
        const baseY = h * 0.58;
        g.save();
        g.strokeStyle = accent;
        g.globalAlpha = 0.35 + 0.25 * breathe;
        g.lineWidth = Math.max(1, w * 0.003);
        g.beginPath();
        g.moveTo(w * 0.12, baseY);
        g.lineTo(w * 0.88, baseY);
        g.stroke();
        g.restore();

        // hero type with slight Y ease + tracking (layer 3 — focal)
        const fontSize = Math.max(28, Math.floor(w * (0.14 + 0.04 * intensity)));
        const yOff = (ease - 0.5) * h * 0.03 * intensity;
        g.save();
        g.fillStyle = ink;
        g.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.shadowColor = accent;
        g.shadowBlur = Math.min(w, h) * 0.04 * intensity * breathe;
        g.fillText(title, w * 0.5, h * 0.48 + yOff, w * 0.86);
        g.restore();

        // ghost echo type (layer 4 — motion trail)
        g.save();
        g.globalAlpha = 0.12 * intensity;
        g.fillStyle = accent;
        g.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(title, w * 0.5, h * 0.48 + yOff - h * 0.02, w * 0.86);
        g.restore();

        // caption (layer 5)
        g.save();
        g.fillStyle = ink;
        g.globalAlpha = 0.55;
        g.font = `500 ${Math.max(10, Math.floor(w * 0.035))}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.fillText("kinetic type · ease-out loop", w * 0.5, h * 0.72, w * 0.8);
        g.restore();
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
