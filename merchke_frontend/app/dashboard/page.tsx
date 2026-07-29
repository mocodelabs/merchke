"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { vendorApi, productApi, orderApi, eventApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

type Tab = "overview" | "products" | "orders" | "events" | "payouts";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:      { bg: "rgba(250,204,21,0.15)",  color: "#fbbf24", label: "Pending" },
  confirmed:    { bg: "rgba(99,102,241,0.15)",  color: "#818cf8", label: "Confirmed" },
  processing:   { bg: "rgba(249,115,22,0.15)",  color: "#f97316", label: "Processing" },
  shipped:      { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", label: "Shipped" },
  delivered:    { bg: "rgba(16,185,129,0.15)",  color: "#10b981", label: "Delivered" },
  cancelled:    { bg: "rgba(239,68,68,0.15)",   color: "#f87171", label: "Cancelled" },
  active:       { bg: "rgba(16,185,129,0.15)",  color: "#10b981", label: "Active" },
  out_of_stock: { bg: "rgba(239,68,68,0.15)",   color: "#f87171", label: "Out of Stock" },
};

type DashboardStats = {
  products_count: number;
  orders_count: number;
  total_revenue: number;
  pending_orders: number;
  monthly_stats: Record<string, { orders: number; revenue: number }>;
};

type ApiProduct = {
  id: number; name: string; price: number; stock: number;
  sales_count: number; is_active: boolean; effective_price: number;
  image: string; product_type: string; in_stock: boolean;
};

type OrderItem = { product_name: string; variant: string | null; quantity: number };
type Order = {
  id: number; order_number: string; status: string;
  total_amount: number; created_at: string;
  items: OrderItem[];
};

type EventItem = {
  id: number; title: string; start_datetime: string;
  status: string; venue_name: string; town: string;
  ticket_types: { price: string }[];
};

