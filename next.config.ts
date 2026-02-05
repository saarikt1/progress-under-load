import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import { getSecurityHeaders } from "./src/lib/security-headers";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  async headers() {
    return getSecurityHeaders();
  },
};

export default nextConfig;
