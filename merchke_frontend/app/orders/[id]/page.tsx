"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MpesaPaymentModal from "@/components/MpesaPaymentModal";
import { DisputeModal, EscrowBanner, OrderStatusBadge } from "@/components/orders";
import TicketQR from "@/components/TicketQR";
import { orderApi, paymentApi, productApi, ticketApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { apiErrorMessage, formatDateTime, formatKES, mediaUrl } from "@/lib/config";
import { useFetch } from "@/lib/useFetch";
import type { MpesaTransaction, Order, Ticket } from "@/lib/types";

const STEPS: { key: Order["status"]; label: string }[] = [
  { key: "confirmed", label: "Paid" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orderId = Number(id);
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();

  const orderQ = useFetch<Order | null>(
    () => (isAuthenticated ? orderApi.detail(orderId) : Promise.resolve({ data: null })),
    `${orderId}:${isAuthenticated}`, null, "We couldn't find this order.",
  );
  const order = orderQ.data;
  const setOrder = orderQ.setData;
  const loading = orderQ.loading;
  const error = orderQ.error;

  const showTickets = Boolean(order?.is_ticket_order && order.status !== "pending");
  const ticketsQ = useFetch<Ticket[]>(
    () => (showTickets ? ticketApi.mine() : Promise.resolve({ data: [] })),
    `${order?.order_number}:${showTickets}`, [],
  );
  const tickets = ticketsQ.data.filter((t) => t.order_number === order?.order_number);

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const payPhone = phoneInput ?? order?.delivery_phone ?? "";
  const [payError, setPayError] = useState("");
  const [txn, setTxn] = useState<MpesaTransaction | null>(null);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace(`/login?next=/orders/${orderId}`);
  }, [hasHydrated, isAuthenticated, router, orderId]);

  const download = async (productId: number, name: string) => {
    setDownloading(productId);
    try {
      const res = await productApi.download(productId);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(apiErrorMessage(err, "Download failed. Try again."));
    } finally {
      setDownloading(null);
    }
  };

  const payNow = async () => {
    setPayError("");
    try {
      const { data } = await paymentApi.payOrder(orderId, payPhone);
      setTxn(data);
    } catch (err) {
      setPayError(apiErrorMessage(err));
    }
  };

  if (!isAuthenticated) return null;
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-32 skeleton rounded-2xl" />
        <div className="h-48 skeleton rounded-2xl" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-400 mb-6">{error || "Order not found."}</p>
        <Link href="/orders" className="px-5 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "var(--primary)" }}>Back to orders</Link>
      </div>
    );
  }

  const stepIndex = order.status === "delivered" ? 2 : order.status === "shipped" ? 1 : ["confirmed", "processing"].includes(order.status) ? 0 : -1;
  const showSteps = !order.is_ticket_order && !["pending", "cancelled", "refunded"].includes(order.status);
  const canDownload = order.status !== "pending" && order.status !== "refunded";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div>
        <Link href="/orders" className="text-sm text-gray-500 hover:text-white">← My orders</Link>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <h1 className="text-2xl font-black text-white">Order {order.order_number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-gray-500 mt-1">Placed {formatDateTime(order.created_at)}</p>
      </div>

      {order.status === "pending" && (
        <section className="p-5 rounded-2xl space-y-3" style={{ background: "var(--primary-dim)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <p className="text-sm font-semibold text-white">This order hasn&apos;t been paid yet.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="tel" inputMode="tel" value={payPhone} onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="M-Pesa number, e.g. 0712 345 678" aria-label="M-Pesa phone number"
              className="flex-1 px-3 py-3 rounded-xl text-sm text-gray-200 outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            />
            <button onClick={payNow} className="px-5 py-3 rounded-xl font-bold text-sm text-white" style={{ background: "var(--primary)" }}>
              Pay {formatKES(order.total_amount)}
            </button>
          </div>
          {payError && <p role="alert" className="text-sm" style={{ color: "#f87171" }}>{payError}</p>}
        </section>
      )}

      <EscrowBanner
        order={order}
        viewer="buyer"
        onConfirmed={(escrow) => setOrder({ ...order, escrow, status: "delivered", payout_status: "released" })}
        onDispute={() => setDisputeOpen(true)}
      />

      {showSteps && (
        <ol className="grid grid-cols-3 gap-2" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className="text-center">
              <div className="h-1.5 rounded-full mb-2" style={{ background: i <= stepIndex ? "var(--primary)" : "var(--border)" }} />
              <span className="text-xs font-semibold" style={{ color: i <= stepIndex ? "var(--foreground)" : "#6b7280" }}>{s.label}</span>
            </li>
          ))}
        </ol>
      )}

      {order.is_ticket_order ? (
        <section>
          <h2 className="text-base font-bold text-white mb-3">{order.notes.replace(/^Tickets:\s*/, "")}</h2>
          {tickets.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {tickets.map((t) => <TicketQR key={t.id} ticket={t} />)}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {order.status === "pending" ? "Your tickets appear here once payment is confirmed." :
               order.status === "refunded" ? "This purchase was refunded." : "No tickets found for this order."}
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="px-5 pt-5 text-base font-bold text-white">Items</h2>
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-5">
                <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                  {item.product_image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={mediaUrl(item.product_image)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    : <span aria-hidden>🛍️</span>}
                </div>
                <div className="flex-1 min-w-0">
                  {item.product ? (
                    <Link href={`/products/${item.product}`} className="text-sm font-semibold text-white hover:text-orange-400">{item.product_name}</Link>
                  ) : (
                    <p className="text-sm font-semibold text-white">{item.product_name}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {item.vendor_name}{item.variant_label ? ` · ${item.variant_label}` : ""} · ×{item.quantity}
                  </p>
                  {item.product_type === "digital" && item.product && canDownload && (
                    <button
                      onClick={() => download(item.product!, item.product_name)}
                      disabled={downloading === item.product}
                      className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                      style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
                    >
                      {downloading === item.product ? "Downloading…" : "⬇ Download"}
                    </button>
                  )}
                </div>
                <span className="text-sm font-bold text-white shrink-0">{formatKES(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="px-5 py-4 space-y-1.5 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatKES(order.subtotal)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{Number(order.delivery_fee) ? formatKES(order.delivery_fee) : "Free"}</span></div>
            <div className="flex justify-between font-bold text-base text-white pt-1"><span>Total</span><span style={{ color: "var(--primary)" }}>{formatKES(order.total_amount)}</span></div>
          </div>
        </section>
      )}

      {order.delivery_mode === "delivery" && !order.is_ticket_order && (
        <section className="p-5 rounded-2xl text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-base font-bold text-white mb-2">Delivery</h2>
          <p className="text-gray-300">{order.delivery_address}</p>
          <p className="text-gray-500">{[order.delivery_town, order.delivery_county].filter(Boolean).join(", ")}</p>
          {order.delivery_phone && <p className="text-gray-500 mt-1">📞 {order.delivery_phone}</p>}
        </section>
      )}

      <p className="text-xs text-gray-600 text-center">
        Need help? Ask Merchi (bottom-right) or email support@merchke.co.ke with your order number.
      </p>

      {disputeOpen && (
        <DisputeModal
          orderId={order.id}
          orderNumber={order.order_number}
          onClose={() => setDisputeOpen(false)}
          onSubmitted={(escrow) => {
            setOrder({ ...order, escrow, has_dispute: true });
            setDisputeOpen(false);
          }}
        />
      )}

      <MpesaPaymentModal
        open={txn !== null}
        phone={txn?.phone ?? payPhone}
        amount={order.total_amount}
        title={`Pay for ${order.order_number}`}
        check={async () => {
          if (!txn) return { status: "pending" };
          const { data } = await paymentApi.transaction(txn.id);
          if (data.status === "completed") return { status: "paid" };
          if (data.status === "failed") return { status: "failed", error: data.result_desc || "Payment was cancelled." };
          return { status: "pending" };
        }}
        onRetry={async () => {
          if (!txn) return;
          const { data } = await paymentApi.retry(txn.id, payPhone);
          setTxn(data);
        }}
        onClose={() => { setTxn(null); orderQ.reload(); }}
        paidTitle="Payment received!"
        paidBody="Your order is confirmed and your money is protected until you receive it."
      />
    </div>
  );
}
