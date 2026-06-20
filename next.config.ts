import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fullcalendar/core",
    "@fullcalendar/react",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.uploadthing.com" },
      { protocol: "https", hostname: "*.utfs.io" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
