import type { NextConfig } from "next";
import { pdfFilename } from "./src/lib/download-name";

const nextConfig: NextConfig = {
  // Server runtime: /api/v1 needs what a static export cannot do.
  output: "standalone",
  // Off: Traefik compresses at the edge. Origin gzip would pin every
  // gzip-accepting client to gzip and starve brotli/zstd.
  compress: false,
  // Pages keep trailing slashes for stable canonical URLs; the redirect is
  // skipped so API clients hitting /api/v1/profile aren't 308'd to a slash.
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  // No nginx in front — security headers and asset caching live here.
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
      { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ];
    return [
      { source: "/:path*", headers: security },
      {
        // Long-cache immutable build assets. gltf/bin must stay in the list
        // or the fun room's models fall back to the edge's short default.
        source:
          "/:path*.:ext(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|pdf|gltf|bin)",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
      {
        // Authoritative download name: the header beats `a.download` and also
        // covers direct opens, so nobody files a `cv-1111.pdf`. The \d{4}
        // pattern (skills/clientProjects/homeLab/photo bits) keeps
        // /cv-manifest.json out of this rule.
        source: "/cv-:flags(\\d{4}).pdf",
        headers: [
          { key: "Content-Disposition", value: `attachment; filename="${pdfFilename(false)}"` },
        ],
      },
      {
        source: "/resume.pdf",
        headers: [
          { key: "Content-Disposition", value: `attachment; filename="${pdfFilename(true)}"` },
        ],
      },
      {
        // Non-hashed metadata files: a safe 1-day ceiling.
        source: "/:path*.:ext(xml|txt|webmanifest)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
  // www -> apex.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.nordbye.it" }],
        destination: "https://nordbye.it/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