function DashboardContent() {
  const { isAuthenticated, user } = useAuthStore();
  const searchParams = useSearchParams();
  const tab = ((searchParams.get("tab") as Tab) || "overview");

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.is_vendor) return;
    vendorApi.getProfile()
      .then((profileRes) => {
        const slug: string = profileRes.data.slug;
        return Promise.all([
          vendorApi.getDashboard(),
          slug ? productApi.byVendor(slug) : Promise.resolve({ data: [] }),
          orderApi.list(),
        ]);
      })
      .then(([dashRes, prodRes, ordRes]) => {
        setStats(dashRes.data);
        setProducts(prodRes.data);
        setOrders(ordRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    eventApi.mine().then((r) => setEvents(r.data)).catch(() => {});
  }, [isAuthenticated, user]);

  const monthly = stats
    ? Object.entries(stats.monthly_stats).map(([month, d]) => ({ month, ...d }))
    : [];
  const maxRev = monthly.length ? Math.max(...monthly.map((m) => m.revenue), 1) : 1;

  const statCards = stats ? [
    { label: "Total Revenue",  value: `KSh ${stats.total_revenue.toLocaleString()}`, icon: "💰", up: true },
    { label: "Total Orders",   value: String(stats.orders_count),                    icon: "📦", up: true },
    { label: "Products",       value: String(stats.products_count),                  icon: "🛍️", up: true },
    { label: "Pending Orders", value: String(stats.pending_orders),                  icon: "⏳", up: stats.pending_orders === 0 },
  ] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">
            {tab === "overview" ? "Overview" :
             tab === "products" ? "My Products" :
             tab === "orders"   ? "Orders" :
             tab === "events"   ? "Events" :
             "Payouts"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user?.username}&apos;s Store ·{" "}
            <span style={{ color: "var(--accent)" }}>● Active</span>
          </p>
        </div>
        {tab !== "events" && tab !== "payouts" && (
          <Link
            href="/dashboard/add-product"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: "var(--primary)" }}
          >
            <span className="text-base">+</span> Add Product
          </Link>
        )}
      </div>

      {/* Stat cards — overview only */}
      {tab === "overview" && (
        loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-5 h-28 animate-pulse skeleton" />
            ))}
          </div>
        ) : statCards ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{s.icon}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={s.up
                      ? { background: "var(--accent-dim)", color: "var(--accent)" }
                      : { background: "var(--primary-dim)", color: "var(--primary)" }}
                  >
                    {s.up ? "↑" : "!"}
                  </span>
                </div>
                <div className="text-xl font-black text-white">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        ) : null
      )}

      {/* ── Overview ─────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-base font-bold text-white mb-6">Revenue ({new Date().getFullYear()})</h2>
            {loading ? (
              <div className="h-40 skeleton rounded-xl" />
            ) : (
              <>
                <div className="flex items-end gap-2 h-40">
                  {monthly.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-t-lg transition-all relative"
                        style={{
                          height: `${(m.revenue / maxRev) * 100}%`,
                          background: m.revenue > 0 ? "var(--primary)" : "var(--surface-2)",
                          minHeight: "4px",
                        }}
                      >
                        {m.revenue > 0 && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            KSh {(m.revenue / 1000).toFixed(0)}K
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-600">{m.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span>KSh 0</span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  <span>KSh {(maxRev / 1000).toFixed(0)}K</span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Recent Orders</h2>
              <Link href="?tab=orders" className="text-xs" style={{ color: "var(--primary)" }}>
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-6">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 4).map((o) => {
                  const s = STATUS_STYLES[o.status] ?? STATUS_STYLES.pending;
                  const firstItem = o.items[0];
                  return (
                    <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {firstItem
                            ? `${firstItem.product_name}${firstItem.variant ? ` – ${firstItem.variant}` : ""}`
                            : `Order #${o.order_number}`}
                        </p>
                        <p className="text-xs text-gray-600">KSh {Number(o.total_amount).toLocaleString()}</p>
                      </div>
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Products ──────────────────────────────────────────────── */}
      {tab === "products" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-bold text-white">My Products ({products.length})</h2>
            <Link href="/dashboard/add-product" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--primary)" }}>
              + Add Product
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <span className="text-4xl block mb-3">📭</span>
              <p className="font-medium text-white mb-2">No products yet</p>
              <Link href="/dashboard/add-product" className="text-sm" style={{ color: "var(--primary)" }}>
                Add your first product →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Product", "Price", "Stock", "Sales", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const status = !p.is_active ? "inactive" : !p.in_stock ? "out_of_stock" : "active";
                    const s = STATUS_STYLES[status] ?? STATUS_STYLES.active;
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "var(--surface-2)" }}>
                              🛍️
                            </div>
                            <span className="text-sm font-medium text-white">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">KSh {Number(p.effective_price).toLocaleString()}</td>
                        <td className="px-5 py-4 text-sm">
                          {p.product_type === "digital" ? (
                            <span style={{ color: "#818cf8" }}>Unlimited</span>
                          ) : (
                            <span style={{ color: p.stock === 0 ? "#f87171" : p.stock < 10 ? "#fbbf24" : "#d1d5db" }}>
                              {p.stock} units
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">{p.sales_count}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/dashboard/edit-product/${p.id}`}
                              className="text-xs font-medium hover:text-white transition-colors"
                              style={{ color: "var(--primary)" }}
                            >
                              Edit
                            </Link>
                            <Link href={`/products/${p.id}`} className="text-xs text-gray-400 hover:text-white transition-colors">
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Orders ────────────────────────────────────────────────── */}
      {tab === "orders" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="p-5" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-bold text-white">All Orders ({orders.length})</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <span className="text-4xl block mb-3">📦</span>
              <p>No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Order", "Items", "Date", "Amount", "Status"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const s = STATUS_STYLES[o.status] ?? STATUS_STYLES.pending;
                    const date = new Date(o.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
                    return (
                      <tr key={o.id} className="hover:bg-white/3 transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-5 py-4 text-xs font-mono text-gray-400">#{o.order_number}</td>
                        <td className="px-5 py-4 text-sm text-gray-300 max-w-xs">
                          <p className="truncate">{o.items.map((i) => i.product_name).join(", ")}</p>
                          <p className="text-xs text-gray-600">{o.items.length} item{o.items.length !== 1 ? "s" : ""}</p>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-600">{date}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-white">KSh {Number(o.total_amount).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Payouts ───────────────────────────────────────────────── */}
      {tab === "payouts" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-base font-bold text-white mb-5">Payout Summary</h2>
            <div className="space-y-4">
              {[
                { label: "Available Balance",       value: stats ? `KSh ${(stats.total_revenue * 0.9).toLocaleString()}` : "—", color: "var(--accent)" },
                { label: "Platform Commission (10%)", value: stats ? `KSh ${(stats.total_revenue * 0.1).toLocaleString()}` : "—", color: "#6b7280" },
                { label: "Total Revenue",            value: stats ? `KSh ${stats.total_revenue.toLocaleString()}` : "—",        color: "#d1d5db" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--surface-2)" }}>
                  <span className="text-sm text-gray-400">{label}</span>
                  <span className="text-base font-black" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-5 py-3.5 rounded-xl font-bold text-white text-sm" style={{ background: "var(--accent)" }}>
              📱 Withdraw to M-Pesa
            </button>
          </div>
          <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-base font-bold text-white mb-5">Payout History</h2>
            <div className="text-center py-10 text-gray-600">
              <span className="text-3xl block mb-3">💸</span>
              <p className="text-sm">Payout history will appear here once you request a withdrawal.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Events ────────────────────────────────────────────────── */}
      {tab === "events" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-bold text-white">My Events ({events.length})</h2>
            <Link href="/dashboard/create-event" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--primary)" }}>
              + Create Event
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <span className="text-5xl block mb-4">🎟️</span>
              <p className="font-semibold text-white mb-2">No events yet</p>
              <p className="text-sm mb-5">List your event, set ticket tiers, and sell tickets directly to your fans.</p>
              <Link href="/dashboard/create-event" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: "var(--primary)" }}>
                + Create Your First Event
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Event", "Date", "Venue", "Tickets from", "Status", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => {
                    const evStatus = {
                      published: { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "Published" },
                      draft:     { bg: "rgba(107,114,128,0.15)", color: "#9ca3af", label: "Draft" },
                      sold_out:  { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "Sold Out" },
                      cancelled: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "Cancelled" },
                      completed: { bg: "rgba(99,102,241,0.15)", color: "#818cf8", label: "Completed" },
                    }[ev.status] ?? { bg: "rgba(107,114,128,0.15)", color: "#9ca3af", label: ev.status };

                    const dt = new Date(ev.start_datetime);
                    const dateStr = dt.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
                    const minPrice = ev.ticket_types.length
                      ? Math.min(...ev.ticket_types.map((t) => Number(t.price)))
                      : null;

                    return (
                      <tr key={ev.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "var(--surface-2)" }}>🎟️</div>
                            <span className="text-sm font-medium text-white">{ev.title}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{dateStr}</td>
                        <td className="px-5 py-4 text-sm text-gray-400">{ev.venue_name}, {ev.town}</td>
                        <td className="px-5 py-4 text-sm text-gray-300">
                          {minPrice != null ? (minPrice === 0 ? "Free" : `KSh ${minPrice.toLocaleString()}`) : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: evStatus.bg, color: evStatus.color }}>
                            {evStatus.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Link href={`/dashboard/edit-event/${ev.id}`} className="text-xs font-medium hover:text-white transition-colors" style={{ color: "var(--primary)" }}>
                              Edit
                            </Link>
                            <Link href={`/events/${ev.id}`} className="text-xs text-gray-400 hover:text-white transition-colors">
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><div className="h-32 skeleton rounded-2xl" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
