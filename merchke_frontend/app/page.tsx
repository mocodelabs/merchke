import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import VendorCard from "@/components/VendorCard";
import EventCard from "@/components/EventCard";
import HeroCarousel from "@/components/HeroCarousel";
import { FeaturedEventsCarousel, SpotlightAds } from "@/components/home";
import { toProductCard } from "@/lib/cards";
import { VENDOR_TYPES } from "@/lib/constants";
import { fetchList } from "@/lib/server";
import type { MerchEvent, Product } from "@/lib/types";

export const revalidate = 300;

const EXPLORE = [
  { href: "/events", icon: "🎟️", title: "Events & Tickets", body: "Concerts, comedy, live podcasts" },
  { href: "/football", icon: "⚽", title: "Football", body: "Tournaments, matches & jerseys" },
  { href: "/hire", icon: "💄", title: "Hire Creatives", body: "Makeup, tattoo, photo, video props" },
  { href: "/podcasts", icon: "🎙️", title: "Podcasts", body: "Kenyan voices, on demand" },
  { href: "/jobs", icon: "💼", title: "Creative Jobs", body: "Gigs in music, media & film" },
  { href: "/digital", icon: "📲", title: "Digital Downloads", body: "Beats, presets, e-books" },
];

type ApiVendor = {
  id: number; brand_name: string; vendor_type: string; slug: string;
  is_verified: boolean; products_count: number; total_reviews: number;
};

