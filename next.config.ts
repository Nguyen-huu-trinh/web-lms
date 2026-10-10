import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reuse visited/prefetched pages for 30 minutes, including catalog return links.
  // Completion, favorites and CRUD actions still invalidate affected routes.
  experimental: { staleTimes: { dynamic: 1800, static: 1800 } },
};

export default nextConfig;
