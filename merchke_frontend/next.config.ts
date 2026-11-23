import type { NextConfig } from "next";

// Allow next/image to load media from the API host (and Cloudinary in production).
function apiImageHost() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_URL || "");
    return [{ protocol: url.protocol.replace(":", "") as "http" | "https", hostname: url.hostname, port: url.port }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...apiImageHost(),
      { protocol: "https", hostname: "merchke.onrender.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    // The local Django dev server is on a private address the optimizer refuses to fetch.
    unoptimized: process.env.NODE_ENV !== "production",
  },
};

export default nextConfig;
