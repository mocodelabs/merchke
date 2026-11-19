"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatDateTime } from "@/lib/config";
import type { Ticket } from "@/lib/types";

/** A scannable ticket card. The QR encodes the ticket's secret token for gate check-in. */
export default function TicketQR({ ticket }: { ticket: Ticket }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(ticket.qr_token, { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ticket.qr_token]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: `1px solid ${ticket.is_used ? "var(--border)" : "rgba(249,115,22,0.35)"}` }}
    >
      <div className="p-4" style={{ background: "linear-gradient(135deg, #1a0900 0%, #2d1200 100%)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--primary)" }}>{ticket.ticket_type_name}</p>
        <h3 className="text-base font-black text-white leading-tight mt-1">{ticket.event_title}</h3>
        <p className="text-xs text-gray-400 mt-1">{formatDateTime(ticket.event_start)} · {ticket.venue_name}, {ticket.town}</p>
      </div>
      <div className="p-4 flex flex-col items-center gap-3">
        <div className="relative rounded-xl overflow-hidden bg-white p-2" style={{ width: 200, height: 200 }}>
          {src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={src} alt={`QR code for ticket ${ticket.ticket_number}`} width={184} height={184} className={ticket.is_used ? "opacity-25" : ""} />
            : <div className="w-full h-full skeleton" />}
          {ticket.is_used && (
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-red-600 rotate-[-12deg]">USED</span>
          )}
        </div>
        <p className="font-mono text-sm text-white tracking-wider">{ticket.ticket_number}</p>
        <p className="text-xs text-gray-500 text-center">
          {ticket.is_used && ticket.used_at
            ? `Checked in ${formatDateTime(ticket.used_at)}`
            : "Show this QR code at the gate. Screenshot it in case your network is slow."}
        </p>
      </div>
    </div>
  );
}
