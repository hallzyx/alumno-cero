import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // imagen de Docker pequeña (ver Dockerfile)
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  async headers() {
    return [
      // The service worker must never be cached by the browser, so updates reach everyone.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
