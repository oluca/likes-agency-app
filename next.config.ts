import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server build for the Docker image.
  output: "standalone",
  experimental: {
    // proxy.ts runs on /api/*, so Next buffers request bodies (default cap 10MB).
    // /api/jobs streams large multipart uploads upstream, so raise the cap.
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
