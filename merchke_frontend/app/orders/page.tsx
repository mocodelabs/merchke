"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { orderApi, productApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: "rgba(250,204,21,0.15)",  color: "#fbbf24", label: "Pending" },
  confirmed:  { bg: "rgba(99,102,241,0.15)",  color: "#818cf8", label: "Confirmed" },
  processing: { bg: "rgba(249,115,22,0.15)",  color: "#f97316", label: "Processing" },
  shipped:    { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", label: "Shipped" },
  delivered:  { bg: "rgba(16,185,129,0.15)",  color: "#10b981", label: "Delivered" },
  cancelled:  { bg: "rgba(239,68,68,0.15)",   color: "#f87171", label: "Cancelled" },
  refunded:   { bg: "rgba(107,114,128,0.15)", color: "#9ca3af", label: "Refunded" },
};

const DISPUTE_REASONS = [
  { value: "not_received",        label: "Item not received" },
  { value: "wrong_item",          label: "Wrong item delivered" },
  { value: "damaged",             label: "Item arrived damaged" },
  { value: "not_as_described",    label: "Not as described" },
  { value: "digital_not_working", label: "Digital file not working" },
  { value: "no_ticket",           label: "Event ticket not received" },
  { value: "other",               label: "Other" },
];

type OrderItem = {
  id: number; product: number; product_name: string;
  variant: string | null; quantity: number;
  unit_price: number; subtotal: number; download_url?: string;
};

