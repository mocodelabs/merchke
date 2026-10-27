import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ServicesBrowser from "@/components/ServicesBrowser";
import { SERVICE_CATEGORIES } from "@/lib/constants";

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return SERVICE_CATEGORIES.map((c) => ({ category: c.value }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const c = SERVICE_CATEGORIES.find((x) => x.value === category);
  if (!c) return { title: "Hire | Merchke" };
  return {
    title: `${c.label} in Kenya | Hire on Merchke`,
    description: `${c.blurb} Browse portfolios, compare prices in KSh and send a booking request.`,
    openGraph: { title: `${c.label} | Merchke Hire`, description: c.blurb, type: "website" },
  };
}

export default async function HireCategoryPage({ params }: Props) {
  const { category } = await params;
  const current = SERVICE_CATEGORIES.find((c) => c.value === category);
  if (!current) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/hire" className="text-sm text-gray-500 hover:text-white">← All services</Link>
      <div className="flex items-center gap-3 mt-3 mb-2">
        <span className="text-4xl" aria-hidden>{current.icon}</span>
        <h1 className="text-2xl sm:text-3xl font-black text-white">{current.label}</h1>
      </div>
      <p className="text-sm text-gray-400 mb-6">{current.blurb}</p>

      <nav className="flex gap-2 overflow-x-auto pb-1 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0" aria-label="Service categories">
        {SERVICE_CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/hire/${c.value}`}
            aria-current={c.value === category ? "page" : undefined}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
            style={c.value === category
              ? { background: "var(--primary)", color: "#fff" }
              : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }}
          >
            <span className="mr-1" aria-hidden>{c.icon}</span>{c.short}
          </Link>
        ))}
      </nav>

      <Suspense fallback={<div className="h-72 skeleton rounded-2xl" />}>
        <ServicesBrowser fixedCategory={category} />
      </Suspense>
    </div>
  );
}
