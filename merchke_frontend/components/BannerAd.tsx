"use client";
import { useEffect, useState } from "react";
import { adApi } from "@/lib/api";
import { apiUrl, mediaUrl } from "@/lib/config";
import type { Ad } from "@/lib/types";

/** One paid banner for a category page. Renders nothing when no ad is live. */
export default function BannerAd({ page }: { page: string }) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    adApi.serve({ page, ad_type: "banner", limit: "1" })
      .then((res) => setAd(res.data[0] ?? null))
      .catch(() => setAd(null));
  }, [page]);

  if (!ad) return null;

  return (
    <a
      href={apiUrl(ad.click_url)}
      rel="sponsored noopener"
      className="group relative flex items-center gap-4 rounded-2xl overflow-hidden p-3 sm:p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(ad.image)} alt="" loading="lazy" className="w-20 h-20 sm:w-28 sm:h-20 rounded-xl object-cover shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Sponsored · {ad.vendor_name}</p>
        <p className="text-sm sm:text-base font-bold text-white truncate group-hover:text-orange-400 transition-colors">{ad.title}</p>
        {ad.tagline && <p className="text-xs text-gray-500 line-clamp-2">{ad.tagline}</p>}
      </div>
      <span className="hidden sm:inline text-xs font-semibold shrink-0" style={{ color: "var(--primary)" }}>Check it out →</span>
    </a>
  );
}
