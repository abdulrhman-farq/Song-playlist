import type { MetadataRoute } from "next";

/* Web App Manifest — served as /manifest.webmanifest by Next 16.
   Keeps the wedding-day install experience consistent across Chrome
   (Android install prompt), Edge (window-controls-overlay PWA), and
   iOS Safari "Add to Home Screen" (icons + theme colour). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruwaida's Wedding · رويـدا و عبدالرحمن",
    short_name: "R & A Wedding",
    description:
      "A wedding playlist for Ruwaida & Abdulrahman · Friday 29 May 2026",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#050505",
    theme_color: "#050505",
    orientation: "portrait",
    lang: "en",
    dir: "auto",
    categories: ["music", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
