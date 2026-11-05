import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // src/proxy.ts buffers request bodies (10 MB by default, silently truncated
    // beyond). Speaking uploads may be up to 40 MB (see the speaking route).
    proxyClientMaxBodySize: "41mb",
  },
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
