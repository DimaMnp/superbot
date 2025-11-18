import type { NextConfig } from "next";

const nextConfig = {
  // output: 'standalone', // пока закомментируйте для теста
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

export default nextConfig;
