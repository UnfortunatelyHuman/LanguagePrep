import type { MetadataRoute } from "next";

/** Lets "Add to Home Screen" open the app full-screen, like an installed app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PR Language Prep",
    short_name: "Lang Prep",
    description: "CELPIP and TCF Canada practice for Express Entry.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f8",
    theme_color: "#1e5bc6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
