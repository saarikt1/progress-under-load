import type { NextConfig } from "next";

import { getSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  async headers() {
    return getSecurityHeaders();
  },
};

export default nextConfig;
