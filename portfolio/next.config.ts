import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server runtime (was "export"): the app now serves a public API under
  // /api/v1 alongside the site, which a static export cannot do. Emits a
  // self-contained .next/standalone bundle for the Node runtime image.
  output: "standalone",
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
  // Security headers + asset caching used to live in nginx (nginx/*.conf).
  // With the Node runtime they move here so the posture is unchanged.
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
        // Long-cache the immutable static assets shipped by the build.
        source: "/:path*.:ext(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|pdf)",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
      {
        // Non-hashed metadata files: a safe 1-day ceiling.
        source: "/:path*.:ext(xml|txt|webmanifest)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
  // www -> apex, previously handled by an nginx server block.
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
