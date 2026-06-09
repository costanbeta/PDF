import type { MetadataRoute } from "next";
import { allTools } from "@/lib/tools";
import { BASE_SITE_URL } from "@/lib/seo-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [
    {
      url: BASE_SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...allTools
      .filter((t) => t.implemented)
      .map((tool) => ({
        url: `${BASE_SITE_URL}${tool.href}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
  ];

  return routes;
}
