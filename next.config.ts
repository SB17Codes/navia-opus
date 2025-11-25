import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
       {protocol: "https",
        hostname: "different-spaniel-95.convex.cloud"}
    ],
  }
};

export default nextConfig;
