import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server runtime (was "export"): the app now serves a public API under
  // /api/v1 alongside the site, which a static export cannot do. Emits a
  // self-contained .next/standalone bundle for the Node runtime image.
  output: "standalone",
  // Compression is handled at the Traefik edge (compress Middleware, br/zstd/
  // gzip by preference). Next's built-in gzip runs first at the origin and,
  // because a proxy won't re-encode an already-compressed response, would pin
  // every client that accepts gzip to gzip and starve brotli. Off here so the
  // edge picks the smallest encoding.
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
