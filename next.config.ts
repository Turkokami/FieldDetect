import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.uploadthing.com" },
      { protocol: "https", hostname: "*.utfs.io" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@react-pdf/renderer"],
  },
};

export default nextConfig;
