import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM; bundling it breaks instantiateWasm at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
