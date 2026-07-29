"use client";
import { useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = { icon: string; title: string; body: string };
type FAQ = { q: string; a: string };

// ── Data ──────────────────────────────────────────────────────────────────────

const BUYER_STEPS: Step[] = [
  {
    icon: "🔍",
    title: "Browse the marketplace",
    body: "Explore physical merch, digital downloads, and event tickets from Kenya's best artists, DJs, brands, and creators — all in one place.",
  },
  {
    icon: "🛒",
    title: "Add to cart",
    body: "Pick your size, variant, or digital format. Quick-add from the catalogue or dive into the product page for full details, track listing, and previews.",
  },
  {
    icon: "📱",
    title: "Pay with M-Pesa",
    body: "Enter your M-Pesa number at checkout. You'll receive a push notification to confirm. No card, no bank account needed — just your phone.",
  },
  {
    icon: "📦",
    title: "Receive your order",
    body: "Physical items ship to your door. Digital products unlock instantly after payment — download your beat, e-book, or mix directly from the order page.",
  },
];

const SELLER_STEPS: Step[] = [
  {
    icon: "✍️",
    title: "Create your vendor account",
    body: "Register in under two minutes. Pick your vendor type — artist, DJ, brand, creative, or event organizer — and personalise your storefront.",
  },
  {
    icon: "🏪",
    title: "Set up your store",
    body: "Add your brand name, logo, bio, and social links. Your public vendor page is live immediately and indexed so fans can find you.",
  },
  {
    icon: "📤",
    title: "List your products",
    body: "Upload physical merch with size/colour variants, digital files (beats, mixes, PDFs, videos), or create event listings with multiple ticket tiers — all from the vendor dashboard.",
  },
  {
    icon: "💸",
    title: "Get paid via M-Pesa",
    body: "When a customer buys, funds settle straight to your M-Pesa. Track every sale, view revenue stats, and manage orders from your dashboard.",
  },
];

const PRODUCT_TYPES = [
  {
    icon: "👕",
    label: "Physical Merch",
    color: "#f97316",
    dimColor: "rgba(249,115,22,0.1)",
    href: "/store",
    cta: "Shop Merch",
    bullets: [
      "T-shirts, hoodies, jerseys, caps & more",
      "Size and colour variants",
      "Door-to-door delivery across Kenya",
      "Custom print & branded packaging",
    ],
  },
  {
    icon: "📲",
    label: "Digital Downloads",
    color: "#818cf8",
    dimColor: "rgba(129,140,248,0.1)",
    href: "/digital",
    cta: "Browse Digital",
    bullets: [
      "Beats, DJ mixes, sample packs & presets",
      "E-books, guides, courses & tutorials",
      "Photography, art & graphic design assets",
      "Instant download after M-Pesa payment",
    ],
  },
  {
    icon: "🎟️",
    label: "Event Tickets",
    color: "#10b981",
    dimColor: "rgba(16,185,129,0.1)",
    href: "/events",
    cta: "See Events",
    bullets: [
      "Concerts, club nights, festivals & shows",
      "Multiple ticket tiers per event",
      "QR code tickets delivered to your phone",
      "Comedy, art, sports, workshops & more",
    ],
  },
];

const FAQS: FAQ[] = [
  {
    q: "Do I need a credit card to buy on Merchke?",
    a: "No. All payments go through M-Pesa. At checkout, enter your Safaricom number and confirm the STK push on your phone. That's it.",
  },
  {
    q: "How long does delivery take for physical products?",
    a: "Delivery times depend on the vendor and your location. Most sellers ship within 1–3 business days. Nairobi CBD orders are often same-day or next-day.",
  },
  {
    q: "How do I download a digital product I bought?",
    a: "After your M-Pesa payment clears, go to My Orders and click Download next to the product. Some files have a download limit set by the creator; this will be shown on the product page.",
  },
  {
    q: "Is it free to sell on Merchke?",
    a: "Creating a vendor account and listing products is free. Merchke takes a small platform fee per transaction — the exact percentage is shown on your seller onboarding page.",
  },
  {
    q: "Can I sell both physical and digital products from the same account?",
    a: "Yes. Your vendor account supports all three product types — physical merch, digital downloads, and event tickets — from a single dashboard.",
  },
  {
    q: "How do I get a refund?",
    a: "Contact the vendor directly via their store page first. If you can't reach them within 48 hours, open a dispute through the Help Center and the Merchke team will step in.",
  },
  {
    q: "What types of digital files can I sell?",
    a: "MP3/WAV (beats, mixes, samples), PDF (e-books, guides, presets), MP4/MOV (video content, courses), and ZIP bundles. Maximum file size is 500 MB per product.",
  },
  {
    q: "How do event tickets work?",
    a: "After purchase a QR-code ticket is generated and linked to your order. Present the QR code at the venue entrance for scanning. Tickets are non-transferable unless the organiser allows it.",
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <div className="flex gap-5">
      {/* Number + connecting line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black text-white shrink-0"
          style={{ background: "var(--primary)" }}
        >
          {index + 1}
        </div>
        {index < 3 && (
          <div className="w-px flex-1 mt-2" style={{ background: "var(--border)", minHeight: 32 }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{step.icon}</span>
          <h3 className="text-base font-bold text-white">{step.title}</h3>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">{step.body}</p>
      </div>
    </div>
  );
}

function FaqItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white">{faq.q}</span>
        <span
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform"
          style={{
            background: open ? "var(--primary)" : "var(--surface-2)",
            transform: open ? "rotate(45deg)" : "none",
          }}
        >
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm text-gray-400 leading-relaxed pt-3">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState<"buyer" | "seller">("buyer");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="text-center mb-16">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
          style={{ background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid rgba(249,115,22,0.25)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--primary)" }} />
          Kenya's Creative Marketplace
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
          How Merchke Works
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Merchke connects Kenya's artists, DJs, brands, and event organisers with their fans.
          Buy and sell merch, digital products, and event tickets — all paid via M-Pesa.
        </p>
      </div>

      {/* ── Platform types ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
        {PRODUCT_TYPES.map((pt) => (
          <div
            key={pt.label}
            className="rounded-2xl p-6"
            style={{ background: "var(--surface)", border: `1px solid var(--border)` }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
              style={{ background: pt.dimColor }}
            >
              {pt.icon}
            </div>
            <h3 className="text-base font-bold text-white mb-3">{pt.label}</h3>
            <ul className="space-y-2 mb-5">
              {pt.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="mt-0.5 text-xs" style={{ color: pt.color }}>✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href={pt.href}
              className="block text-center text-sm font-semibold py-2 rounded-lg transition-colors"
              style={{ background: pt.dimColor, color: pt.color }}
            >
              {pt.cta} →
            </Link>
          </div>
        ))}
      </div>

      {/* ── Steps ────────────────────────────────────────────────────────────── */}
      <div className="mb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white mb-2">Step-by-step guide</h2>
          <p className="text-gray-500 text-sm">Pick your role to see the right steps</p>
        </div>

        {/* Tab toggle */}
        <div
          className="inline-flex rounded-xl p-1 mb-10 mx-auto block w-fit"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {(["buyer", "seller"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize"
              style={
                activeTab === tab
                  ? { background: "var(--primary)", color: "#fff" }
                  : { color: "#6b7280" }
              }
            >
              {tab === "buyer" ? "I want to buy" : "I want to sell"}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Steps column */}
          <div>
            {(activeTab === "buyer" ? BUYER_STEPS : SELLER_STEPS).map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>

          {/* Illustration card */}
          <div className="hidden md:block">
            {activeTab === "buyer" ? (
              <div
                className="rounded-2xl p-8 h-full flex flex-col gap-5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: "var(--primary-dim)" }}
                >
                  🛍️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Everything in one place</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    One account, one cart, one M-Pesa payment — whether you're buying a jersey, a beat pack, or a concert ticket.
                  </p>
                </div>
                <div className="space-y-3 mt-auto">
                  {[
                    { icon: "📱", label: "M-Pesa STK push — no card needed" },
                    { icon: "⚡", label: "Digital products unlock instantly" },
                    { icon: "📦", label: "Nationwide delivery for physical orders" },
                    { icon: "🎟️", label: "QR ticket straight to your phone" },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="text-base">{icon}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/store"
                  className="mt-4 block text-center py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div
                className="rounded-2xl p-8 h-full flex flex-col gap-5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: "rgba(129,140,248,0.12)" }}
                >
                  🚀
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Built for Kenyan creators</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Whether you're a solo artist, a DJ, a local brand, or an event organiser — Merchke gives you the tools to monetise what you create.
                  </p>
                </div>
                <div className="space-y-3 mt-auto">
                  {[
                    { icon: "🎨", label: "Artists — sell merch & art prints" },
                    { icon: "🎧", label: "DJs — sell beats, mixes & presets" },
                    { icon: "🎟️", label: "Organizers — ticket sales & check-in" },
                    { icon: "🏷️", label: "Brands — full product catalogue" },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="text-base">{icon}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register?seller=1"
                  className="mt-4 block text-center py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  Start Selling Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── M-Pesa section ────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-8 mb-20"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
              style={{ background: "rgba(16,185,129,0.12)" }}
            >
              📱
            </div>
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "#10b981" }}
            >
              M-Pesa
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white mb-3">Payments via M-Pesa</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Every transaction on Merchke — whether you're buying a cap or selling 100 event tickets — goes through M-Pesa.
              No credit card, no bank account, no foreign payment gateway fees. Just your Safaricom line.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "For buyers", body: "You get an M-Pesa push at checkout. Confirm the amount and your payment clears in seconds.", icon: "1️⃣" },
                { label: "For sellers", body: "Earnings settle to your registered M-Pesa line. Check revenue in real time from your dashboard.", icon: "2️⃣" },
                { label: "Secure", body: "All transactions are end-to-end encrypted and processed through Safaricom's official API.", icon: "🔒" },
              ].map(({ label, body, icon }) => (
                <div
                  key={label}
                  className="rounded-xl p-4"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <span className="text-lg block mb-2">{icon}</span>
                  <p className="text-xs font-bold text-white mb-1">{label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat strip ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
        {[
          { value: "460+", label: "Active vendors" },
          { value: "500+", label: "Digital products" },
          { value: "30+", label: "Live events" },
          { value: "M-Pesa", label: "Only payment needed" },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="text-center rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-2xl font-black mb-1" style={{ color: "var(--primary)" }}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <div className="mb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white mb-2">Frequently asked questions</h2>
          <p className="text-gray-500 text-sm">Can't find an answer? <Link href="/contact" className="underline" style={{ color: "var(--primary)" }}>Contact us</Link></p>
        </div>
        <div className="space-y-3 max-w-2xl mx-auto">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} faq={faq} />
          ))}
        </div>
      </div>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-10 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(129,140,248,0.08) 100%)",
          border: "1px solid rgba(249,115,22,0.2)",
        }}
      >
        <h2 className="text-2xl font-black text-white mb-3">Ready to get started?</h2>
        <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
          Join thousands of Kenyan fans, artists, and brands already on Merchke.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/store"
            className="px-7 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Browse the store
          </Link>
          <Link
            href="/register?seller=1"
            className="px-7 py-3 rounded-xl text-sm font-bold transition-all hover:bg-white/10"
            style={{ border: "1px solid var(--border)", color: "#d1d5db" }}
          >
            Start selling free →
          </Link>
          <Link
            href="/events"
            className="px-7 py-3 rounded-xl text-sm font-bold transition-all hover:bg-white/10"
            style={{ border: "1px solid var(--border)", color: "#d1d5db" }}
          >
            See events 🎟️
          </Link>
        </div>
      </div>
    </div>
  );
}
