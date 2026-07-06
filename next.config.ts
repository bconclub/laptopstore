import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // A stray package-lock.json exists in the user home dir; pin the root here.
    root: path.join(__dirname),
  },
  images: {
    qualities: [75, 90, 95],
  },
};

export default nextConfig;
