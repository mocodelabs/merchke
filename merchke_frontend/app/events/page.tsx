"use client";
import { Suspense } from "react";
import BannerAd from "@/components/BannerAd";
import EventCard, { EVENT_CATEGORIES } from "@/components/EventCard";
import { EmptyState, ErrorState, FilterChips, PageHeader, SearchBar, SkeletonGrid, inputClass, inputStyle } from "@/components/ui";
import { eventApi } from "@/lib/api";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { useFetch } from "@/lib/useFetch";
import type { MerchEvent } from "@/lib/types";

const CITIES = ["", "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Naivasha", "Nanyuki", "Diani"];
const FILTER_KEYS = ["search", "category", "city", "date_from", "date_to"] as const;

function EventsContent() {
  const { values, setFilter, apiParams } = useUrlFilters(FILTER_KEYS);
  const { data: events, loading, error, reload } = useFetch<MerchEvent[]>(() => eventApi.list(apiParams), JSON.stringify(apiParams), [], "Couldn't load events. Check your connection.");

  const hasFilters = Object.keys(apiParams).length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHeader
        title="Upcoming Events 🎟️"
        subtitle={loading ? "Loading…" : `${events.length} event${events.length !== 1 ? "s" : ""} across Kenya`}
      />

      <div className="space-y-4 mb-6">
        <SearchBar value={values.search} onSearch={(q) => setFilter("search", q)} placeholder="Search events, artists, venues…" />
        <FilterChips
          label="Event category"
          options={EVENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.icon }))}
          value={values.category as (typeof EVENT_CATEGORIES)[number]["value"]}
          onChange={(v) => setFilter("category", v)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select aria-label="City" value={values.city} onChange={(e) => setFilter("city", e.target.value)} className={inputClass} style={inputStyle}>
            {CITIES.map((c) => <option key={c} value={c}>{c || "All cities"}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <span className="shrink-0 w-10">From</span>
            <input type="date" value={values.date_from} onChange={(e) => setFilter("date_from", e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <span className="shrink-0 w-10">To</span>
            <input type="date" value={values.date_to} onChange={(e) => setFilter("date_to", e.target.value)} className={inputClass} style={inputStyle} />
          </label>
        </div>
      </div>

      <div className="mb-6"><BannerAd page="events" /></div>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : events.length === 0 ? (
        <EmptyState
          icon="🎟️"
          title={hasFilters ? "No events match those filters" : "No upcoming events yet"}
          body={hasFilters ? "Try another city, category or date." : "Organizers are adding new shows all the time — check back soon."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e, i) => <EventCard key={e.id} event={e} priority={i < 3} />)}
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><SkeletonGrid /></div>}>
      <EventsContent />
    </Suspense>
  );
}
