"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EVENT_CATEGORIES } from "@/components/EventCard";
import Link from "next/link";
import { eventApi, ticketTypeApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

const GENRES = [
  "Afrobeats", "Amapiano", "Hip-Hop / Trap", "R&B / Soul", "Gospel",
  "Reggae / Dancehall", "Jazz", "Gengetone", "Comedy", "Poetry / Spoken Word",
  "Sports", "Food & Lifestyle", "Cultural / Traditional", "Festival", "Other",
];

const TOWNS = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika",
  "Machakos", "Malindi", "Nyeri", "Nanyuki", "Meru", "Kisii",
  "Kakamega", "Garissa", "Other",
];

type Ticket = {
  _key: string;
  name: string;
  description: string;
  price: string;
  total_quantity: string;
  sale_end: string;
};

const emptyTicket = (): Ticket => ({
  _key: Math.random().toString(36).slice(2),
  name: "", description: "", price: "", total_quantity: "", sale_end: "",
});

const inputCls = "w-full px-4 py-3 rounded-xl text-gray-200 outline-none placeholder-gray-600 text-sm transition-all focus:ring-1 focus:ring-orange-500";
const inputSty = { background: "var(--surface-2)", border: "1px solid var(--border)" };

const STEPS = ["Details", "Venue & Date", "Tickets", "Image"];

