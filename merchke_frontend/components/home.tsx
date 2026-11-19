"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { adApi, eventApi } from "@/lib/api";
import { apiUrl, formatDateTime, formatKES, mediaUrl } from "@/lib/config";
import type { Ad, EventAd, MerchEvent } from "@/lib/types";

/**
 * Featured events carousel: paid boosts first, then events flagged featured.
 * Server-rendered events are passed in; paid boosts are fetched client-side so each view counts.
 */
export function FeaturedEventsCarousel({ events }: { events: MerchEvent[] }) {
  const [boosts, setBoosts] = useState<EventAd[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    eventApi.featuredAds().then((r) => setBoosts(r.data as EventAd[])).catch(() => {});
  }, []);

  const boostedSlugs = new Set(boosts.map((b) => b.event_slug));
  const boostCopy = new Map(boosts.map((b) => [b.event_slug, b]));
  const ordered = [
    ...events.filter((e) => boostedSlugs.has(e.slug)),
    ...events.filter((e) => !boostedSlugs.has(e.slug)),
  ].slice(0, 8);

  if (ordered.length === 0) return null;

  const scroll = (dir: 1 | -1) => trackRef.current?.scrollBy({ left: dir * trackRef.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <section className="py-12 max-w-7xl mx-auto px-4" aria-label="Featured events">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Featured Events 🔥</h2>
          <p className="text-sm text-gray-500 mt-1">The hottest shows, matches and parties in Kenya</p>
        </div>
        <div className="hidden sm:flex gap-2">
          {([-1, 1] as const).map((d) => (
            <button key={d} onClick={() => scroll(d)} aria-label={d < 0 ? "Previous" : "Next"}
              className="w-10 h-10 rounded-full text-white" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {d < 0 ? "‹" : "›"}
            </button>
          ))}
        </div>
      </div>
      <div ref={trackRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
        {ordered.map((e, i) => {
          const boost = boostCopy.get(e.slug);
          const img = boost?.ad_image || e.banner_image;
          return (
            <Link key={e.id} href={`/events/${e.slug}`}
              className="snap-start shrink-0 w-[85%] sm:w-[48%] lg:w-[32%] relative aspect-[4/3] rounded-3xl overflow-hidden group"
              style={{ background: "var(--surface)" }}>
              {img && <Image src={mediaUrl(img)} alt={e.title} fill priority={i === 0} sizes="(max-width: 640px) 85vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.1) 60%)" }} />
              {boost && <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ background: "var(--primary)" }}>PROMOTED</span>}
              <div className="absolute bottom-0 inset-x-0 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--primary)" }}>{e.category_display}</p>
                <h3 className="text-lg font-black text-white leading-tight line-clamp-2">{e.title}</h3>
                <p className="text-xs text-gray-300 mt-1">{formatDateTime(e.start_datetime)} · {e.town}</p>
                {boost?.ad_copy && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{boost.ad_copy}</p>}
                <p className="text-sm font-bold mt-2" style={{ color: "var(--accent)" }}>
                  {e.min_price == null ? "Tickets soon" : Number(e.min_price) === 0 ? "Free entry" : `From ${formatKES(e.min_price)}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Paid homepage spotlight ads. Hidden when nobody has bought one. */
export function SpotlightAds() {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    adApi.serve({ page: "home", ad_type: "homepage_spotlight", limit: "3" }).then((r) => setAds(r.data)).catch(() => {});
  }, []);

  if (ads.length === 0) return null;

  return (
    <section className="py-8 max-w-7xl mx-auto px-4" aria-label="Spotlight">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Spotlight</p>
      <div className={`grid gap-4 ${ads.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : ""}`}>
        {ads.map((ad) => (
          <a key={ad.id} href={apiUrl(ad.click_url)} rel="sponsored noopener"
            className="group relative block aspect-[16/9] rounded-3xl overflow-hidden" style={{ background: "var(--surface)" }}>
            <Image src={mediaUrl(ad.image)} alt={ad.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 65%)" }} />
            <div className="absolute bottom-0 p-5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Sponsored · {ad.vendor_name}</p>
              <h3 className="text-xl font-black text-white">{ad.title}</h3>
              {ad.tagline && <p className="text-sm text-gray-300 line-clamp-1">{ad.tagline}</p>}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
