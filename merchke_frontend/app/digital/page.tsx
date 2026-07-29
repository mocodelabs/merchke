"use client";
import { useState, useEffect, useRef } from "react";
import ProductCard from "@/components/ProductCard";
import api, { productApi } from "@/lib/api";

const SORT_OPTIONS = ["Newest", "Best Selling", "Price: Low–High", "Price: High–Low"];
const SORT_TO_API: Record<string, string> = {
  Newest: "-created_at",
  "Best Selling": "-sales_count",
  "Price: Low–High": "price",
  "Price: High–Low": "-price",
};

type ApiCategory = { id: number; name: string; slug: string; icon: string };

type ApiProduct = {
  id: number; name: string; effective_price: number; price: number;
  image: string; vendor_name: string; vendor_slug: string;
  average_rating: number; reviews_count: number;
  is_featured: boolean; product_type: string; sales_count: number;
};

function toCard(p: ApiProduct) {
  return {
    id: p.id,
    name: p.name,
    price: p.effective_price,
    image: p.image || "",
    vendor: p.vendor_name,
    vendorSlug: p.vendor_slug,
    rating: p.average_rating,
    reviews: p.reviews_count,
    badge: p.is_featured ? "Bestseller" : p.sales_count === 0 ? "New" : "Digital",
  };
}

export default function DigitalPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [activeSort, setActiveSort] = useState("Newest");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ReturnType<typeof toCard>[]>([]);
  const [loading, setLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Load digital categories once
  useEffect(() => {
    productApi.categories("digital")
      .then((res) => setCategories(res.data))
      .catch(console.error)
      .finally(() => setCatLoading(false));
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    const delay = search ? 400 : 0;
    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        const params: Record<string, string> = {
          product_type: "digital",
          ordering: SORT_TO_API[activeSort] || "-created_at",
        };
        if (search.trim()) params.search = search.trim();
        if (activeCategory) params.category = activeCategory;
        const res = await api.get("/products/", { params });
        setProducts((res.data as ApiProduct[]).map(toCard));
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "CanceledError") console.error(err);
      } finally {
        setLoading(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [activeSort, search, activeCategory]);

  const activeCat = categories.find((c) => c.slug === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">📲</span>
          <div>
            <h1 className="text-3xl font-black text-white">Digital Downloads</h1>
            {activeCat && (
              <p className="text-sm mt-0.5" style={{ color: "var(--primary)" }}>
                {activeCat.icon} {activeCat.name}
              </p>
            )}
          </div>
        </div>
        <p className="text-gray-500">
          {loading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""}`}
          {" "}— Instant delivery, no shipping
        </p>
      </div>

      {/* Info strip */}
      <div
        className="flex flex-wrap gap-6 px-5 py-4 rounded-2xl mb-8 text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {[
          { icon: "⚡", text: "Instant download after purchase" },
          { icon: "🔒", text: "Secure M-Pesa checkout" },
          { icon: "📁", text: "Beats, presets, art, e-books & more" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2 text-gray-400">
            <span>{icon}</span><span>{text}</span>
          </div>
        ))}
      </div>

      {/* Category pills */}
      <div className="mb-6">
        {catLoading ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-32 skeleton rounded-full shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All pill */}
            <button
              onClick={() => setActiveCategory("")}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={!activeCategory
                ? { background: "var(--primary)", color: "#fff", boxShadow: "0 0 12px rgba(249,115,22,0.35)" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }
              }
            >
              <span>🗂️</span> All
            </button>

            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(activeCategory === cat.slug ? "" : cat.slug)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={activeCategory === cat.slug
                  ? { background: "var(--primary)", color: "#fff", boxShadow: "0 0 12px rgba(249,115,22,0.35)" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }
                }
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category showcase cards (shown only on "All" with no search) */}
      {!activeCategory && !search && !loading && categories.length > 0 && products.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center card-hover"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-xs font-semibold text-white leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div
          className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search beats, presets, e-books…"
            className="bg-transparent outline-none flex-1 text-gray-300 placeholder-gray-600"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-600 hover:text-gray-400">✕</button>
          )}
        </div>
        <select
          value={activeSort}
          onChange={(e) => setActiveSort(e.target.value)}
          className="px-4 py-3 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#d1d5db" }}
        >
          {SORT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="aspect-square skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-2/3 skeleton rounded" />
                <div className="h-4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-600">
          <span className="text-5xl block mb-4">{activeCat?.icon ?? "📲"}</span>
          <p className="font-semibold text-white text-lg mb-2">
            {search ? "No results found" : activeCat ? `No ${activeCat.name} yet` : "No digital products yet"}
          </p>
          <p className="text-sm">
            {search
              ? "Try a different search term"
              : activeCat
              ? `Be the first to upload in ${activeCat.name}`
              : "Creators are uploading — check back soon"}
          </p>
          {activeCat && (
            <button
              onClick={() => setActiveCategory("")}
              className="mt-4 text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              ← Browse all digital
            </button>
          )}
        </div>
      )}
    </div>
  );
}
