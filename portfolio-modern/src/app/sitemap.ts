import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { services } from "@/content/services";
import { getAllWork } from "@/lib/work";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/work",
    "/services",
    "/resume",
    "/about",
  ].map((p) => ({
    url: `${base}${p}/`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const work = getAllWork().map((w) => ({
    url: `${base}/work/${w.slug}/`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  const svc = services.map((s) => ({
    url: `${base}/services/${s.slug}/`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...work, ...svc];
}
