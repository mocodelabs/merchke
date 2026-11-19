"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { vendorApi } from "@/lib/api";
import { mediaUrl } from "@/lib/config";

const TYPE_TABS = [
  { label: "All", value: "" },
  { label: "Artists", value: "artist" },
  { label: "DJs", value: "dj" },
  { label: "Creatives", value: "creative" },
  { label: "Jersey Vendors", value: "jersey" },
  { label: "Local Brands", value: "brand" },
  { label: "Event Organizers", value: "events" },
  { label: "Digital", value: "digital" },
];

const TYPE_EMOJI: Record<string, string> = {
  artist: "🎨", dj: "🎧", creative: "🎭",
  jersey: "👕", brand: "🏷️", events: "🎟️", digital: "📲",
};
const TYPE_LABEL: Record<string, string> = {
  artist: "Artist / Musician", dj: "DJ", creative: "Creative",
  jersey: "Jersey Vendor", brand: "Local Brand", events: "Event Organizer", digital: "Digital",
};

type Vendor = {
  id: number; brand_name: string; vendor_type: string; slug: string;
  bio: string; tagline: string; location: string; county: string;
  logo: string | null;
  is_verified: boolean; average_rating: number; total_reviews: number;
  products_count: number;
};


export default function VendorsPage() {
  const [activeType, setActiveType] = useState("");
  const [search, setSearch] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const delay = search ? 400 : 0;
    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (activeType) params.type = activeType;
        if (search.trim()) params.search = search.trim();
        const res = await vendorApi.list(params);
        setVendors(res.data as Vendor[]);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "CanceledError") console.error(err);
      } finally {
        setLoading(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [activeType, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Browse Vendors</h1>
        <p className="text-gray-500">
          {loading ? "Loading…" : `${vendors.length} creator${vendors.length !== 1 ? "s" : ""} on Merchke`}
        </p>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors, artists, brands…"
          className="bg-transparent outline-none flex-1 text-gray-300 placeholder-gray-600"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-gray-600 hover:text-gray-400">✕</button>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveType(t.value)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={
              activeType === t.value
                ? { background: "var(--primary)", color: "#fff" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl animate-pulse"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl skeleton shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-3/4 skeleton rounded" />
                  <div className="h-3 w-1/3 skeleton rounded" />
                </div>
              </div>
              <div className="h-3 w-full skeleton rounded mb-2" />
              <div className="h-3 w-2/3 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : vendors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {vendors.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-gray-600">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="font-semibold text-white mb-1">No vendors found</p>
          <p className="text-sm">Try a different search or category</p>
        </div>
      )}
    </div>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const emoji = TYPE_EMOJI[vendor.vendor_type] ?? "🏪";
  const typeLabel = TYPE_LABEL[vendor.vendor_type] ?? "Vendor";
  const location = [vendor.location, vendor.county].filter(Boolean).join(", ");

  return (
    <Link href={`/vendors/${vendor.slug}`} className="block group">
      <div
        className="p-5 rounded-2xl h-full transition-colors group-hover:border-orange-500/40"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex gap-4 mb-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            {vendor.logo ? (
              <img src={mediaUrl(vendor.logo)} alt={vendor.brand_name} className="w-full h-full object-cover" />
            ) : (
              <span>{emoji}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-bold text-white text-sm truncate">{vendor.brand_name}</span>
              {vendor.is_verified && (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--accent)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <span
              className="inline-block text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
            >
              {typeLabel}
            </span>
          </div>
        </div>

        {(vendor.tagline || vendor.bio) && (
          <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">
            {vendor.tagline || vendor.bio}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-2">
          <div className="flex items-center gap-3">
            <span>{vendor.products_count} product{vendor.products_count !== 1 ? "s" : ""}</span>
            {vendor.average_rating > 0 && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="#f97316" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {vendor.average_rating.toFixed(1)}
              </span>
            )}
            {location && <span className="truncate max-w-[100px]">{location}</span>}
          </div>
          <span className="font-semibold transition-colors group-hover:text-orange-400" style={{ color: "var(--primary)" }}>
            Visit →
          </span>
        </div>
      </div>
    </Link>
  );
}
