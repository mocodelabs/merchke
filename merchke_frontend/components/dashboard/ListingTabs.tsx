"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MpesaPaymentModal from "@/components/MpesaPaymentModal";
import { priceRange } from "@/components/hire";
import { FormError, inputClass, inputStyle } from "@/components/ui";
import { FEE_PILL, ListSkeleton, NewButton, Panel, PanelEmpty, PanelError, Pill, useLoad } from "./shared";
import { adApi, eventApi, jobApi, paymentApi, serviceApi, vendorApi } from "@/lib/api";
import { apiErrorMessage, formatDate, formatDateTime, formatKES, mediaUrl } from "@/lib/config";
import type { Ad, Job, JobApplication, MerchEvent, MpesaTransaction, Service, ServiceBooking } from "@/lib/types";

// ── Events ───────────────────────────────────────────────────────────────────

const EVENT_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  published: { color: "#10b981", bg: "rgba(16,185,129,0.15)", label: "Published" },
  draft:     { color: "#9ca3af", bg: "rgba(107,114,128,0.15)", label: "Draft" },
  sold_out:  { color: "#f87171", bg: "rgba(239,68,68,0.15)", label: "Sold out" },
  cancelled: { color: "#f87171", bg: "rgba(239,68,68,0.15)", label: "Cancelled" },
  completed: { color: "#818cf8", bg: "rgba(99,102,241,0.15)", label: "Completed" },
};

