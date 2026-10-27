"use client";
import { useState } from "react";
import { escrowApi } from "@/lib/api";
import { apiErrorMessage, formatDate, formatKES } from "@/lib/config";
import type { Escrow, Order, OrderStatus } from "@/lib/types";

export const ORDER_STATUS: Record<OrderStatus, { bg: string; color: string; label: string }> = {
  pending:    { bg: "rgba(250,204,21,0.15)",  color: "#fbbf24", label: "Awaiting payment" },
  confirmed:  { bg: "rgba(99,102,241,0.15)",  color: "#818cf8", label: "Paid · preparing" },
  processing: { bg: "rgba(249,115,22,0.15)",  color: "#f97316", label: "Processing" },
  shipped:    { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", label: "Shipped" },
  delivered:  { bg: "rgba(16,185,129,0.15)",  color: "#10b981", label: "Delivered" },
  cancelled:  { bg: "rgba(239,68,68,0.15)",   color: "#f87171", label: "Cancelled" },
  refunded:   { bg: "rgba(107,114,128,0.15)", color: "#9ca3af", label: "Refunded" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status] ?? ORDER_STATUS.pending;
  return (
    <span className="inline-flex text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

const ESCROW_STYLE: Record<Escrow["status"], { icon: string; color: string; bg: string; label: string }> = {
  held:     { icon: "🔒", color: "#10b981", bg: "rgba(16,185,129,0.08)", label: "Funds held by Merchke" },
  disputed: { icon: "⚖️", color: "#fbbf24", bg: "rgba(250,204,21,0.08)", label: "Dispute under review" },
  released: { icon: "✅", color: "#60a5fa", bg: "rgba(59,130,246,0.08)", label: "Funds released to seller" },
  refunded: { icon: "↩️", color: "#9ca3af", bg: "rgba(107,114,128,0.10)", label: "Refunded" },
};

export function EscrowChip({ escrow }: { escrow: Escrow | null }) {
  if (!escrow) return null;
  const s = ESCROW_STYLE[escrow.status];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: s.color }}>
      <span aria-hidden>{s.icon}</span> {s.label}
    </span>
  );
}

/**
 * Escrow status banner. Buyers get "Confirm you received this order" / "Report a problem";
 * vendors see where their money is.
 */
export function EscrowBanner({
  order, viewer, onConfirmed, onDispute,
}: {
  order: Order;
  viewer: "buyer" | "vendor";
  onConfirmed?: (escrow: Escrow) => void;
  onDispute?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const escrow = order.escrow;
  if (!escrow) return null;
  const s = ESCROW_STYLE[escrow.status];
  const canConfirm = viewer === "buyer" && escrow.status === "held" && ["shipped", "delivered"].includes(order.status);
  const canDispute = viewer === "buyer" && escrow.status === "held";

  let message: string;
  if (viewer === "vendor") {
    message = {
      held: `${formatKES(escrow.vendor_amount)} is held and will be released when the buyer confirms receipt` +
        (escrow.auto_release_at ? ` or automatically on ${formatDate(escrow.auto_release_at)}.` : " (ship the order to start the 7-day clock)."),
      disputed: "The buyer reported a problem. Funds are frozen while Merchke reviews it.",
      released: `${formatKES(escrow.vendor_amount)} released to you on ${formatDate(escrow.released_at ?? escrow.created_at)} (after ${Number(escrow.commission_percent)}% commission).`,
      refunded: "This order was refunded to the buyer.",
    }[escrow.status];
  } else {
    message = {
      held: canConfirm
        ? "Got everything in good shape? Confirm below to release payment to the seller." +
          (escrow.auto_release_at ? ` If you do nothing, it releases automatically on ${formatDate(escrow.auto_release_at)}.` : "")
        : "Your payment is safe with Merchke. The seller only gets paid after you confirm delivery.",
      disputed: "We're reviewing your report. Your money stays frozen until it's resolved — we'll email you.",
      released: `Payment released to the seller on ${formatDate(escrow.released_at ?? escrow.created_at)}. Thanks for confirming!`,
      refunded: `${formatKES(escrow.amount)} was refunded to you.`,
    }[escrow.status];
  }

  const confirm = async () => {
    setConfirming(true);
    setError("");
    try {
      const { data } = await escrowApi.release(order.id);
      onConfirmed?.(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: s.bg, border: `1px solid ${s.color}33` }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden>{s.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: s.color }}>{s.label}</p>
          <p className="text-sm text-gray-300 mt-0.5">{message}</p>
          {error && <p role="alert" className="text-xs mt-2" style={{ color: "#f87171" }}>{error}</p>}
          {(canConfirm || canDispute) && (
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              {canConfirm && (
                <button
                  onClick={confirm}
                  disabled={confirming}
                  className="px-5 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                  style={{ background: "var(--accent)" }}
                >
                  {confirming ? "Confirming…" : "✓ Confirm you received this order"}
                </button>
              )}
              {canDispute && (
                <button
                  onClick={onDispute}
                  className="px-5 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  Report a problem
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DISPUTE_REASONS = [
  { value: "not_received", label: "Item not received" },
  { value: "wrong_item", label: "Wrong item delivered" },
  { value: "damaged", label: "Item arrived damaged" },
  { value: "not_as_described", label: "Not as described" },
  { value: "digital_not_working", label: "Digital file not working" },
  { value: "no_ticket", label: "Event ticket not received" },
  { value: "other", label: "Other" },
];

export function DisputeModal({
  orderId, orderNumber, onClose, onSubmitted,
}: {
  orderId: number;
  orderNumber: string;
  onClose: () => void;
  onSubmitted: (escrow: Escrow) => void;
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!reason || !description.trim()) {
      setError("Choose a reason and tell us what happened.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await escrowApi.dispute(orderId, { reason, description: description.trim() });
      onSubmitted(data.escrow);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not submit your report. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="dispute-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div>
          <h2 id="dispute-title" className="text-lg font-black text-white">Report a problem</h2>
          <p className="text-xs text-gray-500 mt-1">Order {orderNumber} · your payment stays frozen while we review.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DISPUTE_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className="px-3 py-2.5 rounded-xl text-left text-sm transition-all"
              style={reason === r.value
                ? { background: "var(--primary-dim)", border: "1px solid var(--primary)", color: "#fff" }
                : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "#9ca3af" }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What went wrong? Include anything that helps us resolve it fast."
          aria-label="Describe the problem"
          className="w-full px-3 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none resize-none"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        />
        {error && <p role="alert" className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-300" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: "#ef4444" }}>
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}
