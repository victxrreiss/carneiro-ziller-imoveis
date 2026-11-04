import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/painel", "/api"] },
    sitemap: `${urlDoSite()}/sitemap.xml`,
  };
}
