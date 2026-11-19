import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { fetchList } from "@/lib/server";
import type { Job, MerchEvent, Podcast, Product } from "@/lib/types";

export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, freq: "daily" },
  { path: "/store", priority: 0.9, freq: "daily" },
  { path: "/events", priority: 0.9, freq: "daily" },
  { path: "/football", priority: 0.8, freq: "daily" },
  { path: "/hire", priority: 0.8, freq: "daily" },
  { path: "/jobs", priority: 0.8, freq: "daily" },
  { path: "/podcasts", priority: 0.7, freq: "weekly" },
  { path: "/vendors", priority: 0.7, freq: "weekly" },
  { path: "/digital", priority: 0.7, freq: "weekly" },
  { path: "/sell", priority: 0.6, freq: "monthly" },
  { path: "/how-it-works", priority: 0.5, freq: "monthly" },
  { path: "/buyer-protection", priority: 0.5, freq: "monthly" },
  { path: "/help", priority: 0.4, freq: "monthly" },
  { path: "/contact", priority: 0.3, freq: "yearly" },
  { path: "/shipping", priority: 0.3, freq: "yearly" },
  { path: "/returns", priority: 0.3, freq: "yearly" },
  { path: "/terms", priority: 0.2, freq: "yearly" },
  { path: "/privacy", priority: 0.2, freq: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, products, jobs, podcasts, vendors] = await Promise.all([
    fetchList<MerchEvent>("/events/", 3600),
    fetchList<Product>("/products/", 3600),
    fetchList<Job>("/jobs/", 3600),
    fetchList<Podcast>("/podcasts/", 3600),
    fetchList<{ slug: string; updated_at: string }>("/vendors/", 3600),
  ]);

  return [
    ...STATIC_ROUTES.map((r) => ({ url: `${SITE_URL}${r.path}`, changeFrequency: r.freq, priority: r.priority })),
    ...SERVICE_CATEGORIES.map((c) => ({ url: `${SITE_URL}/hire/${c.value}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...events.map((e) => ({ url: `${SITE_URL}/events/${e.slug}`, lastModified: e.created_at, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${SITE_URL}/products/${p.id}`, lastModified: p.created_at, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...jobs.map((j) => ({ url: `${SITE_URL}/jobs/${j.id}`, lastModified: j.created_at, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...podcasts.map((p) => ({ url: `${SITE_URL}/podcasts/${p.slug}`, lastModified: p.created_at, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...vendors.filter((v) => v.slug).map((v) => ({ url: `${SITE_URL}/vendors/${v.slug}`, lastModified: v.updated_at, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