type Order = {
  id: number; order_number: string; status: string;
  delivery_mode: string; delivery_town: string;
  subtotal: number; delivery_fee: number; total_amount: number;
  buyer_confirmed_at: string | null;
  payout_status: string;
  has_dispute: boolean;
  items: OrderItem[];
  created_at: string;
};

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Dispute modal state
  const [disputeOrderId, setDisputeOrderId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState("");

  // Per-order action states
  const [confirming, setConfirming] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.replace("/login?next=/orders"); return; }
    orderApi.list()
      .then((res) => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  const handleConfirmReceipt = async (orderId: number) => {
    setConfirming(orderId);
    try {
      await orderApi.confirmReceipt(orderId);
      setOrders((prev) => prev.map((o) =>
        o.id === orderId
          ? { ...o, buyer_confirmed_at: new Date().toISOString(), payout_status: "released", status: "delivered" }
          : o
      ));
    } catch (e) { console.error(e); }
    finally { setConfirming(null); }
  };

  const handleDisputeSubmit = async () => {
    if (!disputeOrderId || !disputeReason || !disputeDescription.trim()) {
      setDisputeError("Please select a reason and describe the issue.");
      return;
    }
    setDisputeSubmitting(true);
    setDisputeError("");
    try {
      await orderApi.openDispute(disputeOrderId, { reason: disputeReason, description: disputeDescription });
      setOrders((prev) => prev.map((o) => o.id === disputeOrderId ? { ...o, has_dispute: true } : o));
      setDisputeOrderId(null);
      setDisputeReason("");
      setDisputeDescription("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setDisputeError(msg ?? "Failed to submit dispute. Try again.");
    } finally { setDisputeSubmitting(false); }
  };

  const handleDownload = async (productId: number) => {
    setDownloading(productId);
    try {
      const res = await productApi.download(productId);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `product-${productId}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setDownloading(null); }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">My Orders</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${orders.length} order${orders.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/buyer-protection"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <span>🛡️</span> Buyer Protection
          </Link>
          <Link
            href="/store"
            className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: "var(--primary)" }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* Protection notice */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl mb-6 text-sm"
        style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}
      >
        <span className="text-xl shrink-0">🛡️</span>
        <div>
          <p className="font-semibold text-white mb-0.5">Buyer Protection active</p>
          <p className="text-xs text-gray-400">
            Vendor payouts are held for 7 days after delivery. Confirm receipt early to release payment, or open a dispute if something is wrong.{" "}
            <Link href="/buyer-protection" className="underline" style={{ color: "#10b981" }}>Learn more</Link>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex justify-between mb-3"><div className="h-4 w-32 skeleton rounded" /><div className="h-4 w-20 skeleton rounded" /></div>
              <div className="h-3 w-48 skeleton rounded mb-2" /><div className="h-3 w-24 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="text-5xl block mb-4">📦</span>
          <h3 className="text-lg font-bold text-white mb-2">No orders yet</h3>
          <p className="text-gray-500 text-sm mb-6">Discover Kenya's top creators and start shopping</p>
          <Link href="/store" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm" style={{ background: "var(--primary)" }}>
            Shop Now →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const s = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;
            const date = new Date(order.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
            const isOpen = expanded === order.id;
            const canConfirm = !order.buyer_confirmed_at && ["shipped", "delivered"].includes(order.status);
            const canDispute = !order.has_dispute && !["cancelled", "refunded"].includes(order.status);

            return (
              <div key={order.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {/* Order header */}
                <button className="w-full text-left p-5 hover:bg-white/3 transition-colors" onClick={() => setExpanded(isOpen ? null : order.id)}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="text-sm font-mono font-semibold text-white">#{order.order_number}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                        {order.has_dispute && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                            Dispute Open
                          </span>
                        )}
                        {order.buyer_confirmed_at && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                            ✓ Receipt Confirmed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {date} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        {order.delivery_town ? ` · ${order.delivery_town}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-black text-white">KSh {Number(order.total_amount).toLocaleString()}</div>
                        <div className="text-xs text-gray-600">{order.delivery_mode === "pickup" ? "Pickup" : "Delivery"}</div>
                      </div>
                      <svg className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Items */}
                    <div className="p-5 space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 py-2">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "var(--surface-2)" }}>🛍️</div>
                          <div className="flex-1 min-w-0">
                            <Link href={`/products/${item.product}`} className="text-sm font-medium text-white hover:text-orange-400 transition-colors line-clamp-1">
                              {item.product_name}
                            </Link>
                            {item.variant && <p className="text-xs text-gray-500">{item.variant}</p>}
                            <p className="text-xs text-gray-600">Qty: {item.quantity} · KSh {Number(item.unit_price).toLocaleString()} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-white shrink-0">KSh {Number(item.subtotal).toLocaleString()}</div>
                            {/* Digital download button per item */}
                            {item.download_url && (
                              <button
                                onClick={() => handleDownload(item.product)}
                                disabled={downloading === item.product}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-medium shrink-0"
                                style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.2)" }}
                              >
                                {downloading === item.product ? "…" : "⬇ Download"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="px-5 pb-4 space-y-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex justify-between text-xs text-gray-500 pt-4">
                        <span>Subtotal</span><span>KSh {Number(order.subtotal).toLocaleString()}</span>
                      </div>
                      {Number(order.delivery_fee) > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Delivery</span><span>KSh {Number(order.delivery_fee).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-white pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                        <span>Total</span><span>KSh {Number(order.total_amount).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Payout status */}
                    <div className="px-5 pb-3">
                      <div
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                        style={
                          order.payout_status === "released"
                            ? { background: "rgba(16,185,129,0.08)", color: "#6ee7b7" }
                            : { background: "rgba(250,204,21,0.08)", color: "#fcd34d" }
                        }
                      >
                        <span>{order.payout_status === "released" ? "✓" : "⏳"}</span>
                        {order.payout_status === "released"
                          ? "Vendor payout released"
                          : "Vendor payout held — funds secure until you confirm receipt or 7 days pass"}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="px-5 pb-5 flex gap-2 flex-wrap">
                      {/* Confirm Receipt */}
                      {canConfirm && (
                        <button
                          onClick={() => handleConfirmReceipt(order.id)}
                          disabled={confirming === order.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                          style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
                        >
                          {confirming === order.id ? "Confirming…" : "✓ Confirm Receipt"}
                        </button>
                      )}

                      {/* Open Dispute */}
                      {canDispute && (
                        <button
                          onClick={() => { setDisputeOrderId(order.id); setDisputeReason(""); setDisputeDescription(""); setDisputeError(""); }}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                        >
                          ⚠ Open Dispute
                        </button>
                      )}

                      {order.status === "delivered" && (
                        <Link
                          href={`/products/${order.items[0]?.product}#reviews`}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium"
                          style={{ background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid rgba(249,115,22,0.2)" }}
                        >
                          Leave a Review
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dispute modal */}
      {disputeOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Open a Dispute</h3>
              <button onClick={() => setDisputeOrderId(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Describe your issue. The Merchke team will review and respond within 2 business days.
              Vendor payout will be frozen until the dispute is resolved.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">What went wrong?</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: disputeReason ? "#e5e7eb" : "#4b5563" }}
                >
                  <option value="">Select a reason…</option>
                  {DISPUTE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Describe the issue</label>
                <textarea
                  rows={4}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Please be as specific as possible — include dates, what you ordered, and what happened…"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none text-gray-200 placeholder-gray-600 resize-none"
                  style={{ border: "1px solid var(--border)" }}
                />
              </div>

              {disputeError && (
                <p className="text-xs text-red-400">{disputeError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDisputeOrderId(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ border: "1px solid var(--border)", color: "#9ca3af" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisputeSubmit}
                  disabled={disputeSubmitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#dc2626", opacity: disputeSubmitting ? 0.6 : 1 }}
                >
                  {disputeSubmitting ? "Submitting…" : "Submit Dispute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
