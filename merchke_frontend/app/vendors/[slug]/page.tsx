"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { vendorApi, productApi } from "@/lib/api";

const TYPE_EMOJI: Record<string, string> = {
  artist: "🎨", dj: "🎧", creative: "🎭",
  jersey: "👕", brand: "🏷️", events: "🎟️", digital: "📲",
};
const TYPE_LABEL: Record<string, string> = {
  artist: "Artist", dj: "DJ", creative: "Creative",
  jersey: "Jersey Vendor", brand: "Local Brand", events: "Events", digital: "Digital",
};

type Vendor = {
  id: number; brand_name: string; vendor_type: string; slug: string;
  bio: string; tagline: string; location: string; county: string;
  profile_image: string | null; logo: string | null; banner: string | null;
  instagram_handle: string; twitter_handle: string; tiktok_handle: string; website: string;
  is_verified: boolean; average_rating: number; total_reviews: number;
  products_count: number; created_at: string;
};

type ApiProduct = {
  id: number; name: string; effective_price: number; price: number;
  image: string; vendor_name: string; vendor_slug: string;
  average_rating: number; reviews_count: number;
  is_featured: boolean; product_type: string; sales_count: number;
};

function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");
  return `${base}${path}`;
}

function toCard(p: ApiProduct) {
  return {
    id: p.id, name: p.name, price: p.effective_price,
    image: mediaUrl(p.image), vendor: p.vendor_name, vendorSlug: p.vendor_slug,
    rating: p.average_rating, reviews: p.reviews_count,
    badge: p.is_featured ? "Bestseller" : p.product_type === "digital" ? "Digital" : p.sales_count === 0 ? "New" : null,
  };
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} className="w-3.5 h-3.5" fill={s <= Math.round(rating) ? "#f97316" : "none"} stroke="#f97316" strokeWidth={1.5} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function VendorStorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<ReturnType<typeof toCard>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      vendorApi.detail(slug),
      productApi.byVendor(slug),
    ])
      .then(([vRes, pRes]) => {
        setVendor(vRes.data);
        setProducts((pRes.data as ApiProduct[]).map(toCard));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <StoreSkeleton />;

  if (!vendor) {
    return (
      <div className="text-center py-24 text-gray-500">
        <span className="text-5xl block mb-4">🏪</span>
        <p className="text-lg font-semibold text-white mb-2">Store not found</p>
        <Link href="/store" className="text-sm" style={{ color: "var(--primary)" }}>← Back to shop</Link>
      </div>
    );
  }

  const joinedYear = new Date(vendor.created_at).getFullYear();
  const emoji = TYPE_EMOJI[vendor.vendor_type] ?? "🏪";
  const typeLabel = TYPE_LABEL[vendor.vendor_type] ?? "Vendor";
  const filtered = products.filter((p) =>
    search ? p.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div>
      {/* Banner */}
      <div className="h-52 md:h-64 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0900 0%, #2d1200 50%, #1a0900 100%)" }}>
        {vendor.banner ? (
          <img src={mediaUrl(vendor.banner)} alt="" className="w-full h-full object-cover opacity-60" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at center, var(--primary) 0%, transparent 70%)" }} />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "20px 20px" }} />
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Store header */}
        <div className="relative -mt-12 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {/* Logo / avatar */}
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl shrink-0 overflow-hidden"
              style={{ background: "var(--surface)", border: "3px solid var(--background)" }}
            >
              {vendor.logo ? (
                <img src={mediaUrl(vendor.logo)} alt={vendor.brand_name} className="w-full h-full object-cover" />
              ) : (
                <span>{emoji}</span>
              )}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-white">{vendor.brand_name}</h1>
                {vendor.is_verified && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                  {typeLabel}
                </span>
              </div>
              {vendor.tagline && <p className="text-sm text-gray-400 mb-1">{vendor.tagline}</p>}
              <p className="text-sm text-gray-500">
                {[vendor.location, vendor.county].filter(Boolean).join(", ")}
                {(vendor.location || vendor.county) ? " · " : ""}
                Joined {joinedYear}
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              {vendor.instagram_handle && (
                <a
                  href={`https://instagram.com/${vendor.instagram_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  title={`Instagram: ${vendor.instagram_handle}`}
                >
                  📸
                </a>
              )}
              {vendor.twitter_handle && (
                <a
                  href={`https://twitter.com/${vendor.twitter_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  title={`Twitter: ${vendor.twitter_handle}`}
                >
                  🐦
                </a>
              )}
              {vendor.tiktok_handle && (
                <a
                  href={`https://tiktok.com/@${vendor.tiktok_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  title={`TikTok: ${vendor.tiktok_handle}`}
                >
                  🎵
                </a>
              )}
              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  🌐 Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="flex flex-wrap gap-6 p-5 rounded-2xl mb-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {[
            { label: "Products", value: vendor.products_count },
            { label: "Rating", value: vendor.average_rating > 0 ? `${vendor.average_rating} ★` : "No ratings" },
            { label: "Reviews", value: vendor.total_reviews },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
          {vendor.average_rating > 0 && (
            <div className="flex items-end pb-1">
              <StarRow rating={vendor.average_rating} />
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5 text-sm" style={{ color: "var(--accent)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
            M-Pesa Accepted
          </div>
        </div>

        {/* Bio + socials layout */}
        {vendor.bio && (
          <div className="mb-10">
            <p className="text-gray-400 leading-relaxed max-w-3xl">{vendor.bio}</p>
          </div>
        )}

        {/* Products section */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">
            All Products ({vendor.products_count})
          </h2>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-56"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="bg-transparent outline-none flex-1 text-gray-300 placeholder-gray-600 text-xs"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <span className="text-4xl block mb-3">📭</span>
            <p>This store has no products yet.</p>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-600">
            <span className="text-4xl block mb-3">🔍</span>
            <p>No products match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StoreSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-52 skeleton" />
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-5 -mt-12 mb-8">
          <div className="w-24 h-24 rounded-2xl skeleton shrink-0" />
          <div className="flex-1 pt-6 space-y-2">
            <div className="h-7 w-48 skeleton rounded" />
            <div className="h-4 w-64 skeleton rounded" />
          </div>
        </div>
        <div className="h-20 skeleton rounded-2xl mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)" }}>
              <div className="aspect-square skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-2/3 skeleton rounded" />
                <div className="h-4 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
