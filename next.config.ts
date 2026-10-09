import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fullcalendar/core",
    "@fullcalendar/react",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
  ],
  // Public estimate pages are private links: keep them out of search engines.
  async headers() {
    return [
      { source: "/e/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/public/estimates/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.uploadthing.com" },
      { protocol: "https", hostname: "*.utfs.io" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
