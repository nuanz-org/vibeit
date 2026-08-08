/**
 * Golden: kinetic-logo-2d (A5 / Track A stand-in for Kinetic Cube Logo).
 * Three enum axes (shape × assembly × material) as isometric 2D; seamless loop.
 */
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

type Shape = "hexagonRing" | "isometricBlock" | "stackedPyramid";
type Assembly = "flyIn" | "scattered" | "scaleUnfold";
type Material = "matte" | "frostedGlass" | "wireframe";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        {
          name: "finalShape",
          kind: "enum",
          label: "Final shape",
          default: "isometricBlock",
          group: "Shape",
          uiHint: "segmented",
          options: [
            { value: "hexagonRing", label: "Hexagon ring" },
            { value: "isometricBlock", label: "Isometric block" },
            { value: "stackedPyramid", label: "Pyramid" },
          ],
        },
        {
          name: "assemblyStyle",
          kind: "enum",
          label: "Assembly",
          default: "flyIn",
          group: "Motion",
          uiHint: "segmented",
          options: [
            { value: "flyIn", label: "Fly-in" },
            { value: "scattered", label: "Scattered" },
            { value: "scaleUnfold", label: "Scale unfold" },
          ],
        },
        {
          name: "cubeMaterial",
          kind: "enum",
          label: "Material",
          default: "matte",
          group: "Look",
          uiHint: "segmented",
          options: [
            { value: "matte", label: "Matte" },
            { value: "frostedGlass", label: "Frosted glass" },
            { value: "wireframe", label: "Wireframe" },
          ],
        },
        {
          name: "loopDuration",
          kind: "number",
          label: "Loop duration",
          default: 4,
          min: 1.5,
          max: 12,
          step: 0.1,
          group: "Motion",
          uiHint: "slider",
        },
        {
          name: "easingSharpness",
          kind: "number",
          label: "Easing",
          default: 0.65,
          min: 0.1,
          max: 1,
          step: 0.05,
          group: "Motion",
          uiHint: "slider",
        },
        {
          name: "bg",
          kind: "color",
          label: "Background",
          default: "#09090f",
          group: "Look",
        },
        {
          name: "accent",
          kind: "color",
          label: "Accent",
          default: "#8b5cf6",
          group: "Look",
        },
        {
          name: "ink",
          kind: "color",
          label: "Ink",
          default: "#f5f3ff",
          group: "Look",
        },
        {
          name: "title",
          kind: "text",
          label: "Wordmark",
          default: "CHROMA",
          maxLength: 16,
          group: "Content",
        },
      ],
      getDefaultParams: () => ({
        finalShape: "isometricBlock",
        assemblyStyle: "flyIn",
        cubeMaterial: "matte",
        loopDuration: 4,
        easingSharpness: 0.65,
        bg: "#09090f",
        accent: "#8b5cf6",
        ink: "#f5f3ff",
        title: "CHROMA",
      }),
      getAssetSlots: () => [],
      draw(c) {
        const g = c.ctx;
        const w = c.width;
        const h = c.height;
        const bg = String(c.params.bg ?? "#09090f");
        const accent = String(c.params.accent ?? "#8b5cf6");
        const ink = String(c.params.ink ?? "#f5f3ff");
        const title = String(c.params.title ?? "CHROMA").toUpperCase();
        const shape = String(c.params.finalShape ?? "isometricBlock") as Shape;
        const assembly = String(
          c.params.assemblyStyle ?? "flyIn",
        ) as Assembly;
        const material = String(c.params.cubeMaterial ?? "matte") as Material;
        const loopDur = Math.max(
          0.5,
          typeof c.params.loopDuration === "number"
            ? c.params.loopDuration
            : 4,
        );
        const sharp =
          typeof c.params.easingSharpness === "number"
            ? c.params.easingSharpness
            : 0.65;

        // Normalized loop phase 0..1
        const t = (c.time % loopDur) / loopDur;
        // Power-ish ease-out then settle (assembly progress 0→1 over first half)
        const raw = t < 0.55 ? t / 0.55 : 1;
        const p = Math.pow(raw, 0.35 + sharp * 1.2);
        const settle = t < 0.55 ? p : 1;
        const breathe = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);

        g.fillStyle = bg;
        g.fillRect(0, 0, w, h);

        // Soft ground plane
        const floorY = h * 0.62;
        const floor = g.createLinearGradient(0, floorY - h * 0.08, 0, h);
        floor.addColorStop(0, "rgba(0,0,0,0)");
        floor.addColorStop(0.4, "rgba(0,0,0,0.25)");
        floor.addColorStop(1, "rgba(0,0,0,0.55)");
        g.fillStyle = floor;
        g.fillRect(0, 0, w, h);

        const cx = w * 0.5;
        const cy = h * 0.42;
        const S = Math.min(w, h) * 0.22;

        // Assembly offsets / scale (distinct per style)
        let ox = 0;
        let oy = 0;
        let scale = 1;
        let scatter = 0;
        if (assembly === "flyIn") {
          ox = (1 - settle) * w * 0.28;
          oy = (1 - settle) * -h * 0.18;
          scale = 0.55 + 0.45 * settle;
        } else if (assembly === "scattered") {
          scatter = 1 - settle;
          scale = 0.75 + 0.25 * settle;
        } else {
          // scaleUnfold
          scale = 0.15 + 0.85 * settle;
          oy = (1 - settle) * h * 0.06;
        }

        const applyMaterial = (fill: boolean) => {
          if (material === "wireframe") {
            g.fillStyle = "transparent";
            g.strokeStyle = accent;
            g.lineWidth = Math.max(1.5, S * 0.045);
            g.globalAlpha = 0.9;
            return "stroke" as const;
          }
          if (material === "frostedGlass") {
            g.fillStyle = accent;
            g.strokeStyle = ink;
            g.lineWidth = Math.max(1, S * 0.03);
            g.globalAlpha = 0.28 + 0.12 * breathe;
            return fill ? ("fillStroke" as const) : ("stroke" as const);
          }
          // matte
          g.fillStyle = accent;
          g.strokeStyle = ink;
          g.lineWidth = Math.max(1, S * 0.025);
          g.globalAlpha = 0.92;
          return fill ? ("fill" as const) : ("stroke" as const);
        };

        const paintPath = (mode: "fill" | "stroke" | "fillStroke") => {
          if (mode === "fill" || mode === "fillStroke") g.fill();
          if (mode === "stroke" || mode === "fillStroke") g.stroke();
        };

        const iso = (x: number, y: number, z: number) => {
          // Classic 2:1 isometric
          const ix = (x - z) * 0.866;
          const iy = y + (x + z) * 0.5;
          return { x: cx + ox + ix * S * scale, y: cy + oy + iy * S * scale };
        };

        g.save();

        // --- Shape branches (visibly different) ---
        if (shape === "hexagonRing") {
          const parts = 6;
          for (let i = 0; i < parts; i++) {
            const a0 = (i / parts) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / parts) * Math.PI * 2 - Math.PI / 2;
            const rOut = 1.05;
            const rIn = 0.55;
            const scatterA = scatter * (i % 2 === 0 ? 1 : -1) * 0.35;
            const sc = scatter * S * 0.55;
            const mode = applyMaterial(true);
            g.beginPath();
            const p0 = {
              x:
                cx +
                ox +
                Math.cos(a0) * rOut * S * scale +
                Math.cos(a0 + scatterA) * sc,
              y:
                cy +
                oy +
                Math.sin(a0) * rOut * S * scale * 0.72 +
                Math.sin(a0) * sc * 0.5,
            };
            const p1 = {
              x: cx + ox + Math.cos(a1) * rOut * S * scale,
              y: cy + oy + Math.sin(a1) * rOut * S * scale * 0.72,
            };
            const p2 = {
              x: cx + ox + Math.cos(a1) * rIn * S * scale,
              y: cy + oy + Math.sin(a1) * rIn * S * scale * 0.72,
            };
            const p3 = {
              x: cx + ox + Math.cos(a0) * rIn * S * scale,
              y: cy + oy + Math.sin(a0) * rIn * S * scale * 0.72,
            };
            g.moveTo(p0.x, p0.y);
            g.lineTo(p1.x, p1.y);
            g.lineTo(p2.x, p2.y);
            g.lineTo(p3.x, p3.y);
            g.closePath();
            // Stagger assembly for hexagon
            if (settle > i / parts - 0.05 || assembly === "scaleUnfold") {
              paintPath(mode);
            }
          }
        } else if (shape === "stackedPyramid") {
          // Three stacked isometric diamonds (levels)
          const levels = [
            { y: 0.55, s: 0.55 },
            { y: 0.15, s: 0.78 },
            { y: -0.35, s: 1 },
          ];
          for (let li = 0; li < levels.length; li++) {
            const L = levels[li]!;
            const delay = li * 0.12;
            const local = Math.max(0, Math.min(1, (settle - delay) / (1 - delay)));
            const scN = local;
            const jump =
              assembly === "scattered"
                ? (1 - local) * (li - 1) * S * 0.4
                : 0;
            const mode = applyMaterial(true);
            const s = L.s * scN;
            const y0 = L.y;
            const pts = [
              iso(-s + jump * 0.01, y0, -s),
              iso(s + jump * 0.01, y0, -s),
              iso(s + jump * 0.01, y0, s),
              iso(-s + jump * 0.01, y0, s),
            ];
            g.beginPath();
            g.moveTo(pts[0]!.x + jump, pts[0]!.y);
            g.lineTo(pts[1]!.x + jump, pts[1]!.y);
            g.lineTo(pts[2]!.x + jump, pts[2]!.y);
            g.lineTo(pts[3]!.x + jump, pts[3]!.y);
            g.closePath();
            paintPath(mode);
            // Apex edge for top level
            if (li === 0) {
              const apex = iso(0, y0 - 0.55 * scN, 0);
              g.beginPath();
              g.moveTo(pts[0]!.x + jump, pts[0]!.y);
              g.lineTo(apex.x + jump, apex.y);
              g.lineTo(pts[1]!.x + jump, pts[1]!.y);
              paintPath(applyMaterial(false));
            }
          }
        } else {
          // isometricBlock — classic cube with three faces
          const u = 0.72;
          const face = (
            pts: { x: number; y: number }[],
            shade: number,
          ) => {
            g.save();
            // scatter per face
            if (assembly === "scattered") {
              const f = (1 - settle) * S * 0.5 * (shade + 0.2);
              g.translate(f * (shade - 0.5), -f * 0.3);
            }
            const mode = applyMaterial(true);
            if (material === "matte") {
              g.globalAlpha = 0.55 + shade * 0.4;
            }
            g.beginPath();
            g.moveTo(pts[0]!.x, pts[0]!.y);
            for (let i = 1; i < pts.length; i++) {
              g.lineTo(pts[i]!.x, pts[i]!.y);
            }
            g.closePath();
            paintPath(mode);
            g.restore();
          };

          const T = [
            iso(-u, -u, -u),
            iso(u, -u, -u),
            iso(u, -u, u),
            iso(-u, -u, u),
          ];
          const R = [
            iso(u, -u, -u),
            iso(u, u, -u),
            iso(u, u, u),
            iso(u, -u, u),
          ];
          const L = [
            iso(-u, -u, -u),
            iso(-u, u, -u),
            iso(u, u, -u),
            iso(u, -u, -u),
          ];
          // Draw order back → front (left, right, top)
          if (settle > 0.15 || assembly === "scaleUnfold") face(L, 0.25);
          if (settle > 0.3 || assembly === "scaleUnfold") face(R, 0.55);
          if (settle > 0.45 || assembly === "scaleUnfold") face(T, 0.9);
        }

        g.restore();
        g.globalAlpha = 1;

        // Wordmark
        g.save();
        g.fillStyle = ink;
        g.globalAlpha = 0.35 + 0.55 * settle;
        const fs = Math.max(14, Math.floor(w * 0.07));
        g.font = `700 ${fs}px system-ui, -apple-system, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(title, w * 0.5, h * 0.82, w * 0.8);
        g.restore();

        // Axis legend (makes multi-enum playability obvious in Studio)
        g.save();
        g.globalAlpha = 0.4;
        g.fillStyle = ink;
        g.font = `500 ${Math.max(9, Math.floor(w * 0.028))}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.fillText(
          `${shape} · ${assembly} · ${material}`,
          w * 0.5,
          h * 0.9,
          w * 0.9,
        );
        g.restore();
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