function CreateEventForm() {
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = EVENT_CATEGORIES.some((c) => c.value && c.value === searchParams.get("category"))
    ? (searchParams.get("category") as string)
    : "concert";
  const fileRef = useRef<HTMLInputElement>(null);
  const flyerRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "", short_description: "", description: "", genre: "", status: "published", category: initialCategory,
    venue_name: "", venue_address: "", town: "Nairobi", county: "", google_maps_link: "",
    start_date: "", start_time: "18:00", end_date: "", end_time: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const [tickets, setTickets] = useState<Ticket[]>([emptyTicket()]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && (!isAuthenticated || !user?.is_vendor)) router.replace("/login?next=/dashboard/events/new");
  }, [hasHydrated, isAuthenticated, user, router]);

  if (!isAuthenticated || !user?.is_vendor) return null;

  // ── Ticket helpers ──────────────────────────────────────────────
  const setTicketField = (key: string, field: keyof Omit<Ticket, "_key">, val: string) =>
    setTickets((prev) => prev.map((t) => t._key === key ? { ...t, [field]: val } : t));
  const addTicket = () => setTickets((p) => [...p, emptyTicket()]);
  const removeTicket = (key: string) => setTickets((p) => p.filter((t) => t._key !== key));

  // ── Image handlers ──────────────────────────────────────────────
  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBannerFile(f);
    setBannerPreview(URL.createObjectURL(f));
  };
  const handleFlyer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFlyerFile(f);
    setFlyerPreview(URL.createObjectURL(f));
  };

  // ── Step validation ─────────────────────────────────────────────
  const validateStep = (s: number): string => {
    if (s === 1) {
      if (!form.title.trim()) return "Event title is required";
      if (!form.description.trim()) return "Description is required";
    }
    if (s === 2) {
      if (!form.venue_name.trim()) return "Venue name is required";
      if (!form.venue_address.trim()) return "Venue address is required";
      if (!form.start_date) return "Start date is required";
      if (!form.start_time) return "Start time is required";
    }
    if (s === 3) {
      for (const t of tickets) {
        if (!t.name.trim()) return "Each ticket type needs a name";
        if (!t.price || Number(t.price) < 0) return "Each ticket needs a valid price";
        if (!t.total_quantity || Number(t.total_quantity) < 1) return "Each ticket needs a quantity of at least 1";
      }
    }
    if (s === 4) {
      if (!bannerFile) return "Banner image is required";
    }
    return "";
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  };

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validateStep(4);
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError("");

    try {
      const startDt = `${form.start_date}T${form.start_time}:00`;
      const endDt = form.end_date && form.end_time ? `${form.end_date}T${form.end_time}:00` : "";

      const data = new FormData();
      data.append("title", form.title.trim());
      data.append("description", form.description.trim());
      data.append("short_description", form.short_description.trim());
      data.append("genre", form.genre);
      data.append("category", form.category);
      data.append("status", form.status);
      data.append("venue_name", form.venue_name.trim());
      data.append("venue_address", form.venue_address.trim());
      data.append("town", form.town);
      if (form.county) data.append("county", form.county);
      if (form.google_maps_link) data.append("google_maps_link", form.google_maps_link);
      data.append("start_datetime", startDt);
      if (endDt) data.append("end_datetime", endDt);
      data.append("banner_image", bannerFile!);
      if (flyerFile) data.append("flyer", flyerFile);

      const eventRes = await eventApi.create(data);
      const eventId: number = eventRes.data.id;

      await Promise.allSettled(
        tickets.map((t) =>
          ticketTypeApi.create(eventId, {
            name: t.name.trim(),
            description: t.description.trim() || undefined,
            price: Number(t.price),
            total_quantity: Number(t.total_quantity),
            sale_end: t.sale_end || undefined,
          })
        )
      );

      router.push("/dashboard?tab=events&created=1");
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: Record<string, unknown> } };
      const msgs = axErr.response?.data;
      if (msgs && typeof msgs === "object") {
        const first = Object.values(msgs)[0];
        setError(Array.isArray(first) ? first[0] : String(first));
      } else {
        setError("Failed to create event. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/dashboard?tab=events"
          className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">Create Event</h1>
          <p className="text-xs text-gray-500 mt-0.5">Step {step} of {STEPS.length} — {STEPS[step - 1]}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: i < step ? "var(--primary)" : "var(--border)" }}
          />
        ))}
      </div>

      {/* ── Step 1: Event Details ───────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-white">Event Details</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Event Title *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Afrobeats Friday Live" className={inputCls} style={inputSty} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Short Description</label>
            <input value={form.short_description} onChange={(e) => set("short_description", e.target.value)}
              placeholder="One-liner shown in listings (max 300 chars)" maxLength={300}
              className={inputCls} style={inputSty} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Full Description *</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Tell attendees what to expect — lineup, dress code, what's included…"
              rows={5} className={`${inputCls} resize-none`} style={inputSty} />
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-400 mb-2">Event type *</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENT_CATEGORIES.filter((c) => c.value).map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set("category", c.value)}
                  className="px-3 py-2.5 rounded-xl text-left text-sm transition-all"
                  style={form.category === c.value
                    ? { background: "var(--primary-dim)", border: "2px solid var(--primary)", color: "#fff" }
                    : { background: "var(--surface-2)", border: "2px solid var(--border)", color: "#9ca3af" }}
                >
                  <span className="mr-1.5" aria-hidden>{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Genre / Style</label>
            <select value={form.genre} onChange={(e) => set("genre", e.target.value)}
              className={`${inputCls} appearance-none cursor-pointer`} style={inputSty}>
              <option value="">Select genre (optional)</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Publish immediately</p>
              <p className="text-xs text-gray-500 mt-0.5">Uncheck to save as draft (not visible to the public)</p>
            </div>
            <button
              onClick={() => set("status", form.status === "published" ? "draft" : "published")}
              className="relative w-11 h-6 rounded-full transition-all shrink-0"
              style={{ background: form.status === "published" ? "var(--primary)" : "var(--border)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: form.status === "published" ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>

          <button onClick={next} className="w-full py-3.5 rounded-xl font-bold text-white" style={{ background: "var(--primary)" }}>
            Next: Venue &amp; Date →
          </button>
        </div>
      )}

      {/* ── Step 2: Venue & Date ────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-white">Venue &amp; Date</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Venue Name *</label>
            <input value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)}
              placeholder="e.g. KICC Rooftop, Alchemist Bar" className={inputCls} style={inputSty} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Venue Address *</label>
            <textarea value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)}
              placeholder="Full address or directions to the venue" rows={2}
              className={`${inputCls} resize-none`} style={inputSty} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Town *</label>
              <select value={form.town} onChange={(e) => set("town", e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`} style={inputSty}>
                {TOWNS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">County</label>
              <input value={form.county} onChange={(e) => set("county", e.target.value)}
                placeholder="e.g. Nairobi" className={inputCls} style={inputSty} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Start Date *</label>
              <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)}
                className={inputCls} style={{ ...inputSty, colorScheme: "dark" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Start Time *</label>
              <input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)}
                className={inputCls} style={{ ...inputSty, colorScheme: "dark" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)}
                className={inputCls} style={{ ...inputSty, colorScheme: "dark" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">End Time</label>
              <input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)}
                className={inputCls} style={{ ...inputSty, colorScheme: "dark" }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Google Maps Link</label>
            <input value={form.google_maps_link} onChange={(e) => set("google_maps_link", e.target.value)}
              placeholder="https://maps.google.com/..." className={inputCls} style={inputSty} />
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setError(""); setStep(1); }}
              className="flex-1 py-3.5 rounded-xl font-semibold text-gray-300" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              ← Back
            </button>
            <button onClick={next} className="flex-1 py-3.5 rounded-xl font-bold text-white" style={{ background: "var(--primary)" }}>
              Next: Tickets →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Tickets ────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Ticket Types</h2>
            <button onClick={addTicket}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
              + Add Tier
            </button>
          </div>

          {tickets.map((t, idx) => (
            <div key={t._key} className="p-4 rounded-2xl space-y-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">
                  {t.name || `Ticket Tier ${idx + 1}`}
                </p>
                {tickets.length > 1 && (
                  <button onClick={() => removeTicket(t._key)}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Ticket Name *</label>
                  <input value={t.name} onChange={(e) => setTicketField(t._key, "name", e.target.value)}
                    placeholder="e.g. Regular, VIP, Early Bird" className={inputCls} style={inputSty} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Price (KSh) *</label>
                  <input type="number" min="0" value={t.price} onChange={(e) => setTicketField(t._key, "price", e.target.value)}
                    placeholder="0 for free" className={inputCls} style={inputSty} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Total Tickets *</label>
                  <input type="number" min="1" value={t.total_quantity} onChange={(e) => setTicketField(t._key, "total_quantity", e.target.value)}
                    placeholder="100" className={inputCls} style={inputSty} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Description</label>
                  <input value={t.description} onChange={(e) => setTicketField(t._key, "description", e.target.value)}
                    placeholder="What's included — e.g. Meet & Greet, Table, Standing" className={inputCls} style={inputSty} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Sale End Date</label>
                  <input type="datetime-local" value={t.sale_end} onChange={(e) => setTicketField(t._key, "sale_end", e.target.value)}
                    className={inputCls} style={{ ...inputSty, colorScheme: "dark" }} />
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={() => { setError(""); setStep(2); }}
              className="flex-1 py-3.5 rounded-xl font-semibold text-gray-300" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              ← Back
            </button>
            <button onClick={next} className="flex-1 py-3.5 rounded-xl font-bold text-white" style={{ background: "var(--primary)" }}>
              Next: Images →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Images ─────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-white">Event Images</h2>

          {/* Banner */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Banner Image *</label>
            <button onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl overflow-hidden transition-all"
              style={{ background: "var(--surface-2)", border: `2px dashed ${bannerPreview ? "var(--primary)" : "var(--border)"}`, minHeight: "180px" }}>
              {bannerPreview
                ? <img src={bannerPreview} alt="Banner" className="w-full object-cover max-h-60" />
                : <div className="flex flex-col items-center justify-center gap-3 py-14 text-gray-500">
                    <span className="text-4xl">🖼️</span>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white">Click to upload banner</p>
                      <p className="text-xs mt-1">Recommended: 1200×630px (16:9)</p>
                    </div>
                  </div>
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleBanner} className="hidden" />
            {bannerPreview && (
              <button onClick={() => { setBannerPreview(null); setBannerFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="mt-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors">
                ✕ Remove banner
              </button>
            )}
          </div>

          {/* Flyer */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Event Flyer <span className="text-gray-600 font-normal">(optional)</span></label>
            <button onClick={() => flyerRef.current?.click()}
              className="w-full rounded-2xl overflow-hidden transition-all"
              style={{ background: "var(--surface-2)", border: `2px dashed ${flyerPreview ? "var(--primary)" : "var(--border)"}`, minHeight: "100px" }}>
              {flyerPreview
                ? <img src={flyerPreview} alt="Flyer" className="w-full object-cover max-h-40" />
                : <div className="flex items-center justify-center gap-3 py-8 text-gray-500">
                    <span className="text-2xl">📄</span>
                    <p className="text-sm text-white">Upload flyer (portrait format)</p>
                  </div>
              }
            </button>
            <input ref={flyerRef} type="file" accept="image/*" onChange={handleFlyer} className="hidden" />
          </div>

          {/* Summary */}
          <div className="p-4 rounded-xl text-sm space-y-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="font-bold text-white mb-3">Review</p>
            {[
              { label: "Title", value: form.title },
              { label: "Date", value: `${form.start_date} at ${form.start_time}` },
              { label: "Venue", value: `${form.venue_name}, ${form.town}` },
              { label: "Tickets", value: `${tickets.length} tier${tickets.length !== 1 ? "s" : ""} · from KSh ${Math.min(...tickets.map((t) => Number(t.price) || 0)).toLocaleString()}` },
              { label: "Status", value: form.status === "published" ? "Published" : "Draft" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-gray-400">
                <span>{label}</span>
                <span className="text-white text-right max-w-[200px] truncate">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setError(""); setStep(3); }}
              className="flex-1 py-3.5 rounded-xl font-semibold text-gray-300" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              ← Back
            </button>
            <button onClick={handleSubmit} disabled={submitting || !bannerFile}
              className="flex-1 py-3.5 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--primary)" }}>
              {submitting ? "Publishing…" : form.status === "published" ? "Publish Event 🎟️" : "Save Draft"}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8"><div className="h-64 skeleton rounded-2xl" /></div>}>
      <CreateEventForm />
    </Suspense>
  );
}
