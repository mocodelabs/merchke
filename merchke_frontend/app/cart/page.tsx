"use client";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function CartPage() {
  const { items, removeItem, updateQty, total } = useCart();

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

  const delivery = 200;
  const grandTotal = total + delivery;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-white mb-8">
        Your Cart ({items.reduce((s, i) => s + i.quantity, 0)} items)
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Image */}
              <div
                className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center text-2xl"
                style={{ background: "var(--surface-2)" }}
              >
                🛍️
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{item.vendor}</p>
                    {item.variant && (
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded mt-1"
                        style={{ background: "var(--surface-2)", color: "#9ca3af" }}
                      >
                        Size: {item.variant}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  {/* Qty stepper */}
                  <div
                    className="inline-flex items-center rounded-lg overflow-hidden"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-white">
                    KSh {(item.price * item.quantity).toLocaleString()}
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
                <span>Subtotal</span>
                <span className="text-white font-medium">KSh {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery</span>
                <span className="text-white font-medium">KSh {delivery}</span>
              </div>
              <div
                className="flex justify-between pt-3 font-bold text-base"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span className="text-white">Total</span>
                <span style={{ color: "var(--primary)" }}>KSh {grandTotal.toLocaleString()}</span>
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
