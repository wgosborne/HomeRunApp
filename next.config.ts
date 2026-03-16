import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // Enable Turbopack with default config
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default config;
