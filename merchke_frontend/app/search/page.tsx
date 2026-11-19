"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { mediaUrl } from "@/lib/config";


type Product = {
  id: number; name: string; effective_price: number; image?: string;
  vendor_name: string; vendor_slug: string; average_rating: number;
  reviews_count: number; in_stock: boolean; product_type: string;
};
type Event = {
  id: number; title: string; date: string; genre: string;
  venue_name: string; town: string; banner_image?: string;
  vendor_name: string; ticket_types: { price: number }[];
};
type Vendor = {
  id: number; brand_name: string; slug: string; logo?: string;
  vendor_type: string; county: string; is_verified: boolean;
  products_count: number; bio?: string;
};

type Tab = "all" | "products" | "events" | "vendors";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [tab, setTab] = useState<Tab>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputVal, setInputVal] = useState(q);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setInputVal(q);
    if (!q) { setProducts([]); setEvents([]); setVendors([]); return; }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);

    Promise.all([
      api.get("/products/", { params: { search: q }, signal: ctrl.signal }),
      api.get("/events/", { params: { search: q }, signal: ctrl.signal }),
      api.get("/vendors/", { params: { search: q }, signal: ctrl.signal }),
    ])
      .then(([pRes, eRes, vRes]) => {
        setProducts(pRes.data);
        setEvents(eRes.data);
        setVendors(vRes.data);
      })
      .catch((err) => { if (err?.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => setLoading(false));
  }, [q]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputVal.trim();
    if (v) router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const totalResults = products.length + events.length + vendors.length;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: totalResults },
    { id: "products", label: "Products", count: products.length },
    { id: "events", label: "Events", count: events.length },
    { id: "vendors", label: "Vendors", count: vendors.length },
  ];

  const showProducts = tab === "all" || tab === "products";
  const showEvents = tab === "all" || tab === "events";
  const showVendors = tab === "all" || tab === "vendors";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <div
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search merch, artists, events…"
            autoFocus
            className="bg-transparent outline-none flex-1 text-white placeholder-gray-600 text-sm"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => { setInputVal(""); router.push("/search"); }}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-5 py-3 rounded-xl font-semibold text-white text-sm"
          style={{ background: "var(--primary)" }}
        >
          Search
        </button>
      </form>

      {/* State: no query */}
      {!q && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-white font-bold mb-2">Search Merchke</p>
          <p className="text-sm text-gray-500">Find products, events, and creators across Kenya</p>
        </div>
      )}

      {/* Loading */}
      {q && loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="w-16 h-16 skeleton rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {q && !loading && (
        <>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-400">
              {totalResults === 0 ? (
                <>No results for <span className="text-white font-semibold">&quot;{q}&quot;</span></>
              ) : (
                <><span className="text-white font-semibold">{totalResults}</span> results for &quot;{q}&quot;</>
              )}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
                style={
                  tab === t.id
                    ? { background: "var(--primary)", color: "#fff" }
                    : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }
                }
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: tab === t.id ? "rgba(255,255,255,0.2)" : "var(--border)" }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {totalResults === 0 ? (
            <div
              className="text-center py-16 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-4xl mb-4">😔</p>
              <p className="text-white font-bold mb-2">Nothing found</p>
              <p className="text-sm text-gray-500 mb-6">Try different keywords or browse the store</p>
              <Link href="/store" className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: "var(--primary)" }}>
                Browse All Products
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Products section */}
              {showProducts && products.length > 0 && (
                <section>
                  {tab === "all" && <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Products</h2>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.id}`}
                        className="group rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <div className="aspect-square relative overflow-hidden" style={{ background: "var(--surface-2)" }}>
                          {p.image ? (
                            <img src={mediaUrl(p.image)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
                          )}
                          <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full capitalize font-medium text-white" style={{ background: "rgba(0,0,0,0.6)" }}>
                            {p.product_type}
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-gray-500 mb-0.5">{p.vendor_name}</p>
                          <p className="text-sm font-semibold text-white line-clamp-2 mb-2">{p.name}</p>
                          <p className="text-sm font-black text-white">KSh {Number(p.effective_price).toLocaleString()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {tab === "all" && products.length >= 6 && (
                    <Link href={`/store?search=${encodeURIComponent(q)}`} className="mt-3 text-xs font-semibold block text-center" style={{ color: "var(--primary)" }}>
                      See all {products.length} products →
                    </Link>
                  )}
                </section>
              )}

              {/* Events section */}
              {showEvents && events.length > 0 && (
                <section>
                  {tab === "all" && <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Events</h2>}
                  <div className="space-y-3">
                    {events.map((ev) => {
                      const minPrice = ev.ticket_types.length
                        ? Math.min(...ev.ticket_types.map((t) => t.price))
                        : null;
                      const d = new Date(ev.date);
                      return (
                        <Link
                          key={ev.id}
                          href={`/events/${ev.id}`}
                          className="flex gap-4 p-4 rounded-2xl transition-all hover:border-orange-500/40 group"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                        >
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
                            {ev.banner_image ? (
                              <img src={mediaUrl(ev.banner_image)} alt={ev.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🎵</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate group-hover:text-orange-400 transition-colors">{ev.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · {ev.venue_name}, {ev.town}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 rounded-full capitalize font-medium text-white" style={{ background: "rgba(249,115,22,0.15)", color: "var(--primary)" }}>{ev.genre}</span>
                              {minPrice !== null && (
                                <span className="text-xs text-gray-400">from KSh {Number(minPrice).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-gray-600 shrink-0 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Vendors section */}
              {showVendors && vendors.length > 0 && (
                <section>
                  {tab === "all" && <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Vendors</h2>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vendors.map((v) => (
                      <Link
                        key={v.id}
                        href={`/vendors/${v.slug}`}
                        className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:border-orange-500/40 group"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold text-white" style={{ background: "var(--primary)" }}>
                          {v.logo ? (
                            <img src={mediaUrl(v.logo)} alt={v.brand_name} className="w-full h-full object-cover" />
                          ) : (
                            v.brand_name[0]
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-white font-semibold text-sm truncate group-hover:text-orange-400 transition-colors">{v.brand_name}</p>
                            {v.is_verified && (
                              <svg className="w-3.5 h-3.5 shrink-0" fill="#3b82f6" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 capitalize mt-0.5">{v.vendor_type} · {v.county}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{v.products_count} product{v.products_count !== 1 ? "s" : ""}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
