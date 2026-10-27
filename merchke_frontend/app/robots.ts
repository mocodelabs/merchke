import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/checkout", "/cart", "/orders", "/onboarding", "/wishlist"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
