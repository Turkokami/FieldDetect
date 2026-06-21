import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FieldDetect",
    short_name: "FieldDetect",
    description: "K9 Inspection Field App",
    start_url: "/field",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0F1A",
    theme_color: "#0ABAB5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["business", "productivity"],
  };
}