export function EventsTab() {
  const { data: events, loading, error, reload } = useLoad<MerchEvent[]>(() => eventApi.mine(), []);
  const [boosting, setBoosting] = useState<MerchEvent | null>(null);

  return (
    <Panel
      title={`My events (${events.length})`}
      action={
        <div className="flex gap-2">
          <Link href="/dashboard/events/check-in" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-300" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>📷 Check-in</Link>
          <NewButton href="/dashboard/events/new">+ New event</NewButton>
        </div>
      }
    >
      {loading ? <ListSkeleton /> : error ? <PanelError message={error} onRetry={reload} /> : events.length === 0 ? (
        <PanelEmpty icon="🎟️" text="List your event with ticket tiers and sell QR tickets via M-Pesa." action={<NewButton href="/dashboard/events/new">Create your first event</NewButton>} />
      ) : (
        <ul>
          {events.map((ev) => {
            const st = EVENT_STATUS[ev.status] ?? EVENT_STATUS.draft;
            const capacity = ev.ticket_types.reduce((n, t) => n + t.total_quantity, 0);
            const gross = ev.ticket_types.reduce((n, t) => n + Number(t.price) * t.tickets_sold, 0);
            return (
              <li key={ev.id} className="flex items-start gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {ev.banner_image && <img src={mediaUrl(ev.banner_image)} alt="" loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(ev.start_datetime)} · {ev.venue_name}, {ev.town}</p>
                  <p className="text-xs text-gray-400 mt-0.5">🎟️ {ev.total_tickets_sold}/{capacity} sold · {formatKES(gross)} gross</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Pill color={st.color} bg={st.bg}>{st.label}</Pill>
                    {ev.is_featured && <Pill color="var(--primary)" bg="var(--primary-dim)">Boosted</Pill>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {!ev.is_past && ev.status === "published" && (
                    <button onClick={() => setBoosting(ev)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--primary)" }}>
                      🚀 Boost
                    </button>
                  )}
                  <Link href={`/events/${ev.slug}`} className="text-xs text-gray-400 hover:text-white">View</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {boosting && <BoostModal event={boosting} onClose={() => { setBoosting(null); reload(); }} />}
    </Panel>
  );
}

function BoostModal({ event, onClose }: { event: MerchEvent; onClose: () => void }) {
  const [packages, setPackages] = useState<{ days: number; price_ksh: number }[]>([]);
  const [days, setDays] = useState(7);
  const [copy, setCopy] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txn, setTxn] = useState<MpesaTransaction | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    vendorApi.getProfile().then((r) => setPhone((p) => p || r.data.mpesa_phone)).catch(() => {});
    eventApi.boostPackages().then((r) => setPackages(r.data)).catch(() => setError("Couldn't load boost prices. Close and try again."));
  }, []);

  const price = packages.find((p) => p.days === days)?.price_ksh ?? 0;

  const submit = async () => {
    if (!price) return setError("Choose a boost package.");
    const data = new FormData();
    data.append("days", String(days));
    data.append("ad_copy", copy);
    data.append("phone", phone);
    if (image) data.append("ad_image", image);
    setSubmitting(true);
    setError("");
    try {
      const { data: res } = await eventApi.boost(event.id, data);
      setTxn(res.transaction);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (txn) {
    return (
      <MpesaPaymentModal
        open
        phone={txn.phone}
        amount={price}
        title={`Boost "${event.title}"`}
        check={async () => {
          const { data } = await paymentApi.transaction(txn.id);
          if (data.status === "completed") return { status: "paid" };
          if (data.status === "failed") return { status: "failed", error: data.result_desc || "Payment was cancelled." };
          return { status: "pending" };
        }}
        onRetry={async () => setTxn((await paymentApi.retry(txn.id, phone)).data)}
        onClose={onClose}
        paidTitle="Your event is boosted! 🚀"
        paidBody={`It's featured on the homepage and events pages for ${days} days.`}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="boost-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div>
          <h2 id="boost-title" className="text-lg font-black text-white">Boost your event</h2>
          <p className="text-xs text-gray-500">Featured on the homepage carousel and at the top of events.</p>
        </div>
        <fieldset>
          <legend className="text-xs text-gray-400 mb-2">Choose how long</legend>
          <div className="grid grid-cols-2 gap-2">
            {packages.map((p) => {
              const selected = p.days === days;
              return (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setDays(p.days)}
                  aria-pressed={selected}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: selected ? "var(--primary-dim)" : "var(--surface-2)",
                    border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                  }}
                >
                  <span className="block text-sm font-bold text-white">{p.days} days</span>
                  <span className="block text-base font-black" style={{ color: "var(--primary)" }}>{formatKES(p.price_ksh)}</span>
                  <span className="block text-[11px] text-gray-500">{formatKES(Math.round(p.price_ksh / p.days))} / day</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="block text-xs text-gray-400">Ad line
          <input value={copy} maxLength={200} onChange={(e) => setCopy(e.target.value)} placeholder="e.g. Early bird ends Friday!" className={`${inputClass} mt-1`} style={inputStyle} />
        </label>
        <div>
          <input ref={imgRef} type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="hidden" />
          <button type="button" onClick={() => imgRef.current?.click()} className="w-full py-3 rounded-xl text-sm text-gray-400" style={{ border: "2px dashed var(--border)" }}>
            {image ? `🖼️ ${image.name}` : "Optional ad image (uses your event poster otherwise)"}
          </button>
        </div>
        <label className="block text-xs text-gray-400">M-Pesa number
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} mt-1`} style={inputStyle} />
        </label>
        <FormError message={error} />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-300" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>Cancel</button>
          <button onClick={submit} disabled={submitting || !price} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
            {submitting ? "Sending…" : price ? `Pay ${formatKES(price)}` : "Loading prices…"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Services & bookings ──────────────────────────────────────────────────────

const BOOKING_PILL: Record<ServiceBooking["status"], { color: string; bg: string }> = {
  pending: { color: "#fbbf24", bg: "rgba(250,204,21,0.15)" },
  confirmed: { color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  declined: { color: "#9ca3af", bg: "rgba(107,114,128,0.15)" },
};

export function ServicesTab() {
  const services = useLoad<Service[]>(() => serviceApi.mine(), []);
  const bookings = useLoad<ServiceBooking[]>(() => serviceApi.bookings(), []);

  const respond = async (id: number, status: "confirmed" | "declined") => {
    try {
      const { data } = await serviceApi.updateBooking(id, status);
      bookings.setData((prev) => prev.map((b) => (b.id === id ? data : b)));
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <Panel title={`Booking requests (${bookings.data.filter((b) => b.status === "pending").length} new)`}>
        {bookings.loading ? <ListSkeleton /> : bookings.error ? <PanelError message={bookings.error} onRetry={bookings.reload} /> : bookings.data.length === 0 ? (
          <PanelEmpty icon="📅" text="Booking requests from clients show up here and in your email." />
        ) : (
          <ul>
            {bookings.data.map((b) => (
              <li key={b.id} className="px-5 py-4 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{b.client_name} · {formatDate(b.date_requested)}</p>
                    <p className="text-xs text-gray-500">{b.service_title}</p>
                  </div>
                  <Pill {...BOOKING_PILL[b.status]}>{b.status}</Pill>
                </div>
                {b.message && <p className="text-xs text-gray-400">&ldquo;{b.message}&rdquo;</p>}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <a href={`tel:${b.client_phone}`} style={{ color: "var(--primary)" }}>📞 {b.client_phone}</a>
                  <a href={`mailto:${b.client_email}`} className="text-gray-400">✉️ {b.client_email}</a>
                  {b.status === "pending" && (
                    <span className="flex gap-2 ml-auto">
                      <button onClick={() => respond(b.id, "declined")} className="px-3 py-1.5 rounded-lg text-gray-300" style={{ background: "var(--surface-2)" }}>Decline</button>
                      <button onClick={() => respond(b.id, "confirmed")} className="px-3 py-1.5 rounded-lg font-bold text-white" style={{ background: "var(--accent)" }}>Confirm</button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`My services (${services.data.length})`} action={<NewButton href="/dashboard/services/new">+ List service</NewButton>}>
        {services.loading ? <ListSkeleton /> : services.error ? <PanelError message={services.error} onRetry={services.reload} /> : services.data.length === 0 ? (
          <PanelEmpty icon="✨" text="Makeup, tattoo, photo/video, props for rent — list what you offer." action={<NewButton href="/dashboard/services/new">List a service</NewButton>} />
        ) : (
          <ul>
            {services.data.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.images[0] && <img src={mediaUrl(s.images[0].image)} alt="" loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.category_display} · {s.city} · {priceRange(s)}</p>
                  {s.category === "models" && !s.vendor_verified && (
                    <p className="text-[11px] mt-0.5" style={{ color: "#fbbf24" }}>Hidden until Merchke verifies your profile.</p>
                  )}
                </div>
                <Link href={`/hire/${s.category}`} className="text-xs text-gray-400 hover:text-white shrink-0">View</Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export function JobsTab() {
  const { data: jobs, loading, error, reload } = useLoad<Job[]>(() => jobApi.mine(), []);
  const [openJob, setOpenJob] = useState<number | null>(null);
  const [apps, setApps] = useState<Record<number, JobApplication[]>>({});

  const toggle = async (id: number) => {
    setOpenJob(openJob === id ? null : id);
    if (!apps[id]) {
      try {
        const { data } = await jobApi.applications(id);
        setApps((a) => ({ ...a, [id]: data }));
      } catch {
        setApps((a) => ({ ...a, [id]: [] }));
      }
    }
  };

  return (
    <Panel title={`My job posts (${jobs.length})`} action={<NewButton href="/dashboard/jobs/new">+ Post job</NewButton>}>
      {loading ? <ListSkeleton /> : error ? <PanelError message={error} onRetry={reload} /> : jobs.length === 0 ? (
        <PanelEmpty icon="💼" text="Hiring editors, DJs, photographers? Post a job for KSh 500." action={<NewButton href="/dashboard/jobs/new">Post a job</NewButton>} />
      ) : (
        <ul>
          {jobs.map((j) => {
            const fee = FEE_PILL[j.fee_status ?? "pending"];
            return (
              <li key={j.id} style={{ borderTop: "1px solid var(--border)" }}>
                <button onClick={() => toggle(j.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02]" aria-expanded={openJob === j.id}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{j.title}</p>
                    <p className="text-xs text-gray-500">{j.location} · posted {formatDate(j.created_at)}{j.deadline ? ` · closes ${formatDate(j.deadline)}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Pill color={fee.color} bg={fee.bg}>{fee.label}</Pill>
                    <span className="text-xs text-gray-400">{j.applications_count ?? 0} applicant{j.applications_count === 1 ? "" : "s"}</span>
                  </div>
                </button>
                {openJob === j.id && (
                  <div className="px-5 pb-5">
                    {j.fee_status !== "paid" && (
                      <p className="text-xs mb-3" style={{ color: "#fbbf24" }}>
                        {j.fee_error || "Waiting for the KSh 500 fee."}{" "}
                        <button onClick={async () => { await jobApi.retryFee(j.id).catch(() => {}); reload(); }} className="font-bold underline">Resend M-Pesa prompt</button>
                      </p>
                    )}
                    {!apps[j.id] ? <div className="h-12 skeleton rounded-xl" /> : apps[j.id].length === 0 ? (
                      <p className="text-xs text-gray-500">No applications yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {apps[j.id].map((a) => (
                          <li key={a.id} className="p-3 rounded-xl text-sm" style={{ background: "var(--surface-2)" }}>
                            <p className="font-semibold text-white">{a.applicant_name} <span className="text-xs text-gray-500 font-normal">· {formatDate(a.applied_at)}</span></p>
                            <p className="text-xs text-gray-400">
                              <a href={`mailto:${a.email}`}>{a.email}</a> · <a href={`tel:${a.phone}`}>{a.phone}</a>
                            </p>
                            {a.cover_letter && <p className="text-xs text-gray-400 mt-1 line-clamp-3">{a.cover_letter}</p>}
                            <div className="flex gap-3 mt-1.5 text-xs font-semibold">
                              {a.cv_file && <a href={mediaUrl(a.cv_file)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>📄 CV</a>}
                              {a.cv_url && <a href={a.cv_url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "var(--primary)" }}>🔗 Portfolio</a>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ── Ads ──────────────────────────────────────────────────────────────────────

export function AdsTab() {
  const { data: ads, loading, error, reload } = useLoad<Ad[]>(() => adApi.mine(), []);
  return (
    <Panel title={`My ads (${ads.length})`} action={<NewButton href="/dashboard/ads/new">+ New ad</NewButton>}>
      {loading ? <ListSkeleton /> : error ? <PanelError message={error} onRetry={reload} /> : ads.length === 0 ? (
        <PanelEmpty icon="📣" text="Put your store, drop or event in front of thousands of fans. Ads start at KSh 300." action={<NewButton href="/dashboard/ads/new">Create an ad</NewButton>} />
      ) : (
        <ul>
          {ads.map((ad) => {
            const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
            const live = ad.is_active && new Date(ad.end_date) >= new Date(new Date().toDateString());
            return (
              <li key={ad.id} className="flex items-center gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(ad.image)} alt="" loading="lazy" className="w-16 h-11 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ad.title}</p>
                  <p className="text-xs text-gray-500">{ad.ad_type_display} · {formatDate(ad.start_date)} – {formatDate(ad.end_date)} · {formatKES(ad.budget_ksh)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">👁 {ad.impressions.toLocaleString()} views · 👆 {ad.clicks} clicks · {ctr}% CTR</p>
                </div>
                <Pill
                  color={live ? "#10b981" : ad.payment_status === "pending" ? "#fbbf24" : "#9ca3af"}
                  bg={live ? "rgba(16,185,129,0.15)" : ad.payment_status === "pending" ? "rgba(250,204,21,0.15)" : "rgba(107,114,128,0.15)"}
                >
                  {live ? "Live" : ad.payment_status === "pending" ? "Awaiting payment" : "Ended"}
                </Pill>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
