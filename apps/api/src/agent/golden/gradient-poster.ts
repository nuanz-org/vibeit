/**
 * Golden: gradient poster (AM1).
 * Full-bleed gradient fields, type hierarchy, still-or-slow drift.
 */
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", label: "Base", default: "#1a1030" },
        { name: "accent", kind: "color", label: "Wash", default: "#ff6b4a" },
        { name: "highlight", kind: "color", label: "Highlight", default: "#ffd166" },
        { name: "ink", kind: "color", label: "Type", default: "#fff8f0" },
        {
          name: "title",
          kind: "text",
          label: "Title",
          default: "POSTER",
          maxLength: 28,
        },
        {
          name: "subtitle",
          kind: "text",
          label: "Subtitle",
          default: "soft gradient field",
          maxLength: 48,
        },
        {
          name: "drift",
          kind: "number",
          label: "Drift",
          default: 0.4,
          min: 0,
          max: 1.5,
          step: 0.05,
        },
      ],
      getDefaultParams: () => ({
        bg: "#1a1030",
        accent: "#ff6b4a",
        highlight: "#ffd166",
        ink: "#fff8f0",
        title: "POSTER",
        subtitle: "soft gradient field",
        drift: 0.4,
      }),
      getAssetSlots: () => [],
      draw(c) {
        const g = c.ctx;
        const w = c.width;
        const h = c.height;
        const bg = String(c.params.bg ?? "#1a1030");
        const accent = String(c.params.accent ?? "#ff6b4a");
        const highlight = String(c.params.highlight ?? "#ffd166");
        const ink = String(c.params.ink ?? "#fff8f0");
        const title = String(c.params.title ?? "POSTER");
        const subtitle = String(c.params.subtitle ?? "");
        const drift = typeof c.params.drift === "number" ? c.params.drift : 0.4;
        // slow seamless drift (eased sine)
        const phase = c.time * drift * 0.35;
        const ox = Math.sin(phase) * w * 0.08;
        const oy = Math.cos(phase * 0.7) * h * 0.05;

        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);

        // large diagonal wash
        const grad = g.createLinearGradient(
          ox,
          oy,
          w + ox,
          h * 0.85 + oy,
        );
        grad.addColorStop(0, bg);
        grad.addColorStop(0.45, accent);
        grad.addColorStop(1, highlight);
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);

        // soft vignette for focus
        const vig = g.createRadialGradient(
          w * 0.5,
          h * 0.42,
          Math.min(w, h) * 0.15,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.72,
        );
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.4)");
        g.fillStyle = vig;
        g.fillRect(0, 0, w, h);

        // top hairline
        g.save();
        g.strokeStyle = ink;
        g.globalAlpha = 0.35;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(w * 0.1, h * 0.18);
        g.lineTo(w * 0.9, h * 0.18);
        g.stroke();
        g.restore();

        // display title
        const titleSize = Math.max(28, Math.floor(w * 0.12));
        g.save();
        g.fillStyle = ink;
        g.font = `700 ${titleSize}px system-ui, -apple-system, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(title, w * 0.5, h * 0.48, w * 0.84);
        g.restore();

        // caption hierarchy
        if (subtitle) {
          g.save();
          g.fillStyle = ink;
          g.globalAlpha = 0.7;
          g.font = `500 ${Math.max(11, Math.floor(w * 0.038))}px system-ui, sans-serif`;
          g.textAlign = "center";
          g.fillText(subtitle, w * 0.5, h * 0.58, w * 0.78);
          g.restore();
        }

        // footer mark
        g.save();
        g.fillStyle = highlight;
        g.globalAlpha = 0.65;
        g.font = `500 ${Math.max(9, Math.floor(w * 0.028))}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.fillText("gradient poster", w * 0.5, h * 0.88, w * 0.7);
        g.restore();
      },
    },
    { aspect: "4:5", autoDpr: true },
  );
