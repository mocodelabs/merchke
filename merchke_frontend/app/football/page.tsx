import type { Metadata } from "next";
import Link from "next/link";
import BannerAd from "@/components/BannerAd";
import EventCard from "@/components/EventCard";
import ProductCard from "@/components/ProductCard";
import { toProductCard } from "@/lib/cards";
import { fetchList } from "@/lib/server";
import type { MerchEvent, Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Football in Kenya — Tournaments, Match Tickets & Jerseys | Merchke",
  description: "Find local football tournaments and matches, buy tickets with M-Pesa, and shop official and fan jerseys from Kenyan kit vendors.",
  openGraph: {
    title: "Football on Merchke ⚽",
    description: "Tournaments, match tickets and jerseys — all in one place.",
    type: "website",
  },
};

export const revalidate = 120;

export default async function FootballPage() {
  const [tournaments, jerseys] = await Promise.all([
    fetchList<MerchEvent>("/events/?category=tournament"),
    fetchList<Product>("/products/?type=jersey&ordering=-sales_count"),
  ]);

  return (
    <div>
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #04140b 0%, #0a2a16 45%, #0a0a0a 100%)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="absolute -right-10 -top-10 text-[200px] opacity-10 select-none pointer-events-none" aria-hidden>⚽</div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Kenyan football</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mt-2 leading-tight">Every match.<br />Every kit.</h1>
          <p className="text-gray-400 mt-3 max-w-md">Grassroots tournaments, derby tickets and the jerseys to wear to them. Pay with M-Pesa.</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <a href="#matches" className="inline-flex justify-center px-6 py-3 rounded-xl font-bold text-white" style={{ background: "var(--primary)" }}>Get match tickets</a>
            <a href="#jerseys" className="inline-flex justify-center px-6 py-3 rounded-xl font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)" }}>Shop jerseys</a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-14">
        <BannerAd page="football" />

        <section id="matches" className="scroll-mt-20">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-white">Tournaments & matches</h2>
            <Link href="/events?category=tournament" className="text-sm font-medium" style={{ color: "var(--primary)" }}>All →</Link>
          </div>
          {tournaments.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournaments.slice(0, 6).map((e, i) => <EventCard key={e.id} event={e} priority={i < 2} />)}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-6 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              No upcoming tournaments listed yet. Organising one? List it below.
            </p>
          )}
        </section>

        <section id="jerseys" className="scroll-mt-20">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-white">Jerseys & kits 👕</h2>
            <Link href="/store?type=jersey" className="text-sm font-medium" style={{ color: "var(--primary)" }}>Shop all →</Link>
          </div>
          {jerseys.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {jerseys.slice(0, 8).map((p) => <ProductCard key={p.id} product={toProductCard(p)} />)}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-6 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              Jersey vendors are setting up shop — check back soon.
            </p>
          )}
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="p-6 sm:p-8 rounded-3xl" style={{ background: "linear-gradient(135deg, #1a0900 0%, #2d1200 100%)", border: "1px solid rgba(249,115,22,0.25)" }}>
            <span className="text-3xl" aria-hidden>📣</span>
            <h2 className="text-xl font-black text-white mt-3">Advertise your tournament</h2>
            <p className="text-sm text-gray-400 mt-2 mb-5">List it with ticket tiers, then boost it to the homepage and this page. Boosts start at KSh 500.</p>
            <Link href="/dashboard/events/new?category=tournament" className="inline-flex px-5 py-3 rounded-xl font-bold text-sm text-white" style={{ background: "var(--primary)" }}>
              List & boost a tournament
            </Link>
          </div>
          <div className="p-6 sm:p-8 rounded-3xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="text-3xl" aria-hidden>🏷️</span>
            <h2 className="text-xl font-black text-white mt-3">Sell jerseys on Merchke</h2>
            <p className="text-sm text-gray-400 mt-2 mb-5">Size variants, M-Pesa payments and buyer protection built in.</p>
            <Link href="/register?seller=1&type=jersey" className="inline-flex px-5 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              Open a jersey store
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
