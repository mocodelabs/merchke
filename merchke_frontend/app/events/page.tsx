"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { eventApi } from "@/lib/api";

const GENRES = ["All", "Afrobeats", "Comedy", "Gospel", "Talk", "Hip-Hop", "R&B", "Jazz"];

const GENRE_COLORS: Record<string, { bg: string; color: string }> = {
  Afrobeats: { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
  Comedy: { bg: "rgba(250,204,21,0.15)", color: "#fbbf24" },
  Gospel: { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  Talk: { bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
  "Hip-Hop": { bg: "rgba(236,72,153,0.15)", color: "#f472b6" },
  "R&B": { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
  Jazz: { bg: "rgba(20,184,166,0.15)", color: "#2dd4bf" },
  default: { bg: "rgba(255,255,255,0.08)", color: "#9ca3af" },
};

type TicketType = { id: number; name: string; price: number; is_sold_out: boolean; tickets_remaining: number };

type ApiEvent = {
  id: number; title: string; slug: string;
  start_datetime: string; end_datetime: string;
  venue_name: string; venue_address: string; town: string;
  banner_image: string | null; genre: string;
  ticket_types: TicketType[];
  is_sold_out: boolean; vendor_name: string;
  short_description: string; description: string;
};

function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "") + path;
}

function minPrice(event: ApiEvent): number {
  if (!event.ticket_types.length) return 0;
  return Math.min(...event.ticket_types.map((t) => t.price));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    month: d.toLocaleString("en-KE", { month: "short" }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleString("en-KE", { weekday: "long" }),
    time: d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
    full: d.toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" }),
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    eventApi.list()
      .then((res) => setEvents(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    const matchGenre = activeGenre === "All" || e.genre === activeGenre;
    const matchSearch = search
      ? e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.venue_name.toLowerCase().includes(search.toLowerCase()) ||
        e.town?.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchGenre && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Upcoming Events 🎟️</h1>
        <p className="text-gray-500">
          {loading ? "Loading…" : `${filtered.length} event${filtered.length !== 1 ? "s" : ""} in Kenya`}
        </p>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events, venues, towns…"
          className="bg-transparent outline-none flex-1 text-gray-300 placeholder-gray-600"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-gray-600 hover:text-gray-400">✕</button>
        )}
      </div>

      {/* Genre tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenre(g)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={
              activeGenre === g
                ? { background: "var(--primary)", color: "#fff" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }
            }
          >
            {g}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="h-44 skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 skeleton rounded" />
                <div className="h-4 w-1/2 skeleton rounded" />
                <div className="h-4 w-2/3 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-600">
          <span className="text-4xl block mb-3">🎟️</span>
          <p className="font-medium text-white">No events found</p>
          <p className="text-sm mt-1">
            {search || activeGenre !== "All"
              ? "Try adjusting your filters"
              : "Check back soon — events are being added!"}
          </p>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: ApiEvent }) {
  const dt = formatDate(event.start_datetime);
  const price = minPrice(event);
  const genreStyle = GENRE_COLORS[event.genre] ?? GENRE_COLORS.default;
  const soldOut = event.is_sold_out;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block rounded-2xl overflow-hidden card-hover"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Banner image */}
      <div className="relative h-44 overflow-hidden" style={{ background: "var(--surface-2)" }}>
        {event.banner_image ? (
          <img
            src={mediaUrl(event.banner_image)}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: "linear-gradient(135deg,#1a0900,#2d1200)" }}>
            🎟️
          </div>
        )}

        {/* Genre badge */}
        <span
          className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm"
          style={{ background: genreStyle.bg, color: genreStyle.color, border: `1px solid ${genreStyle.color}30` }}
        >
          {event.genre}
        </span>

        {/* Sold out overlay */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-sm font-bold px-4 py-2 rounded-full" style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}>
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          {/* Date block */}
          <div
            className="shrink-0 w-12 rounded-xl flex flex-col items-center justify-center py-1.5 text-center"
            style={{ background: "var(--primary-dim)", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>{dt.month}</span>
            <span className="text-xl font-black text-white leading-none">{dt.day}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white leading-snug group-hover:text-orange-400 transition-colors line-clamp-2 mb-1">
              {event.title}
            </h3>
            <p className="text-xs text-gray-500 truncate">📍 {[event.venue_name, event.town].filter(Boolean).join(", ")}</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-3">{dt.weekday} · {dt.time}</p>

        <div className="flex items-center justify-between">
          {price > 0 ? (
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
              From KSh {price.toLocaleString()}
            </span>
          ) : (
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>Free</span>
          )}
          {!soldOut && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all" style={{ background: "var(--primary)", color: "#fff" }}>
              Get Tickets →
            </span>
          )}
        </div>

        {/* Ticket tiers preview */}
        {event.ticket_types.length > 1 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {event.ticket_types.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: t.is_sold_out ? "rgba(239,68,68,0.1)" : "var(--surface-2)",
                  color: t.is_sold_out ? "#f87171" : "#6b7280",
                  border: "1px solid var(--border)",
                }}
              >
                {t.name}: KSh {t.price.toLocaleString()}
                {t.is_sold_out ? " · Sold out" : t.tickets_remaining <= 10 ? ` · ${t.tickets_remaining} left` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
