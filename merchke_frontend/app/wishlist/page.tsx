"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { wishlistApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { useCart } from "@/components/CartProvider";
import { mediaUrl } from "@/lib/config";
import MediaImage from "@/components/MediaImage";


type WishlistItem = {
  id: number;
  product: number;
  added_at: string;
  product_detail: {
    id: number; name: string; effective_price: number; price: number;
    image: string; vendor_name: string; vendor_slug: string;
    average_rating: number; reviews_count: number;
    in_stock: boolean; product_type: string; is_featured: boolean; sales_count: number;
  };
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} className="w-3 h-3" fill={s <= Math.round(rating) ? "#f97316" : "none"} stroke="#f97316" strokeWidth={1.5} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  const { addItem } = useCart();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [addedToCart, setAddedToCart] = useState<number | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login?next=/wishlist");
      return;
    }
    wishlistApi.list()
      .then((res) => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [hasHydrated, isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const handleRemove = async (productId: number) => {
    setRemoving(productId);
    try {
      await wishlistApi.remove(productId);
      setItems((prev) => prev.filter((i) => i.product !== productId));
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving(null);
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    const p = item.product_detail;
    addItem({
      id: p.id,
      name: p.name,
      price: p.effective_price,
      image: mediaUrl(p.image),
      vendor: p.vendor_name,
    });
    setAddedToCart(p.id);
    setTimeout(() => setAddedToCart(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">My Wishlist</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${items.length} saved item${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {items.length > 0 && (
          <Link href="/store" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            Continue shopping →
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="aspect-square skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
                <div className="h-10 skeleton rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="text-5xl block mb-4">🤍</span>
          <h3 className="text-lg font-bold text-white mb-2">Your wishlist is empty</h3>
          <p className="text-gray-500 text-sm mb-6">
            Save items you love and come back to them later
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm"
            style={{ background: "var(--primary)" }}
          >
            Browse Products →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const p = item.product_detail;
              const inCart = addedToCart === p.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden group"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {/* Image */}
                  <Link href={`/products/${p.id}`} className="block relative aspect-square overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    {p.image ? (
                      <MediaImage
                        src={mediaUrl(p.image)}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">🛍️</div>
                    )}
                    {!p.in_stock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-xs font-bold text-white px-3 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.9)" }}>
                          Out of Stock
                        </span>
                      </div>
                    )}
                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleRemove(p.id); }}
                      disabled={removing === p.id}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }}
                      title="Remove from wishlist"
                    >
                      {removing === p.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    <Link href={`/vendors/${p.vendor_slug}`} className="text-xs text-gray-500 hover:text-orange-400 transition-colors">
                      {p.vendor_name}
                    </Link>
                    <Link href={`/products/${p.id}`} className="block text-sm font-semibold text-white leading-snug mt-0.5 mb-2 hover:text-orange-400 transition-colors line-clamp-2">
                      {p.name}
                    </Link>

                    <div className="flex items-center gap-1.5 mb-3">
                      <StarRow rating={p.average_rating} />
                      <span className="text-xs text-gray-600">({p.reviews_count})</span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-black text-white">
                        KSh {Number(p.effective_price).toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={!p.in_stock || inCart}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                      style={{ background: inCart ? "var(--accent)" : "var(--primary)" }}
                    >
                      {!p.in_stock ? "Out of Stock" : inCart ? "✓ Added to Cart" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bulk action bar */}
          <div
            className="mt-8 flex items-center justify-between p-4 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm text-gray-400">
              {items.filter((i) => i.product_detail.in_stock).length} of {items.length} items in stock
            </p>
            <Link
              href="/cart"
              className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: "var(--primary)" }}
            >
              View Cart →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
