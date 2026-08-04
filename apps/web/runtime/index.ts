/**
 * Vibeit tool runtime subsystem (M2a).
 *
 * Layout (frontend-architecture.md):
 * - contract/  — postMessage protocol (M2a1 ✅)
 * - host/      — sandboxed iframe host (M2a2 ✅)
 * - targets/   — canvas2d in-frame adapter (M2a3 ✅; bundled into runtime-frame.js)
 * - frame/     — frame entry source for esbuild
 * - capture/   — frame/stream helpers (M2a6 / M7)
 *
 * Studio and export import host/contract from here.
 * Frame adapter is not re-exported (sandbox-only; see runtime/frame/entry.ts).
 */

export * from "./contract";
export * from "./host";
export * from "./capture";
