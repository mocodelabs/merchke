"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EscrowChip, OrderStatusBadge } from "@/components/orders";
import { orderApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatDate, formatKES, mediaUrl } from "@/lib/config";
import type { Order } from "@/lib/types";
import MediaImage from "@/components/MediaImage";

export default function OrdersPage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login?next=/orders");
      return;
    }
    orderApi.list()
      .then((res) => setOrders(res.data))
      .catch(() => setError("Couldn't load your orders. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [hasHydrated, isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const needsAction = orders.filter((o) => o.escrow?.status === "held" && ["shipped", "delivered"].includes(o.status) && !o.is_ticket_order);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">My Orders</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${orders.length} order${orders.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/buyer-protection"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <span aria-hidden>🛡️</span> Buyer Protection
        </Link>
      </div>

      {needsAction.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl text-sm" style={{ background: "var(--primary-dim)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <p className="font-semibold text-white">
            {needsAction.length} order{needsAction.length > 1 ? "s are" : " is"} on the way to you.
          </p>
          <p className="text-gray-400 mt-0.5">Open {needsAction.length > 1 ? "each one" : "it"} to confirm receipt once it arrives — that&apos;s when the seller gets paid.</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
      ) : error ? (
        <div role="alert" className="text-center py-16 text-gray-400">
          <p className="mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl block mb-4" aria-hidden>📦</span>
          <p className="font-semibold text-white mb-2">No orders yet</p>
          <p className="text-sm text-gray-500 mb-6">Merch, tickets and downloads you buy will show up here.</p>
          <Link href="/store" className="inline-flex px-6 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "var(--primary)" }}>
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const first = o.items[0];
            const title = o.is_ticket_order
              ? o.notes.replace(/^Tickets:\s*/, "")
              : first
                ? `${first.product_name}${o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}`
                : `Order ${o.order_number}`;
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex gap-4 p-4 rounded-2xl card-hover"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-2xl" style={{ background: "var(--surface-2)" }}>
                    {o.is_ticket_order
                      ? <span aria-hidden>🎟️</span>
                      : first?.product_image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <MediaImage src={mediaUrl(first.product_image)} alt="" loading="lazy" className="w-full h-full object-cover" />
                        : <span aria-hidden>🛍️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white line-clamp-2">{title}</p>
                      <span className="text-sm font-bold text-white shrink-0">{formatKES(o.total_amount)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {o.order_number} · {formatDate(o.created_at)}
                      {first?.vendor_name && !o.is_ticket_order ? ` · ${first.vendor_name}` : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                      <OrderStatusBadge status={o.status} />
                      <EscrowChip escrow={o.escrow} />
                      {o.status === "pending" && (
                        <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Pay now →</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
