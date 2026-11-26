"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import BannerAd from "@/components/BannerAd";
import ProductCard from "@/components/ProductCard";
import api from "@/lib/api";
import { mediaUrl } from "@/lib/config";
import { VENDOR_TYPES as VENDOR_TYPE_LIST } from "@/lib/constants";

const VENDOR_TYPES = ["All", ...VENDOR_TYPE_LIST.map((t) => t.label)];
const TYPE_ICON: Record<string, string> = Object.fromEntries(VENDOR_TYPE_LIST.map((t) => [t.label, t.icon]));
const SORT_OPTIONS = ["Newest", "Best Selling", "Price: Low–High", "Price: High–Low", "Top Rated"];

const TYPE_TO_API: Record<string, string> = Object.fromEntries(VENDOR_TYPE_LIST.map((t) => [t.label, t.value]));

const SORT_TO_API: Record<string, string> = {
  Newest: "-created_at",
  "Best Selling": "-sales_count",
  "Price: Low–High": "price",
  "Price: High–Low": "-price",
  "Top Rated": "-sales_count",
};

type ApiProduct = {
  id: number; name: string; effective_price: number; price: number;
  image: string; vendor_name: string; vendor_slug: string;
  average_rating: number; reviews_count: number;
  is_featured: boolean; product_type: string; sales_count: number;
};

type CardProduct = {
  id: number; name: string; price: number; image: string;
  vendor: string; vendorSlug: string; rating: number;
  reviews: number; badge: string | null;
};

function toCard(p: ApiProduct): CardProduct {
  const badge = p.is_featured
    ? "Bestseller"
    : p.product_type === "digital"
    ? "Digital"
    : p.sales_count === 0
    ? "New"
    : null;
  return {
    id: p.id,
    name: p.name,
    price: Number(p.effective_price),
    image: mediaUrl(p.image),
    vendor: p.vendor_name,
    vendorSlug: p.vendor_slug,
    rating: p.average_rating,
    reviews: p.reviews_count,
    badge,
  };
}


function StoreContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type")
    ? VENDOR_TYPES.find(
        (t) => TYPE_TO_API[t] === searchParams.get("type")
      ) ?? "All"
    : "All";

  const [activeType, setActiveType] = useState(initialType);
  const [activeSort, setActiveSort] = useState("Newest");
  const [search, setSearch] = useState("");
  const [priceMax, setPriceMax] = useState(10000);
  const [minRating, setMinRating] = useState(0);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const delay = search.trim() ? 400 : 0;
    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const params: Record<string, string> = {
          ordering: SORT_TO_API[activeSort] || "-created_at",
        };
        if (activeType === "Digital") {
          params.product_type = "digital";
        } else if (activeType !== "All") {
          params.type = TYPE_TO_API[activeType];
        }
        if (search.trim()) params.search = search.trim();
        if (priceMax < 10000) params.max_price = String(priceMax);
        if (productTypes.length === 1) params.product_type = productTypes[0];

        const res = await api.get("/products/", { params });
        let data: CardProduct[] = (res.data as ApiProduct[]).map(toCard);

        // client-side price + rating filters
        if (priceMax < 10000) data = data.filter((p) => Number(p.price) <= priceMax);
        if (minRating > 0) data = data.filter((p) => p.rating >= minRating);
        if (activeSort === "Top Rated") data = [...data].sort((a, b) => b.rating - a.rating);

        setProducts(data);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "CanceledError") console.error(err);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [activeType, activeSort, search, priceMax, minRating, productTypes]);

  const toggleProductType = (type: string) => {
    setProductTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Shop Everything</h1>
        <p className="text-gray-500">
          {loading ? "Loading…" : `${products.length} products from Kenya's top creators`}
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Seller type">
        {VENDOR_TYPES.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={activeType === t}
            onClick={() => setActiveType(t)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={
              activeType === t
                ? { background: "var(--primary)", color: "#fff" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }
            }
          >
            {TYPE_ICON[t] && <span className="mr-1" aria-hidden>{TYPE_ICON[t]}</span>}
            {t}
          </button>
        ))}
      </div>

      <div className="mb-6"><BannerAd page="store" /></div>

      <div className="flex gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-56 shrink-0">
          <FilterPanel
            priceMax={priceMax}
            onPriceChange={setPriceMax}
            minRating={minRating}
            onRatingChange={setMinRating}
            productTypes={productTypes}
            onToggleType={toggleProductType}
          />
        </aside>

        {/* Main grid */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div
              className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="bg-transparent outline-none flex-1 min-w-0 w-full text-gray-300 placeholder-gray-600"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-600 hover:text-gray-400">✕</button>
              )}
            </div>

            <select
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value)}
              aria-label="Sort products"
              className="shrink-0 max-w-[8.5rem] px-3 py-2 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#d1d5db" }}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Filters"
              className="lg:hidden shrink-0 p-2 rounded-xl text-gray-400"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
              </svg>
            </button>
          </div>

          {/* Mobile filter panel */}
          {sidebarOpen && (
            <div
              className="lg:hidden mb-5 p-4 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <FilterPanel
                priceMax={priceMax}
                onPriceChange={setPriceMax}
                minRating={minRating}
                onRatingChange={setMinRating}
                productTypes={productTypes}
                onToggleType={toggleProductType}
              />
            </div>
          )}

          {/* Products grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-600">
              <span className="text-4xl block mb-3">🔍</span>
              <p className="font-medium">No products found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <StoreContent />
    </Suspense>
  );
}

function FilterPanel({
  priceMax, onPriceChange, minRating, onRatingChange, productTypes, onToggleType,
}: {
  priceMax: number;
  onPriceChange: (v: number) => void;
  minRating: number;
  onRatingChange: (v: number) => void;
  productTypes: string[];
  onToggleType: (t: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Price Range</h3>
        <input
          type="range"
          min={0}
          max={10000}
          step={100}
          value={priceMax}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>KSh 0</span>
          <span>KSh {priceMax === 10000 ? "Any" : priceMax.toLocaleString()}</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Product Type</h3>
        <div className="space-y-2">
          {[
            { label: "Physical", value: "physical" },
            { label: "Digital Download", value: "digital" },
            { label: "Event Ticket", value: "ticket" },
          ].map(({ label, value }) => (
            <label key={value} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={productTypes.includes(value)}
                onChange={() => onToggleType(value)}
                className="accent-orange-500 rounded"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Rating</h3>
        <div className="space-y-2">
          {[5, 4, 3].map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white">
              <input
                type="radio"
                name="rating"
                checked={minRating === r}
                onChange={() => onRatingChange(minRating === r ? 0 : r)}
                className="accent-orange-500"
              />
              {"⭐".repeat(r)} &amp; above
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