function toCardVendor(v: ApiVendor) {
  return {
    id: v.id,
    name: v.brand_name,
    type: v.vendor_type,
    slug: v.slug,
    followers: `${v.total_reviews} reviews`,
    products: v.products_count,
    verified: v.is_verified,
  };
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [featuredProducts, latestProducts, topVendors, upcomingEvents, featuredEvents] = await Promise.all([
    fetchList<Product>("/products/?featured=true"),
    fetchList<Product>("/products/?ordering=-sales_count"),
    fetchList<ApiVendor>("/vendors/?featured=true"),
    fetchList<MerchEvent>("/events/"),
    fetchList<MerchEvent>("/events/?featured=true"),
  ]);

  // Fall back to best-sellers when nothing is flagged featured yet.
  const displayProducts = (featuredProducts.length ? featuredProducts : latestProducts).slice(0, 8).map(toProductCard);
  const displayVendors = topVendors.slice(0, 4).map(toCardVendor);
  const displayEvents = upcomingEvents.slice(0, 3);
  const carouselEvents = [...featuredEvents, ...upcomingEvents.filter((e) => !e.is_featured)];

  return (
    <div>
      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0c0c0e 0%, #1a0a00 50%, #0c0c0e 100%)",
          minHeight: "92vh",
        }}
      >
        <div
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "var(--primary)" }}
        />
        <div
          className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: "#10b981" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{
                  background: "var(--primary-dim)",
                  color: "var(--primary)",
                  border: "1px solid rgba(249,115,22,0.3)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--primary)" }}
                />
                Kenya&apos;s #1 Creative Marketplace
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-none tracking-tight mb-6 text-white">
                Support<br />
                <span className="text-gradient">Kenyan</span><br />
                Creatives
              </h1>

              <p className="text-lg text-gray-400 mb-8 max-w-md leading-relaxed">
                Shop merch from your favourite artists, grab event tickets, download beats
                and support local brands — all in one place. Lipa na M-Pesa.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/store"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-semibold text-white glow-orange"
                  style={{ background: "var(--primary)" }}
                >
                  Shop Now
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/sell"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-semibold"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  Start Selling
                </Link>
              </div>

              <div className="flex gap-8 mt-12 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
                {[
                  { num: "5,000+", label: "Sellers" },
                  { num: "120K+", label: "Buyers" },
                  { num: "KSh 50M+", label: "Paid Out" },
                ].map(({ num, label }) => (
                  <div key={label}>
                    <div className="text-2xl font-black" style={{ color: "var(--primary)" }}>{num}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrolling category cards — desktop */}
            <HeroCarousel />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
          <svg viewBox="0 0 1440 64" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,32 C360,0 1080,64 1440,32 L1440,64 L0,64 Z" fill="#0c0c0e" />
          </svg>
        </div>
      </section>

      <FeaturedEventsCarousel events={carouselEvents} />

      {/* ── CATEGORIES ──────────────────────────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Browse by Category</h2>
          <Link href="/store" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            See all →
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-3">
          {VENDOR_TYPES.map((cat) => (
            <Link
              key={cat.value}
              href={`/store?type=${cat.value}`}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl text-center card-hover"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-xs font-semibold text-white group-hover:text-orange-400 transition-colors">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <SpotlightAds />

      {/* ── EXPLORE THE HUB ─────────────────────────────────────────────── */}
      <section className="py-8 max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-white mb-2">One hub for the whole industry</h2>
        <p className="text-sm text-gray-500 mb-6">Fans buy, creatives sell, and the industry connects.</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {EXPLORE.map((x) => (
            <Link key={x.href} href={x.href} className="group p-4 sm:p-5 rounded-2xl card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-3xl" aria-hidden>{x.icon}</span>
              <p className="text-sm sm:text-base font-bold text-white mt-2 group-hover:text-orange-400 transition-colors">{x.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{x.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TRENDING PRODUCTS ───────────────────────────────────────────── */}
      <section className="py-12 max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Trending Now 🔥</h2>
            <p className="text-sm text-gray-500 mt-1">What Kenya is buying</p>
          </div>
          <Link href="/store" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            View all →
          </Link>
        </div>
        {displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-600">
            <p>New drops are on the way.</p>
            <Link href="/store" className="mt-3 inline-block text-sm" style={{ color: "var(--primary)" }}>
              Browse all products →
            </Link>
          </div>
        )}
      </section>

      {/* ── VENDOR SPOTLIGHT ────────────────────────────────────────────── */}
      <section className="py-16" style={{ background: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Top Vendors</h2>
              <p className="text-sm text-gray-500 mt-1">Kenya&apos;s best creators &amp; brands</p>
            </div>
            <Link href="/vendors" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
              Browse all →
            </Link>
          </div>
          {displayVendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayVendors.map((v) => (
                <VendorCard key={v.id} vendor={v} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              <p>No featured vendors yet — check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── UPCOMING EVENTS ─────────────────────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Upcoming Events 🎟️</h2>
            <p className="text-sm text-gray-500 mt-1">Grab your tickets before they sell out</p>
          </div>
          <Link href="/events" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            All events →
          </Link>
        </div>
        {displayEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {displayEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-600">
            <p>No upcoming events — check back soon!</p>
          </div>
        )}
      </section>

      {/* ── SELL CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div
          className="max-w-4xl mx-auto rounded-3xl p-10 md:p-14 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a0900 0%, #2d1200 50%, #1a0900 100%)",
            border: "1px solid rgba(249,115,22,0.25)",
          }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle at 50% 0%, var(--primary) 0%, transparent 70%)" }}
          />
          <span className="relative text-4xl mb-4 block">🚀</span>
          <h2 className="relative text-3xl md:text-4xl font-black text-white mb-4">Ready to sell?</h2>
          <p className="relative text-gray-400 mb-8 max-w-lg mx-auto text-lg">
            Join thousands of Kenyan artists, DJs, brands and event organizers already making money on Merchke.
            Setup takes 5 minutes.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sell"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg glow-orange"
              style={{ background: "var(--primary)" }}
            >
              Create Your Store
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-gray-300 hover:text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
            >
              How it works
            </Link>
          </div>
          <p className="relative text-xs text-gray-600 mt-4">
            Free to join · Payouts via M-Pesa · 10% commission only on sales
          </p>
        </div>
      </section>

      {/* ── TRUST BANNER ────────────────────────────────────────────────── */}
      <section
        className="py-10 border-t border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: "📱", label: "Lipa na M-Pesa", sub: "Instant mobile payments" },
              { icon: "🔒", label: "Secure Checkout", sub: "256-bit encryption" },
              { icon: "🚚", label: "Kenya-wide Delivery", sub: "All 47 counties" },
              { icon: "↩️", label: "Easy Returns", sub: "7-day return policy" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
