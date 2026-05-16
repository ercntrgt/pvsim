import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Coolify / Docker standalone deployment described in
  // pvsim-prompt.md (Dockerfile copies .next/standalone).
  output: "standalone",
  outputFileTracingRoot: __dirname,
  experimental: {
    // @react-pdf/renderer and plotly are large; keep them server-only.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
