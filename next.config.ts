import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // The dashboard always lives under a track, so "/" picks the English one.
    return [{ source: "/", destination: "/en", permanent: false }];
  },
  turbopack: {
    // Pin the root to this project; otherwise Turbopack walks up and finds a
    // stray lockfile in the home directory.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
