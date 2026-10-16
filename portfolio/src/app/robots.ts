import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // /api itself is the docs page; only the JSON endpoints under it are kept out of search.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/v1/", "/api/health"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
