import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import ServicesBrowser from "@/components/ServicesBrowser";
import { SERVICE_CATEGORIES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Hire Creatives in Kenya — Makeup, Tattoo, Props, Photographers | Merchke",
  description: "Book makeup artists, tattoo artists, photographers, videographers and bikers, or rent video props, locations and cars for your next shoot.",
  openGraph: {
    title: "Hire Kenyan Creatives | Merchke",
    description: "Makeup, tattoo, photo & video pros, verified models and video props for rent.",
    type: "website",
  },
};

export default function HirePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white">Hire the creative industry</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-xl">
          Book the people and props behind every great shoot, show and video — straight from the pros.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {SERVICE_CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/hire/${c.value}`}
            className="group p-4 rounded-2xl card-hover"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span className="text-3xl block mb-2" aria-hidden>{c.icon}</span>
            <span className="text-sm font-bold text-white block group-hover:text-orange-400 transition-colors">{c.label}</span>
            <span className="text-xs text-gray-500 block mt-0.5">{c.blurb}</span>
          </Link>
        ))}
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Latest listings</h2>
      <Suspense fallback={<div className="h-72 skeleton rounded-2xl" />}>
        <ServicesBrowser />
      </Suspense>

      <section className="mt-12 p-6 sm:p-8 rounded-3xl text-center" style={{ background: "linear-gradient(135deg, #1a0900 0%, #2d1200 100%)", border: "1px solid rgba(249,115,22,0.25)" }}>
        <h2 className="text-2xl font-black text-white mb-2">Offer a service?</h2>
        <p className="text-sm text-gray-400 mb-5">List your portfolio for free and get booking requests by email.</p>
        <Link href="/dashboard/services/new" className="inline-flex px-6 py-3 rounded-xl font-bold text-white" style={{ background: "var(--primary)" }}>
          List your service
        </Link>
      </section>
    </div>
  );
}
