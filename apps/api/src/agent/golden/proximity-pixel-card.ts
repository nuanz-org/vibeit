/**
 * Golden: proximity-pixel-card (A5 / Brik capture #1).
 * Pointer distance drives pixelation + distortion; image slot + grouped controls.
 */
import {
  createCanvas2dTool,
  drawImageCover,
} from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        {
          name: "headline",
          kind: "text",
          label: "Headline",
          default: "PROXIMITY",
          maxLength: 32,
          group: "Content",
        },
        {
          name: "caption",
          kind: "text",
          label: "Caption",
          default: "hover to distort",
          maxLength: 48,
          group: "Content",
        },
        {
          name: "photo",
          kind: "assetRef",
          label: "Photo",
          default: null,
          assetSlotId: "photo",
          group: "Content",
        },
        {
          name: "maxPixelation",
          kind: "number",
          label: "Max pixelation",
          default: 18,
          min: 2,
          max: 48,
          step: 1,
          group: "Distortion",
          uiHint: "slider",
        },
        {
          name: "warpStrength",
          kind: "number",
          label: "Warp strength",
          default: 0.55,
          min: 0,
          max: 1.5,
          step: 0.05,
          group: "Distortion",
          uiHint: "slider",
        },
        {
          name: "falloff",
          kind: "number",
          label: "Falloff radius",
          default: 0.42,
          min: 0.15,
          max: 0.9,
          step: 0.01,
          group: "Interaction",
          uiHint: "slider",
        },
        {
          name: "invertNear",
          kind: "boolean",
          label: "Invert when close",
          default: false,
          group: "Interaction",
          uiHint: "switch",
        },
        {
          name: "bg",
          kind: "color",
          label: "Background",
          default: "#0c0c12",
          group: "Card Styling",
        },
        {
          name: "ink",
          kind: "color",
          label: "Ink",
          default: "#f2efe8",
          group: "Card Styling",
        },
        {
          name: "accent",
          kind: "color",
          label: "Accent",
          default: "#7c5cff",
          group: "Card Styling",
        },
        {
          name: "radius",
          kind: "number",
          label: "Corner radius",
          default: 0.06,
          min: 0,
          max: 0.2,
          step: 0.005,
          group: "Card Styling",
          uiHint: "slider",
        },
      ],
      getDefaultParams: () => ({
        headline: "PROXIMITY",
        caption: "hover to distort",
        photo: null,
        maxPixelation: 18,
        warpStrength: 0.55,
        falloff: 0.42,
        invertNear: false,
        bg: "#0c0c12",
        ink: "#f2efe8",
        accent: "#7c5cff",
        radius: 0.06,
      }),
      getAssetSlots: () => [
        {
          id: "photo",
          label: "Card photo",
          accept: "image/*",
          required: false,
        },
      ],
      draw(c) {
        const g = c.ctx;
        const w = c.width;
        const h = c.height;
        const bg = String(c.params.bg ?? "#0c0c12");
        const ink = String(c.params.ink ?? "#f2efe8");
        const accent = String(c.params.accent ?? "#7c5cff");
        const headline = String(c.params.headline ?? "PROXIMITY");
        const caption = String(c.params.caption ?? "hover to distort");
        const maxPix =
          typeof c.params.maxPixelation === "number"
            ? c.params.maxPixelation
            : 18;
        const warp =
          typeof c.params.warpStrength === "number"
            ? c.params.warpStrength
            : 0.55;
        const falloff =
          typeof c.params.falloff === "number" ? c.params.falloff : 0.42;
        const invertNear = Boolean(c.params.invertNear);
        const radiusFrac =
          typeof c.params.radius === "number" ? c.params.radius : 0.06;

        // Pointer → normalized proximity (0 far, 1 near)
        const px = c.pointer?.x ?? w * 0.5;
        const py = c.pointer?.y ?? h * 0.5;
        const over = Boolean(c.pointer?.isOver);
        const cx = w * 0.5;
        const cy = h * 0.48;
        const dist = Math.hypot(px - cx, py - cy);
        const R = Math.min(w, h) * Math.max(0.12, falloff);
        let proximity = 1 - Math.min(1, dist / R);
        if (!over) proximity *= 0.35;
        if (invertNear) proximity = 1 - proximity;

        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);

        // Soft atmosphere
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.55);
        glow.addColorStop(0, accent);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        g.save();
        g.globalAlpha = 0.1 + 0.18 * proximity;
        g.fillStyle = glow;
        g.fillRect(0, 0, w, h);
        g.restore();

        // Card frame
        const cardW = w * 0.78;
        const cardH = h * 0.72;
        const cardX = (w - cardW) / 2;
        const cardY = (h - cardH) / 2 + h * 0.02;
        const rr = Math.min(cardW, cardH) * radiusFrac;

        const roundRect = (
          x: number,
          y: number,
          rw: number,
          rh: number,
          r: number,
        ) => {
          const rad = Math.min(r, rw / 2, rh / 2);
          g.beginPath();
          g.moveTo(x + rad, y);
          g.arcTo(x + rw, y, x + rw, y + rh, rad);
          g.arcTo(x + rw, y + rh, x, y + rh, rad);
          g.arcTo(x, y + rh, x, y, rad);
          g.arcTo(x, y, x + rw, y, rad);
          g.closePath();
        };

        // Shadow
        g.save();
        g.shadowColor = "rgba(0,0,0,0.45)";
        g.shadowBlur = Math.min(w, h) * 0.04;
        g.shadowOffsetY = h * 0.012;
        g.fillStyle = "#14141c";
        roundRect(cardX, cardY, cardW, cardH, rr);
        g.fill();
        g.restore();

        // Clip card content
        g.save();
        roundRect(cardX, cardY, cardW, cardH, rr);
        g.clip();

        // Image band (or placeholder wash)
        const imgBandH = cardH * 0.58;
        const img = c.images?.photo ?? null;
        if (img) {
          // Pixelation via scale down → up (strength from proximity)
          const cell = Math.max(
            1,
            Math.floor(1 + proximity * Math.max(2, maxPix)),
          );
          const smallW = Math.max(4, Math.floor(cardW / cell));
          const smallH = Math.max(4, Math.floor(imgBandH / cell));
          // Warp offset toward pointer
          const wx = ((px - cx) / Math.max(1, w)) * warp * proximity * cardW * 0.12;
          const wy = ((py - cy) / Math.max(1, h)) * warp * proximity * cardH * 0.08;

          g.save();
          g.imageSmoothingEnabled = false;
          // Draw low-res into temp via scaled cover into main (approx)
          g.translate(cardX + wx, cardY + wy);
          g.scale(cardW / smallW, imgBandH / smallH);
          drawImageCover(g, img, 0, 0, smallW, smallH);
          g.restore();
        } else {
          const ph = g.createLinearGradient(
            cardX,
            cardY,
            cardX + cardW,
            cardY + imgBandH,
          );
          ph.addColorStop(0, accent);
          ph.addColorStop(1, "#1a1a28");
          g.fillStyle = ph;
          g.fillRect(cardX, cardY, cardW, imgBandH);
          // Placeholder grid (reads as “no photo”)
          g.strokeStyle = "rgba(255,255,255,0.08)";
          g.lineWidth = 1;
          const step = Math.max(12, cardW / 10);
          for (let x = cardX; x < cardX + cardW; x += step) {
            g.beginPath();
            g.moveTo(x, cardY);
            g.lineTo(x, cardY + imgBandH);
            g.stroke();
          }
        }

        // Content panel
        g.fillStyle = "#12121a";
        g.fillRect(cardX, cardY + imgBandH, cardW, cardH - imgBandH);

        // Accent rule
        g.fillStyle = accent;
        g.globalAlpha = 0.85;
        g.fillRect(cardX, cardY + imgBandH, cardW, Math.max(2, h * 0.004));
        g.globalAlpha = 1;

        // Type
        const titleSize = Math.max(16, Math.floor(cardW * 0.09));
        g.fillStyle = ink;
        g.font = `700 ${titleSize}px system-ui, -apple-system, sans-serif`;
        g.textAlign = "left";
        g.textBaseline = "alphabetic";
        g.fillText(
          headline.toUpperCase(),
          cardX + cardW * 0.08,
          cardY + imgBandH + cardH * 0.18,
          cardW * 0.84,
        );

        g.globalAlpha = 0.65;
        g.font = `500 ${Math.max(11, Math.floor(cardW * 0.045))}px system-ui, sans-serif`;
        g.fillStyle = ink;
        g.fillText(
          caption,
          cardX + cardW * 0.08,
          cardY + imgBandH + cardH * 0.3,
          cardW * 0.84,
        );
        g.globalAlpha = 1;

        // Proximity meter (teaches interaction)
        const barW = cardW * 0.84;
        const barH = Math.max(4, h * 0.008);
        const barX = cardX + cardW * 0.08;
        const barY = cardY + cardH - cardH * 0.1;
        g.fillStyle = "rgba(255,255,255,0.08)";
        g.fillRect(barX, barY, barW, barH);
        g.fillStyle = accent;
        g.fillRect(barX, barY, barW * proximity, barH);

        g.restore();

        // Border
        g.save();
        g.strokeStyle = accent;
        g.globalAlpha = 0.25 + 0.35 * proximity;
        g.lineWidth = Math.max(1, w * 0.003);
        roundRect(cardX, cardY, cardW, cardH, rr);
        g.stroke();
        g.restore();
      },
    },
    { aspect: "4:5", autoDpr: true },
  );
