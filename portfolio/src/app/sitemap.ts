import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { getAllWork } from "@/lib/work";

export const dynamic = "force-static";

// trailingSlash is on, so every entry needs the slash the site actually
// serves or the sitemap points at a redirect. /brand is deliberately absent:
// it is noindex, and a sitemap lists only indexable URLs.
const STATIC_PATHS = ["/fun/", "/api/", "/infrastructure/"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${site.url}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 1,
    },
    ...getAllWork().map((w) => ({
      url: `${site.url}/work/${w.slug}/`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
    ...STATIC_PATHS.map((p) => ({
      url: `${site.url}${p}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
