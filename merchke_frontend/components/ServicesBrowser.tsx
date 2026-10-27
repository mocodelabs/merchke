"use client";
import { useState } from "react";
import BannerAd from "@/components/BannerAd";
import { BookingModal, ServiceCard } from "@/components/hire";
import { EmptyState, ErrorState, FilterChips, SearchBar, SkeletonGrid, inputClass, inputStyle } from "@/components/ui";
import { serviceApi } from "@/lib/api";
import { KENYAN_CITIES, PROP_TYPES, SERVICE_CATEGORIES } from "@/lib/constants";
import { useFetch } from "@/lib/useFetch";
import { useUrlFilters } from "@/lib/useUrlFilters";
import type { Service } from "@/lib/types";

const FILTER_KEYS = ["search", "category", "city", "prop_type"] as const;

/**
 * Service listings with search + filters. With `fixedCategory` (the /hire/[category] page)
 * the category tabs become links instead of filters.
 */
export default function ServicesBrowser({ fixedCategory }: { fixedCategory?: string }) {
  const { values, setFilter, apiParams } = useUrlFilters(FILTER_KEYS);
  const category = fixedCategory ?? values.category;
  const [booking, setBooking] = useState<Service | null>(null);
  const params = { ...apiParams, ...(category ? { category } : {}) };
  const { data: services, loading, error, reload } = useFetch<Service[]>(
    () => serviceApi.list(params), JSON.stringify(params), [], "Couldn't load services right now.",
  );

  return (
    <>
      <div className="space-y-4 mb-6">
        {!fixedCategory && (
          <FilterChips
            label="Service category"
            options={[{ value: "", label: "All", icon: "🔥" }, ...SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.short, icon: c.icon }))]}
            value={values.category}
            onChange={(v) => setFilter("category", v)}
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <SearchBar value={values.search} onSearch={(q) => setFilter("search", q)} placeholder="Search by name, style, location…" />
          </div>
          <select aria-label="City" value={values.city} onChange={(e) => setFilter("city", e.target.value)} className={inputClass} style={inputStyle}>
            <option value="">All cities</option>
            {KENYAN_CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {category === "props" && (
          <FilterChips
            label="Prop type"
            options={[{ value: "", label: "All props" }, ...PROP_TYPES]}
            value={values.prop_type}
            onChange={(v) => setFilter("prop_type", v)}
          />
        )}
        {category === "models" && (
          <p className="text-xs text-gray-500">✔ Every profile here belongs to a creative Merchke has verified. Tasteful bookings for music videos, ads and events only.</p>
        )}
      </div>

      <div className="mb-6"><BannerAd page="hire" /></div>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : services.length === 0 ? (
        <EmptyState icon="🔎" title="No pros listed here yet" body="Are you one? List your service and start getting bookings." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => <ServiceCard key={s.id} service={s} onBook={setBooking} />)}
        </div>
      )}

      {booking && <BookingModal service={booking} onClose={() => setBooking(null)} />}
    </>
  );
}
