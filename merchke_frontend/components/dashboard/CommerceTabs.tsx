"use client";
import { useState } from "react";
import Link from "next/link";
import MpesaPaymentModal from "@/components/MpesaPaymentModal";
import { EscrowBanner, OrderStatusBadge } from "@/components/orders";
import { FEE_PILL, ListSkeleton, NewButton, Panel, PanelEmpty, PanelError, Pill, useLoad } from "./shared";
import { orderApi, productApi, vendorApi } from "@/lib/api";
import { LISTING_FEE_KSH, apiErrorMessage, formatDate, formatKES, mediaUrl } from "@/lib/config";
import type { Order, Product, VendorDashboard } from "@/lib/types";

// ── Overview ─────────────────────────────────────────────────────────────────

export function OverviewTab() {
  const stats = useLoad<VendorDashboard | null>(() => vendorApi.getDashboard(), null);
  const orders = useLoad<Order[]>(() => orderApi.vendorOrders(), []);
  const s = stats.data;

  const monthly = s ? Object.entries(s.monthly_stats).map(([month, d]) => ({ month, ...d })) : [];
  const maxRev = Math.max(1, ...monthly.map((m) => m.revenue));

  const cards = s ? [
    { label: "Paid out to you", value: formatKES(s.earnings.released), icon: "💰", tone: "var(--accent)" },
    { label: "Held in escrow", value: formatKES(s.earnings.held), icon: "🔒", tone: "#60a5fa" },
    { label: "Orders to ship", value: String(s.orders_to_ship), icon: "📦", tone: s.orders_to_ship ? "var(--primary)" : "#9ca3af" },
    { label: "Products", value: String(s.products_count), icon: "🛍️", tone: "#d1d5db" },
  ] : [];

  return (
    <div className="space-y-6">
      {stats.error && <PanelError message={stats.error} onRetry={stats.reload} />}
      {s && s.pending_listing_fees > 0 && (
        <Link href="/dashboard?tab=products" className="block p-4 rounded-2xl text-sm" style={{ background: "var(--primary-dim)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <strong className="text-white">{s.pending_listing_fees} listing{s.pending_listing_fees > 1 ? "s are" : " is"} waiting for the KSh {LISTING_FEE_KSH} fee.</strong>
          <span className="text-gray-400"> Pay to put {s.pending_listing_fees > 1 ? "them" : "it"} live →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)
          : cards.map((c) => (
            <div key={c.label} className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-2xl" aria-hidden>{c.icon}</span>
              <div className="text-lg sm:text-xl font-black mt-2" style={{ color: c.tone }}>{c.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
            </div>
          ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
        <Panel title={`Earnings ${new Date().getFullYear()}`}>
          <div className="p-5">
            {stats.loading ? <div className="h-40 skeleton rounded-xl" /> : (
              <div className="flex items-end gap-1.5 h-40" role="img" aria-label="Monthly earnings chart">
                {monthly.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${m.month}: ${formatKES(m.revenue)}`}>
                    <div className="w-full rounded-t-md" style={{ height: `${(m.revenue / maxRev) * 100}%`, minHeight: 3, background: m.revenue ? "var(--primary)" : "var(--surface-2)" }} />
                    <span className="text-[10px] text-gray-600">{m.month[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
        </div>
        <div className="lg:col-span-3">
          <Panel title="Recent orders" action={<Link href="/dashboard?tab=orders" className="text-xs" style={{ color: "var(--primary)" }}>All →</Link>}>
            {orders.loading ? <ListSkeleton /> : orders.data.length === 0 ? (
              <PanelEmpty icon="🧾" text="No orders yet. Share your store link to get your first sale." />
            ) : (
              <ul>
                {orders.data.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {o.is_ticket_order ? o.notes.replace(/^Tickets:\s*/, "") : o.items.map((i) => i.product_name).join(", ")}
                      </p>
                      <p className="text-xs text-gray-500">{o.order_number} · {o.buyer_name} · {formatKES(o.total_amount)}</p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ── Products ─────────────────────────────────────────────────────────────────

export function ProductsTab() {
  const { data: products, loading, error, reload } = useLoad<Product[]>(() => productApi.mine(), []);
  const [paying, setPaying] = useState<{ product: Product; phone: string } | null>(null);
  const [payError, setPayError] = useState("");

  const payFee = async (product: Product) => {
    setPayError("");
    try {
      const { data } = await productApi.retryListingFee(product.id);
      setPaying({ product, phone: data.phone });
    } catch (err) {
      setPayError(apiErrorMessage(err));
    }
  };

  return (
    <Panel title={`My products (${products.length})`} action={<NewButton href="/dashboard/products/new">+ Add product</NewButton>}>
      {payError && <p role="alert" className="px-5 pt-4 text-sm" style={{ color: "#f87171" }}>{payError}</p>}
      {loading ? <ListSkeleton /> : error ? <PanelError message={error} onRetry={reload} /> : products.length === 0 ? (
        <PanelEmpty icon="📭" text="No products yet." action={<NewButton href="/dashboard/products/new">Add your first product</NewButton>} />
      ) : (
        <ul>
          {products.map((p) => {
            const fee = p.listing_fee_status ? FEE_PILL[p.listing_fee_status] : null;
            const needsFee = p.listing_fee_status && p.listing_fee_status !== "paid";
            return (
              <li key={p.id} className="flex items-center gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image && <img src={mediaUrl(p.image)} alt="" loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatKES(p.effective_price)} · {p.product_type === "digital" ? "Digital" : `${p.stock} in stock`} · {p.sales_count} sold
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {fee ? <Pill color={fee.color} bg={fee.bg}>{fee.label}</Pill>
                      : <Pill color={p.is_active ? "#10b981" : "#9ca3af"} bg={p.is_active ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)"}>{p.is_active ? "Live" : "Hidden"}</Pill>}
                    {!p.in_stock && <Pill color="#f87171" bg="rgba(239,68,68,0.15)">Out of stock</Pill>}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  {needsFee && (
                    <button onClick={() => payFee(p)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--primary)" }}>
                      Pay {formatKES(LISTING_FEE_KSH)}
                    </button>
                  )}
                  <Link href={`/dashboard/edit-product/${p.id}`} className="text-xs font-medium" style={{ color: "var(--primary)" }}>Edit</Link>
                  {p.is_active && <Link href={`/products/${p.id}`} className="text-xs text-gray-400 hover:text-white">View</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <MpesaPaymentModal
        open={paying !== null}
        phone={paying?.phone ?? ""}
        amount={LISTING_FEE_KSH}
        title="Pay listing fee"
        description={paying?.product.name}
        timeoutSeconds={600}
        check={async () => {
          if (!paying) return { status: "pending" };
          const { data } = await productApi.listingFeeStatus(paying.product.id);
          if (data.status === "paid") return { status: "paid" };
          if (data.status === "failed" || data.status === "expired") return { status: data.status, error: data.error };
          return { status: "pending" };
        }}
        onRetry={async () => { if (paying) await productApi.retryListingFee(paying.product.id); }}
        onClose={() => { setPaying(null); reload(); }}
        paidTitle="Listing is live! 🚀"
      />
    </Panel>
  );
}

// ── Orders (vendor side) ─────────────────────────────────────────────────────

export function OrdersTab() {
  const { data: orders, setData, loading, error, reload } = useLoad<Order[]>(() => orderApi.vendorOrders(), []);
  const [shipping, setShipping] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const ship = async (id: number) => {
    setShipping(id);
    try {
      const { data } = await orderApi.ship(id);
      setData((prev) => prev.map((o) => (o.id === id ? data : o)));
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setShipping(null);
    }
  };

  const toShip = orders.filter((o) => ["confirmed", "processing"].includes(o.status) && !o.is_ticket_order);

  return (
    <div className="space-y-4">
      {toShip.length > 0 && (
        <p className="p-4 rounded-2xl text-sm text-white" style={{ background: "var(--primary-dim)", border: "1px solid rgba(249,115,22,0.3)" }}>
          📦 {toShip.length} paid order{toShip.length > 1 ? "s" : ""} waiting to ship. Mark each one shipped once it&apos;s on the way — the buyer then has 7 days to confirm.
        </p>
      )}
      <Panel title={`Orders (${orders.length})`}>
        {loading ? <ListSkeleton /> : error ? <PanelError message={error} onRetry={reload} /> : orders.length === 0 ? (
          <PanelEmpty icon="🧾" text="Paid orders for your products and tickets appear here." />
        ) : (
          <ul>
            {orders.map((o) => {
              const open = expanded === o.id;
              return (
                <li key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <button onClick={() => setExpanded(open ? null : o.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02]" aria-expanded={open}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {o.is_ticket_order ? o.notes.replace(/^Tickets:\s*/, "") : o.items.map((i) => `${i.quantity}× ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""}`).join(", ")}
                      </p>
                      <p className="text-xs text-gray-500">{o.order_number} · {o.buyer_name} · {formatDate(o.created_at, { day: "numeric", month: "short" })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">{formatKES(o.total_amount)}</p>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </button>
                  {open && (
                    <div className="px-5 pb-5 space-y-3">
                      {o.delivery_mode === "delivery" && !o.is_ticket_order ? (
                        <div className="p-3 rounded-xl text-sm" style={{ background: "var(--surface-2)" }}>
                          <p className="text-xs text-gray-500 mb-1">Deliver to</p>
                          <p className="text-white">{o.delivery_address}</p>
                          <p className="text-gray-400">{[o.delivery_town, o.delivery_county].filter(Boolean).join(", ")}</p>
                          {o.delivery_phone && <a href={`tel:${o.delivery_phone}`} className="text-sm font-semibold" style={{ color: "var(--primary)" }}>📞 {o.delivery_phone}</a>}
                          {o.notes && <p className="text-xs text-gray-500 mt-2">Note: {o.notes}</p>}
                        </div>
                      ) : !o.is_ticket_order && (
                        <p className="text-xs text-gray-500">Pickup / digital — contact the buyer on {o.delivery_phone || "their M-Pesa number"}.</p>
                      )}
                      <EscrowBanner order={o} viewer="vendor" />
                      {["confirmed", "processing"].includes(o.status) && !o.is_ticket_order && (
                        <button onClick={() => ship(o.id)} disabled={shipping === o.id} className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
                          {shipping === o.id ? "Updating…" : "🚚 Mark as shipped"}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ── Payouts ──────────────────────────────────────────────────────────────────

export function PayoutsTab() {
  const stats = useLoad<VendorDashboard | null>(() => vendorApi.getDashboard(), null);
  const profile = useLoad<{ mpesa_phone: string; payout_account?: string } | null>(() => vendorApi.getProfile(), null);
  const e = stats.data?.earnings;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Panel title="Earnings">
        <div className="p-5 space-y-3">
          {stats.loading ? <div className="h-48 skeleton rounded-xl" /> : stats.error ? <PanelError message={stats.error} onRetry={stats.reload} /> : e && [
            { label: "Released to you", value: e.released, color: "var(--accent)", hint: "Buyer confirmed or protection window ended" },
            { label: "Held in escrow", value: e.held, color: "#60a5fa", hint: "Released when buyers confirm receipt" },
            { label: "Frozen by disputes", value: e.disputed, color: "#fbbf24", hint: "Under review by Merchke" },
            { label: "Commission paid (10%)", value: e.commission_paid, color: "#9ca3af", hint: "Deducted from released sales" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 p-4 rounded-xl" style={{ background: "var(--surface-2)" }}>
              <div>
                <p className="text-sm text-gray-300">{row.label}</p>
                <p className="text-[11px] text-gray-600">{row.hint}</p>
              </div>
              <span className="text-base font-black shrink-0" style={{ color: row.color }}>{formatKES(row.value)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="How payouts work">
        <div className="p-5 space-y-4 text-sm text-gray-400">
          <ol className="space-y-2 list-decimal list-inside">
            <li>A buyer pays — the money is held safely by Merchke.</li>
            <li>You ship, then the buyer confirms receipt (or 7 days pass).</li>
            <li>Your share (sale minus 10%) is released and sent to your M-Pesa.</li>
          </ol>
          <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)" }}>
            <p className="text-xs text-gray-500">Payout M-Pesa number</p>
            <p className="text-base font-bold text-white">{profile.data?.mpesa_phone || "Not set"}</p>
            <Link href="/onboarding" className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Update store details →</Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
