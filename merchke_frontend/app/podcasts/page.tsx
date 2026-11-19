"use client";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import BannerAd from "@/components/BannerAd";
import { EmptyState, ErrorState, FilterChips, PageHeader, SearchBar, SkeletonGrid } from "@/components/ui";
import { podcastApi } from "@/lib/api";
import { mediaUrl } from "@/lib/config";
import { PODCAST_CATEGORIES } from "@/lib/constants";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { useFetch } from "@/lib/useFetch";
import type { Podcast } from "@/lib/types";

const FILTER_KEYS = ["search", "category"] as const;

function PodcastsContent() {
  const { values, setFilter, apiParams } = useUrlFilters(FILTER_KEYS);
  const { data: podcasts, loading, error, reload } = useFetch<Podcast[]>(() => podcastApi.list(apiParams), JSON.stringify(apiParams), [], "Couldn't load podcasts.");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHeader title="Podcasts 🎙️" subtitle="Kenyan voices on music, comedy, sport, hustle and culture." />
      <div className="space-y-4 mb-6">
        <SearchBar value={values.search} onSearch={(q) => setFilter("search", q)} placeholder="Search shows and hosts…" />
        <FilterChips label="Podcast category" options={PODCAST_CATEGORIES} value={values.category} onChange={(v) => setFilter("category", v)} />
      </div>
      <div className="mb-6"><BannerAd page="podcasts" /></div>

      {loading ? (
        <SkeletonGrid count={8} className="h-64" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : podcasts.length === 0 ? (
        <EmptyState icon="🎧" title="No podcasts here yet" body="Host a show? Add it from your seller dashboard — upload MP3s or link Spotify." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {podcasts.map((p) => (
            <Link key={p.id} href={`/podcasts/${p.slug}`} className="group block rounded-2xl overflow-hidden card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="relative aspect-square" style={{ background: "var(--surface-2)" }}>
                {p.cover_image && <Image src={mediaUrl(p.cover_image)} alt={p.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />}
                <span className="absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "var(--primary)" }} aria-hidden>▶</span>
              </div>
              <div className="p-3">
                <h2 className="text-sm font-bold text-white line-clamp-1 group-hover:text-orange-400">{p.title}</h2>
                <p className="text-xs text-gray-500 truncate">{p.vendor_name}</p>
                <p className="text-[11px] text-gray-600 mt-1">{p.category_display} · {p.episodes_count} episode{p.episodes_count !== 1 ? "s" : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PodcastsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><SkeletonGrid /></div>}>
      <PodcastsContent />
    </Suspense>
  );
}
