"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  vendor: string;
  vendorSlug: string;
  rating: number;
  reviews: number;
  badge?: string | null;
}

const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  Bestseller: { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
  New:        { bg: "rgba(16,185,129,0.15)",  color: "#10b981" },
  Digital:    { bg: "rgba(99,102,241,0.15)",  color: "#818cf8" },
};

export default function ProductCard({ product }: { product: Product }) {
  const { id, name, price, image, vendor, rating, reviews, badge } = product;
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ id, name, price, image: image || "", vendor });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const badgeStyle = badge ? (BADGE_STYLE[badge] ?? { bg: "rgba(255,255,255,0.1)", color: "#fff" }) : null;

  return (
    <Link
      href={`/products/${id}`}
      className="group block rounded-2xl overflow-hidden card-hover"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden" style={{ background: "var(--surface-2)" }}>
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-5xl"
            style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)" }}
          >
            🛍️
          </div>
        )}

        {badge && badgeStyle && (
          <span
            className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full z-10"
            style={{ background: badgeStyle.bg, color: badgeStyle.color }}
          >
            {badge}
          </span>
        )}

        {/* Quick Add overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end p-3">
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-xl text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
            style={{ background: added ? "#10b981" : "var(--primary)" }}
          >
            {added ? "✓ Added" : "Quick Add"}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1 truncate">{vendor}</p>
        <h3 className="text-sm font-semibold text-white leading-snug mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors">
          {name}
        </h3>

        <div className="flex items-center gap-1 mb-3">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg key={star} className="w-3 h-3" fill={star <= Math.round(rating) ? "#f97316" : "none"} stroke="#f97316" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-gray-600">({reviews})</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-white">KSh {price.toLocaleString()}</span>
          <button
            onClick={handleAdd}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all hover:scale-110"
            style={added
              ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
              : { background: "var(--primary-dim)", color: "var(--primary)" }
            }
          >
            {added ? "✓" : "+"}
          </button>
        </div>
      </div>
    </Link>
  );
}
