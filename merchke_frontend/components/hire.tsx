"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Field, FormError, inputClass, inputStyle } from "@/components/ui";
import { serviceApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { apiErrorMessage, formatKES, mediaUrl } from "@/lib/config";
import type { Service } from "@/lib/types";

export function priceRange(s: Pick<Service, "price_from" | "price_to" | "price_unit">) {
  const range = s.price_to ? `${formatKES(s.price_from)} – ${formatKES(s.price_to)}` : `From ${formatKES(s.price_from)}`;
  return s.price_unit ? `${range} ${s.price_unit}` : range;
}

export function ServiceCard({ service, onBook }: { service: Service; onBook: (s: Service) => void }) {
  const [imgIndex, setImgIndex] = useState(0);
  const images = service.images;
  const current = images[imgIndex];

  return (
    <article className="flex flex-col rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="relative aspect-[4/3]" style={{ background: "var(--surface-2)" }}>
        {current ? (
          <Image src={mediaUrl(current.image)} alt={`${service.title} portfolio`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden>📷</div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setImgIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                className="w-2 h-2 rounded-full"
                style={{ background: i === imgIndex ? "#fff" : "rgba(255,255,255,0.4)" }}
              />
            ))}
          </div>
        )}
        <span className="absolute top-3 left-3 text-[11px] px-2 py-1 rounded-full font-semibold text-white" style={{ background: "rgba(10,10,10,0.8)" }}>
          📍 {service.city}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--primary)" }}>
          {service.prop_type_display || service.category_display}
        </p>
        <h3 className="text-base font-bold text-white mt-1 line-clamp-2">{service.title}</h3>
        <Link href={`/vendors/${service.vendor_slug}`} className="text-xs text-gray-400 hover:text-white mt-0.5 inline-flex items-center gap-1">
          {service.vendor_name}
          {service.vendor_verified && <span title="Verified by Merchke" style={{ color: "var(--accent)" }}>✔</span>}
          {service.vendor_rating > 0 && <span className="text-gray-500">· ★ {service.vendor_rating}</span>}
        </Link>
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{service.description}</p>
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>{priceRange(service)}</p>
            {service.booking_deposit && <p className="text-[11px] text-gray-500">Deposit {formatKES(service.booking_deposit)}</p>}
          </div>
          <button
            onClick={() => onBook(service)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white shrink-0"
            style={{ background: "var(--primary)" }}
          >
            Book Now
          </button>
        </div>
      </div>
    </article>
  );
}

export function BookingModal({ service, onClose }: { service: Service; onClose: () => void }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState(() => ({
    name: user?.username ?? "", phone: "", email: user?.email ?? "",
    date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), message: "",
  }));
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError("Please fill in your name, phone and email.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await serviceApi.book(service.id, {
        client_name: form.name.trim(), client_phone: form.phone.trim(), client_email: form.email.trim(),
        date_requested: form.date, message: form.message.trim(),
      });
      setDone(data.detail);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't send your request."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="book-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4" style={{ background: "var(--accent-dim)", color: "var(--accent)" }} aria-hidden>✓</div>
            <h2 id="book-title" className="text-lg font-black text-white mb-2">Request sent</h2>
            <p className="text-sm text-gray-400 mb-6">{done}</p>
            <button onClick={onClose} className="w-full py-3.5 rounded-xl font-bold text-white" style={{ background: "var(--primary)" }}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h2 id="book-title" className="text-lg font-black text-white">Book {service.vendor_name}</h2>
              <p className="text-xs text-gray-500">{service.title} · {priceRange(service)}</p>
            </div>
            <Field label="Your name *" htmlFor="bk-name">
              <input id="bk-name" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" className={inputClass} style={inputStyle} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone *" htmlFor="bk-phone">
                <input id="bk-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" className={inputClass} style={inputStyle} />
              </Field>
              <Field label="Email *" htmlFor="bk-email">
                <input id="bk-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className={inputClass} style={inputStyle} />
              </Field>
            </div>
            <Field label="Date needed *" htmlFor="bk-date">
              <input id="bk-date" type="date" min={today} value={form.date} onChange={(e) => set("date", e.target.value)} className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Details" htmlFor="bk-msg">
              <textarea id="bk-msg" rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Location, time, what the shoot/event is…" className={`${inputClass} resize-none`} style={inputStyle} />
            </Field>
            <FormError message={error} />
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-300" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
                {submitting ? "Sending…" : "Send request"}
              </button>
            </div>
            <p className="text-[11px] text-gray-600 text-center">No payment now. The pro contacts you to confirm and agree on details.</p>
          </form>
        )}
      </div>
    </div>
  );
}
