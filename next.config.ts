import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  /* config options here */
  devIndicators:{
    position:'bottom-left',
  }
};

export default nextConfig;
