import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    // local art may carry a cache-busting query (?v=N) so replaced assets
    // (new crops, swapped portraits) reach players without a hard refresh;
    // omitting `search` allows any query string on these paths
    localPatterns: [
      { pathname: "/portraits/**" },
      { pathname: "/scenes/**" },
    ],
  },
  // Cloud-tight caching: world art and ambience are content-addressed by the
  // ?v= cache-buster, so they can be cached forever — a returning player
  // re-validates nothing and the game paints from disk in milliseconds.
  async headers() {
    return [
      {
        source: "/portraits/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/scenes/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/music/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
