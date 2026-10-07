import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reuse page snapshots for five minutes. Completion/CRUD actions invalidate affected routes.
  experimental: { staleTimes: { dynamic: 300, static: 300 } },
};

export default nextConfig;
