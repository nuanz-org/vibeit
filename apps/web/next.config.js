/** @type {import('next').NextConfig} */
const nextConfig = {
  // Source workspace packages need transpilation; avoid .js→.ts resolution issues.
  transpilePackages: ["@repo/contracts", "@repo/ui"],
};

export default nextConfig;
