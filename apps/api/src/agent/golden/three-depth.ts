/**
 * Golden: three-depth (AM6).
 * Hand-authored three-style WebGL tool — animated triangle + depth clear.
 */
import { createThreeTool } from "@repo/contracts/skeletons/three";

function hexToRgb01(hex: string): [number, number, number] {
  let h = String(hex || "").trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) return [0.04, 0.04, 0.07];
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return [0.04, 0.04, 0.07];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

let _program: WebGLProgram | null = null;
let _buf: WebGLBuffer | null = null;

function ensureProgram(gl: WebGLRenderingContext): void {
  if (_program) return;
  const vsSrc = `
    attribute vec2 a_pos;
    uniform float u_time;
    uniform float u_aspect;
    varying float v_d;
    void main() {
      float s = 0.42 + 0.12 * sin(u_time * 2.0);
      vec2 p = a_pos * s;
      p.x /= max(u_aspect, 0.01);
      v_d = length(a_pos);
      gl_Position = vec4(p, 0.0, 1.0);
    }
  `;
  const fsSrc = `
    precision mediump float;
    uniform vec3 u_accent;
    uniform vec3 u_ink;
    varying float v_d;
    void main() {
      float a = smoothstep(1.05, 0.15, v_d);
      vec3 col = mix(u_ink, u_accent, a);
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  _program = gl.createProgram()!;
  gl.attachShader(_program, vs);
  gl.attachShader(_program, fs);
  gl.linkProgram(_program);
  const verts = new Float32Array([0, 1, -0.866, -0.5, 0.866, -0.5]);
  _buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
}

export const createTool = () =>
  createThreeTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", label: "Background", default: "#0a0a12" },
        { name: "accent", kind: "color", label: "Accent", default: "#7c5cff" },
        { name: "ink", kind: "color", label: "Rim", default: "#f0eaff" },
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
          name: "intensity",
          kind: "number",
          label: "Intensity",
          default: 0.7,
          min: 0,
          max: 1.5,
          step: 0.05,
        },
      ],
      getDefaultParams: () => ({
        bg: "#0a0a12",
        accent: "#7c5cff",
        ink: "#f0eaff",
        speed: 1,
        intensity: 0.7,
      }),
      getAssetSlots: () => [],
      draw(c) {
        const gl = c.gl;
        const bg = hexToRgb01(String(c.params.bg ?? "#0a0a12"));
        const accent = hexToRgb01(String(c.params.accent ?? "#7c5cff"));
        const ink = hexToRgb01(String(c.params.ink ?? "#f0eaff"));
        const speed = Number(c.params.speed ?? 1);
        const intensity = Number(c.params.intensity ?? 0.7);
        c.clear(bg[0], bg[1], bg[2], 1);
        ensureProgram(gl);
        if (!_program || !_buf) return;
        gl.useProgram(_program);
        const aPos = gl.getAttribLocation(_program, "a_pos");
        gl.bindBuffer(gl.ARRAY_BUFFER, _buf);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(
          gl.getUniformLocation(_program, "u_time"),
          c.time * speed * (0.5 + intensity),
        );
        gl.uniform1f(
          gl.getUniformLocation(_program, "u_aspect"),
          c.height > 0 ? c.width / c.height : 1,
        );
        gl.uniform3f(
          gl.getUniformLocation(_program, "u_accent"),
          accent[0],
          accent[1],
          accent[2],
        );
        gl.uniform3f(
          gl.getUniformLocation(_program, "u_ink"),
          ink[0],
          ink[1],
          ink[2],
        );
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose() {
        _program = null;
        _buf = null;
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
