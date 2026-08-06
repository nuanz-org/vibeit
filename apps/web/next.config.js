/** @type {import('next').NextConfig} */
const nextConfig = {
  // Source workspace packages need transpilation; avoid .js→.ts resolution issues.
  transpilePackages: ["@repo/contracts", "@repo/ui"],
  // esbuild is a native server dependency used by /api/runtime/compile
  serverExternalPackages: ["esbuild"],
};

export default nextConfig;
