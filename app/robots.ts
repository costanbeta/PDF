import type { MetadataRoute } from "next";
import { BASE_SITE_URL } from "@/lib/seo-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${BASE_SITE_URL}/sitemap.xml`,
  };
}
