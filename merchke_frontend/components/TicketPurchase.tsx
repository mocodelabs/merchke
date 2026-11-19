"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MpesaPaymentModal from "@/components/MpesaPaymentModal";
import { eventApi, paymentApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { apiErrorMessage, formatKES } from "@/lib/config";
import type { MerchEvent, MpesaTransaction } from "@/lib/types";

export default function TicketPurchase({ event }: { event: MerchEvent }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const available = event.ticket_types.filter((t) => !t.is_sold_out);
  const [typeId, setTypeId] = useState<number | null>(available[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txn, setTxn] = useState<MpesaTransaction | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  const selected = event.ticket_types.find((t) => t.id === typeId);
  const maxQty = Math.min(10, selected?.tickets_remaining ?? 1);
  const total = selected ? Number(selected.price) * qty : 0;
  const closed = event.is_past || event.status === "cancelled";

  const buy = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/events/${event.slug}`);
      return;
    }
    if (!selected) return;
    if (phone.replace(/\D/g, "").length < 9) {
      setError("Enter the Safaricom number to pay with.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await eventApi.purchaseTickets(event.id, { ticket_type_id: selected.id, quantity: qty, phone });
      setOrderId(data.order_id);
      setTxn(data.transaction);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't start the purchase. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (closed) {
    return (
      <div className="p-5 rounded-2xl text-center text-sm text-gray-400" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {event.status === "cancelled" ? "This event was cancelled." : "This event has ended."}
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-lg font-bold text-white">Get tickets</h2>

      {event.ticket_types.length === 0 ? (
        <p className="text-sm text-gray-500">Tickets aren&apos;t on sale yet.</p>
      ) : (
        <div className="space-y-2" role="radiogroup" aria-label="Ticket type">
          {event.ticket_types.map((t) => {
            const active = t.id === typeId;
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={active}
                disabled={t.is_sold_out}
                onClick={() => { setTypeId(t.id); setQty(1); }}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-xl text-left transition-all disabled:opacity-50"
                style={active
                  ? { background: "var(--primary-dim)", border: "2px solid var(--primary)" }
                  : { background: "var(--surface-2)", border: "2px solid var(--border)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  {t.description && <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>}
                  <p className="text-xs mt-0.5" style={{ color: t.is_sold_out ? "#f87171" : t.tickets_remaining <= 20 ? "#fbbf24" : "#6b7280" }}>
                    {t.is_sold_out ? "Sold out" : t.tickets_remaining <= 20 ? `Only ${t.tickets_remaining} left` : "Available"}
                  </p>
                </div>
                <span className="text-base font-black shrink-0" style={{ color: "var(--primary)" }}>
                  {Number(t.price) === 0 ? "Free" : formatKES(t.price)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected && !selected.is_sold_out && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Quantity</span>
            <div className="inline-flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-11 text-gray-300 hover:bg-white/5" aria-label="Fewer tickets">−</button>
              <span className="w-10 text-center font-bold text-white" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="w-11 h-11 text-gray-300 hover:bg-white/5" aria-label="More tickets">+</button>
            </div>
          </div>

          <div>
            <label htmlFor="ticket-phone" className="block text-xs font-medium text-gray-400 mb-1.5">M-Pesa phone number</label>
            <input
              id="ticket-phone" type="tel" inputMode="tel" autoComplete="tel"
              value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678"
              className="w-full px-3 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            />
          </div>

          {error && <p role="alert" className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

          <button
            onClick={buy}
            disabled={submitting}
            className="w-full py-4 rounded-xl font-bold text-white disabled:opacity-60 glow-orange"
            style={{ background: "var(--primary)" }}
          >
            {submitting ? "Sending M-Pesa prompt…" : isAuthenticated ? `Pay ${formatKES(total)} with M-Pesa` : "Log in to buy tickets"}
          </button>
          <p className="text-xs text-gray-600 text-center">🛡️ Organizer gets paid after the event. QR tickets arrive instantly.</p>
        </>
      )}

      {isAuthenticated && (
        <Link href={`/events/${event.slug}/tickets`} className="block text-center text-xs font-semibold" style={{ color: "var(--primary)" }}>
          Already bought? View my tickets →
        </Link>
      )}

      <MpesaPaymentModal
        open={txn !== null}
        phone={txn?.phone ?? phone}
        amount={total}
        title={`${qty} × ${selected?.name ?? "ticket"}`}
        check={async () => {
          if (!txn) return { status: "pending" };
          const { data } = await paymentApi.transaction(txn.id);
          if (data.status === "completed") return { status: "paid" };
          if (data.status === "failed") return { status: "failed", error: data.result_desc || "Payment was cancelled." };
          return { status: "pending" };
        }}
        onRetry={async () => {
          if (!txn) return;
          const { data } = await paymentApi.retry(txn.id, phone);
          setTxn(data);
        }}
        onClose={() => { setTxn(null); router.refresh(); }}
        paidTitle="You're going! 🎉"
        paidBody={`Your ${qty > 1 ? `${qty} tickets are` : "ticket is"} ready. Show the QR code at the gate.`}
        paidActions={
          <>
            <Link href={`/events/${event.slug}/tickets`} className="w-full py-3.5 rounded-xl font-bold text-white text-center" style={{ background: "var(--primary)" }}>
              View my tickets
            </Link>
            {orderId && (
              <Link href={`/orders/${orderId}`} className="w-full py-3 rounded-xl font-semibold text-sm text-gray-300 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                Order details
              </Link>
            )}
          </>
        }
      />
    </div>
  );
}
