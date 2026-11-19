"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const VENDOR_TYPES = [
  {
    id: "artist",
    icon: "🎨",
    label: "Artist",
    tagline: "Turn your art into income",
    color: "#f97316",
    dim: "rgba(249,115,22,0.12)",
    sells: ["Merch (tees, hoodies, prints)", "Limited edition drops", "Exclusive digital art", "Collaboration pieces"],
  },
  {
    id: "dj",
    icon: "🎧",
    label: "DJ / Producer",
    tagline: "Monetise your music",
    color: "#818cf8",
    dim: "rgba(129,140,248,0.12)",
    sells: ["Beats & instrumentals", "DJ mixes & sets", "Sample packs & presets", "Exclusive tracks"],
  },
  {
    id: "events",
    icon: "🎟️",
    label: "Event Organizer",
    tagline: "Sell out your shows",
    color: "#10b981",
    dim: "rgba(16,185,129,0.12)",
    sells: ["Concerts & club nights", "Festival passes", "Comedy & arts shows", "Workshops & masterclasses"],
  },
  {
    id: "brand",
    icon: "🏷️",
    label: "Local Brand",
    tagline: "Reach more customers",
    color: "#f59e0b",
    dim: "rgba(245,158,11,0.12)",
    sells: ["Apparel & accessories", "Custom printed merch", "Jerseys & sportswear", "Lifestyle products"],
  },
  {
    id: "creative",
    icon: "🎭",
    label: "Creative",
    tagline: "Share your craft",
    color: "#ec4899",
    dim: "rgba(236,72,153,0.12)",
    sells: ["Photography & art prints", "E-books & guides", "Courses & tutorials", "Graphic design assets"],
  },
];

const STEPS = [
  { icon: "✍️", title: "Create account", body: "Sign up free. Choose your vendor type and set your brand name." },
  { icon: "🏪", title: "Set up your store", body: "Add your logo, bio, and social links. Your storefront is live instantly." },
  { icon: "📤", title: "List products", body: "Add physical merch, digital files, or create event listings from the vendor dashboard." },
  { icon: "💸", title: "Get paid via M-Pesa", body: "Customers pay, money hits your M-Pesa. Track sales and manage orders in real time." },
];

function SellPageInner() {
  const params = useSearchParams();
  const initialType = params.get("type") ?? "artist";
  const validIds = VENDOR_TYPES.map((v) => v.id);
  const [active, setActive] = useState(validIds.includes(initialType) ? initialType : "artist");

  const current = VENDOR_TYPES.find((v) => v.id === active)!;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-14">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
          style={{ background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid rgba(249,115,22,0.25)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--primary)" }} />
          Zero setup cost
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
          Start selling on Merchke
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Kenya&apos;s marketplace for creatives. Sell merch, digital products, and event tickets to your audience — paid straight to your M-Pesa.
        </p>
        <div className="flex justify-center gap-3 mt-8">
          <Link
            href="/register?seller=1"
            className="px-8 py-3.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--primary)" }}
          >
            Start for free →
          </Link>
          <Link
            href="/how-it-works"
            className="px-8 py-3.5 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "#9ca3af" }}
          >
            How it works
          </Link>
        </div>
      </div>

      {/* Vendor type selector */}
      <div className="mb-12">
        <p className="text-center text-sm text-gray-500 mb-5 font-medium">What do you sell?</p>
        <div className="flex flex-wrap justify-center gap-2">
          {VENDOR_TYPES.map((v) => (
            <button
              key={v.id}
              onClick={() => setActive(v.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
              style={
                active === v.id
                  ? { background: v.color, color: "#fff", boxShadow: `0 0 14px ${v.color}55` }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }
              }
            >
              <span>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected type card */}
      <div
        className="rounded-2xl p-8 mb-16"
        style={{ background: "var(--surface)", border: `1px solid ${current.color}33` }}
      >
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{ background: current.dim }}
            >
              {current.icon}
            </div>
            <h2 className="text-2xl font-black text-white mb-1">{current.label}</h2>
            <p className="font-medium mb-6" style={{ color: current.color }}>{current.tagline}</p>
            <ul className="space-y-2.5">
              {current.sells.map((s) => (
                <li key={s} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <span className="text-xs font-bold" style={{ color: current.color }}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:ml-auto shrink-0 text-center md:text-right">
            <p className="text-xs text-gray-600 mb-1 uppercase tracking-wider font-semibold">Ready to start?</p>
            <Link
              href={`/register?seller=1&type=${current.id}`}
              className="inline-block px-8 py-3.5 rounded-xl text-sm font-bold text-white mt-2"
              style={{ background: current.color }}
            >
              Create {current.label} store →
            </Link>
            <p className="text-xs text-gray-600 mt-3">Free to set up · M-Pesa payouts</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-16">
        <h2 className="text-2xl font-black text-white text-center mb-10">How to get started</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white mb-3"
                style={{ background: "var(--primary)" }}
              >
                {i + 1}
              </div>
              <span className="text-2xl block mb-2">{s.icon}</span>
              <h3 className="font-bold text-white text-sm mb-1">{s.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { v: "Free", l: "To create a store" },
          { v: "M-Pesa", l: "Direct payouts" },
          { v: "Instant", l: "Digital delivery" },
          { v: "24/7", l: "Storefront is always live" },
        ].map(({ v, l }) => (
          <div
            key={l}
            className="text-center rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-xl font-black mb-1" style={{ color: "var(--primary)" }}>{v}</p>
            <p className="text-xs text-gray-500">{l}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        className="rounded-2xl p-10 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(129,140,248,0.08) 100%)",
          border: "1px solid rgba(249,115,22,0.2)",
        }}
      >
        <h2 className="text-2xl font-black text-white mb-3">Open your store today</h2>
        <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
          Thousands of Kenyan fans are ready to support the creators they love.
        </p>
        <Link
          href="/register?seller=1"
          className="inline-block px-10 py-4 rounded-xl text-sm font-bold text-white"
          style={{ background: "var(--primary)" }}
        >
          Get started for free →
        </Link>
        <p className="text-xs text-gray-600 mt-4">Already a vendor? <Link href="/dashboard" className="underline" style={{ color: "var(--primary)" }}>Go to dashboard →</Link></p>
      </div>
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense>
      <SellPageInner />
    </Suspense>
  );
}
