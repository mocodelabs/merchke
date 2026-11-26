"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import MpesaPaymentModal from "@/components/MpesaPaymentModal";
import { orderApi, paymentApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { apiErrorMessage, formatKES } from "@/lib/config";
import type { MpesaTransaction, Order } from "@/lib/types";
import MediaImage from "@/components/MediaImage";

const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos", "Kajiado", "Uasin Gishu", "Kilifi",
  "Nyeri", "Meru", "Kakamega", "Kericho", "Embu", "Murang'a", "Laikipia", "Bungoma", "Other",
];

const inputClass = "w-full px-3 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-orange-500";
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)" };

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const router = useRouter();

  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [form, setForm] = useState({ county: "Nairobi", town: "", address: "", deliveryPhone: "", notes: "" });
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txn, setTxn] = useState<MpesaTransaction | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [chargedTotal, setChargedTotal] = useState(0);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace("/login?next=/checkout");
  }, [hasHydrated, isAuthenticated, router]);

  const sellers = new Set(items.map((i) => i.vendor)).size;
  const estimatedDelivery = mode === "delivery" ? 200 * sellers : 0;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handlePay = async () => {
    setError("");
    if (mode === "delivery" && (!form.town.trim() || !form.address.trim())) {
      setError("Add your town/estate and street address so the seller can deliver.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 9) {
      setError("Enter the Safaricom number to pay with.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await orderApi.checkout({
        items: items.map((i) => ({ product_id: i.id, variant_id: i.variantId ?? null, quantity: i.quantity })),
        phone,
        delivery_mode: mode,
        delivery_address: form.address,
        delivery_town: form.town,
        delivery_county: form.county,
        delivery_phone: form.deliveryPhone || phone,
        notes: form.notes,
      });
      setOrders(res.data.orders);
      setChargedTotal(Number(res.data.total));
      setTxn(res.data.transaction);
    } catch (err) {
      setError(apiErrorMessage(err, "Checkout failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  if (items.length === 0 && !txn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <span className="text-6xl block mb-6" aria-hidden>🛒</span>
        <h1 className="text-2xl font-bold text-white mb-3">Your cart is empty</h1>
        <Link href="/store" className="inline-flex px-7 py-4 rounded-xl font-semibold text-white" style={{ background: "var(--primary)" }}>
          Browse the store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-white mb-2">Checkout</h1>
      <p className="text-sm text-gray-500 mb-8 flex items-center gap-2">
        <span aria-hidden>🛡️</span> Your money is held by Merchke until you confirm you received your order.
      </p>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery */}
          <section className="p-6 rounded-2xl space-y-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-bold text-white">1. Delivery</h2>
            <div className="grid grid-cols-2 gap-3">
              {(["delivery", "pickup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="p-4 rounded-xl text-left transition-all"
                  style={mode === m
                    ? { background: "var(--primary-dim)", border: "2px solid var(--primary)" }
                    : { background: "var(--surface-2)", border: "2px solid var(--border)" }}
                >
                  <span className="text-xl block mb-1" aria-hidden>{m === "delivery" ? "🚚" : "📍"}</span>
                  <span className="text-sm font-semibold text-white block">{m === "delivery" ? "Deliver to me" : "I'll pick up"}</span>
                  <span className="text-xs text-gray-500">{m === "delivery" ? "KSh 200 per seller" : "Arrange with the seller"}</span>
                </button>
              ))}
            </div>

            {mode === "delivery" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="county" className="block text-xs font-medium text-gray-400 mb-1.5">County</label>
                  <select id="county" value={form.county} onChange={(e) => set("county", e.target.value)} className={inputClass} style={inputStyle}>
                    {COUNTIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="town" className="block text-xs font-medium text-gray-400 mb-1.5">Town / Estate *</label>
                  <input id="town" value={form.town} onChange={(e) => set("town", e.target.value)} placeholder="e.g. Kilimani" className={inputClass} style={inputStyle} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-xs font-medium text-gray-400 mb-1.5">Street address / landmark *</label>
                  <input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="e.g. Ngong Road, opposite Prestige Plaza" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="dphone" className="block text-xs font-medium text-gray-400 mb-1.5">Delivery contact phone</label>
                  <input id="dphone" type="tel" inputMode="tel" value={form.deliveryPhone} onChange={(e) => set("deliveryPhone", e.target.value)} placeholder="Same as M-Pesa number" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-xs font-medium text-gray-400 mb-1.5">Note to seller</label>
                  <input id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" className={inputClass} style={inputStyle} />
                </div>
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="p-6 rounded-2xl space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-bold text-white">2. Pay with M-Pesa</h2>
            <div>
              <label htmlFor="mpesa" className="block text-xs font-medium text-gray-400 mb-1.5">M-Pesa phone number</label>
              <div className="flex items-center rounded-xl overflow-hidden" style={inputStyle}>
                <span className="pl-3 text-sm text-gray-500 shrink-0">🇰🇪</span>
                <input
                  id="mpesa"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="flex-1 bg-transparent px-3 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1.5">You&apos;ll get an STK prompt on this phone. Enter your PIN there — never share it.</p>
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={submitting}
              className="w-full py-4 rounded-xl font-bold text-white disabled:opacity-60 glow-orange"
              style={{ background: "var(--primary)" }}
            >
              {submitting ? "Sending M-Pesa prompt…" : `Pay ${formatKES(total + estimatedDelivery)} with M-Pesa`}
            </button>
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl p-5 lg:sticky lg:top-20" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-base font-bold text-white mb-4">Order summary</h3>
            <ul className="space-y-3 mb-4">
              {items.map((item) => (
                <li key={`${item.id}:${item.variantId ?? 0}`} className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                    {item.image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <MediaImage src={item.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                      : <span aria-hidden>🛍️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 truncate">{item.name}</p>
                    <p className="text-gray-600 text-xs">{item.variant ? `${item.variant} · ` : ""}×{item.quantity}</p>
                  </div>
                  <span className="text-white font-medium shrink-0">{formatKES(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 pt-4 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatKES(total)}</span></div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span><span>{mode === "delivery" ? `≈ ${formatKES(estimatedDelivery)}` : "Pickup"}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="text-white">Total</span>
                <span style={{ color: "var(--primary)" }}>{formatKES(total + estimatedDelivery)}</span>
              </div>
              <p className="text-xs text-gray-600">Digital items ship free; the exact total is confirmed when you pay.</p>
            </div>
          </div>
        </aside>
      </div>

      <MpesaPaymentModal
        open={txn !== null}
        phone={txn?.phone ?? phone}
        amount={chargedTotal}
        title="Complete your payment"
        description={orders.length > 1 ? `${orders.length} orders — one per seller, paid together.` : undefined}
        check={async () => {
          if (!txn) return { status: "pending" };
          const { data } = await paymentApi.transaction(txn.id);
          if (data.status === "completed") {
            clearCart();
            return { status: "paid" };
          }
          if (data.status === "failed") return { status: "failed", error: data.result_desc || "Payment was cancelled." };
          return { status: "pending" };
        }}
        onRetry={async () => {
          if (!txn) return;
          const { data } = await paymentApi.retry(txn.id, phone);
          setTxn(data);
        }}
        onClose={() => router.push(orders.length === 1 ? `/orders/${orders[0].id}` : "/orders")}
        paidTitle="Order confirmed!"
        paidBody={
          <>
            Thanks{user?.username ? `, ${user.username}` : ""}! Your money is safely held until you confirm delivery.
            {orders.length > 0 && <span className="block mt-2 font-mono text-xs" style={{ color: "var(--accent)" }}>{orders.map((o) => o.order_number).join(" · ")}</span>}
          </>
        }
        paidActions={
          <>
            <Link href={orders.length === 1 ? `/orders/${orders[0].id}` : "/orders"} className="w-full py-3.5 rounded-xl font-bold text-white text-center" style={{ background: "var(--primary)" }}>
              Track my order
            </Link>
            <Link href="/store" className="w-full py-3 rounded-xl font-semibold text-sm text-gray-300 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              Keep shopping
            </Link>
          </>
        }
      />
    </div>
  );
}
