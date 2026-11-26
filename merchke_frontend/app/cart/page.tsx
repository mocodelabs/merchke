"use client";
import Link from "next/link";
import { cartKey, useCart } from "@/components/CartProvider";
import { formatKES } from "@/lib/config";
import MediaImage from "@/components/MediaImage";

export default function CartPage() {
  const { items, removeItem, updateQty, total, count } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <span className="text-6xl block mb-6">🛒</span>
        <h1 className="text-2xl font-bold text-white mb-3">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Add products from Kenyan creators to get started.</p>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-white"
          style={{ background: "var(--primary)" }}
        >
          Browse Store
        </Link>
      </div>
    );
  }

  const sellers = new Set(items.map((i) => i.vendor)).size;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-white mb-8">
        Your Cart ({count} {count === 1 ? "item" : "items"})
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={cartKey(item)}
              className="flex gap-4 p-4 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Image */}
              <div
                className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center text-2xl overflow-hidden"
                style={{ background: "var(--surface-2)" }}
              >
                {item.image ? (
                  <MediaImage src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                ) : "🛍️"}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{item.vendor}</p>
                    {item.variant && (
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded mt-1"
                        style={{ background: "var(--surface-2)", color: "#9ca3af" }}
                      >
                        {item.variant}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(cartKey(item))}
                    aria-label={`Remove ${item.name}${item.variant ? ` (${item.variant})` : ""} from cart`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                    style={{ border: "1px solid rgba(248,113,113,0.3)" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                    </svg>
                    <span>Remove</span>
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  {/* Qty stepper */}
                  <div
                    className="inline-flex items-center rounded-lg overflow-hidden"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <button
                      onClick={() => updateQty(cartKey(item), item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(cartKey(item), item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-white">
                    {formatKES(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Continue shopping */}
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-sm font-medium mt-2"
            style={{ color: "var(--primary)" }}
          >
            ← Continue Shopping
          </Link>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div
            className="rounded-2xl p-6 sticky top-20"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold text-white mb-5">Order Summary</h2>

            <div className="space-y-3 mb-5 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Delivery</span>
                <span className="text-white font-medium text-right">
                  KSh 200 per seller{sellers > 1 ? ` (${sellers} sellers)` : ""}
                  <span className="block text-xs text-gray-600 font-normal">Free for digital items</span>
                </span>
              </div>
              <div
                className="flex justify-between pt-3 font-bold text-base"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span className="text-white">Subtotal</span>
                <span style={{ color: "var(--primary)" }}>{formatKES(total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full py-4 rounded-xl font-bold text-white text-center text-base transition-all glow-orange mb-3"
              style={{ background: "var(--primary)" }}
            >
              Proceed to Checkout
            </Link>

            {/* M-Pesa */}
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-xs"
              style={{ background: "var(--accent-dim)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="text-lg">📱</span>
              <span style={{ color: "var(--accent)" }}>Pay via M-Pesa at checkout</span>
            </div>

            {/* Promo code */}
            <div className="mt-4">
              <div
                className="flex gap-2 rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <input
                  placeholder="Promo code"
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-300 placeholder-gray-600 outline-none"
                />
                <button
                  className="px-4 text-sm font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--primary)" }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
