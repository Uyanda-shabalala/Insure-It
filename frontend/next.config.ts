import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  async rewrites() {
    const backendOrigin = (
      process.env.API_BACKEND_ORIGIN?.trim() ||
      process.env.OCR_BACKEND_ORIGIN?.trim() ||
      "http://127.0.0.1:8080"
    ).replace(/\/$/, "");
    const ocrOrigin = (
      process.env.OCR_BACKEND_ORIGIN?.trim() || backendOrigin
    ).replace(/\/$/, "");
    return [
      {
        source: "/api/ocr/serial-number",
        destination: `${ocrOrigin}/api/ocr/serial-number`,
      },
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
    ];
  },
};

export default nextConfig;
