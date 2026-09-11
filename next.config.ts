import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives inside a larger repo; pin the workspace root explicitly.
  turbopack: { root: __dirname },
  serverExternalPackages: ["node:sqlite"],
};

export default nextConfig;
