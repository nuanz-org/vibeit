/** @type {import('next').NextConfig} */
const nextConfig = {
  // Source workspace packages need transpilation; avoid .js→.ts resolution issues.
  transpilePackages: ["@repo/contracts", "@repo/ui"],
  // esbuild is a native server dependency used by /api/runtime/compile
  serverExternalPackages: ["esbuild"],
  /**
   * Sandboxed runtime iframe uses sandbox="allow-scripts" without allow-same-origin,
   * so its origin is opaque ("null"). runtime-frame.html loads the adapter as
   * <script type="module" src="/runtime-frame.js"> — module scripts require CORS.
   * Without ACAO, the browser blocks the JS (ERR_FAILED 200) and READY never fires.
   */
  async headers() {
    return [
      {
        source: "/runtime-frame.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
