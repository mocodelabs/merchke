"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VendorGate, { FormShell } from "@/components/VendorGate";
import { Field, FormError, inputClass, inputStyle } from "@/components/ui";
import { serviceApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/config";
import { KENYAN_CITIES, PROP_TYPES, SERVICE_CATEGORIES } from "@/lib/constants";

const MAX_IMAGES = 8;

function NewServiceForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", category: "makeup", prop_type: "", description: "", price_from: "", price_to: "",
    price_unit: "", city: "Nairobi", booking_deposit: "", booking_url: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const addImages = (files: FileList | null) => {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)].slice(0, MAX_IMAGES));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.description.trim()) return setError("Title and description are required.");
    if (!form.price_from || Number(form.price_from) <= 0) return setError("Add a starting price in KSh.");
    if (form.price_to && Number(form.price_to) < Number(form.price_from)) return setError("The top of your price range must be higher than the starting price.");
    if (images.length === 0) return setError("Add at least one portfolio photo — listings with photos get far more bookings.");

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v.trim()); });
    images.forEach((img) => data.append("images", img));
    setSubmitting(true);
    try {
      await serviceApi.create(data);
      router.push("/dashboard?tab=services&created=1");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const category = SERVICE_CATEGORIES.find((c) => c.value === form.category);

  return (
    <FormShell title="List a service" subtitle="Free to list · clients send booking requests to your email">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className="block text-xs font-semibold text-gray-400 mb-2">What do you offer? *</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SERVICE_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => set("category", c.value)}
                className="p-3 rounded-xl text-left text-xs transition-all"
                style={form.category === c.value
                  ? { background: "var(--primary-dim)", border: "2px solid var(--primary)", color: "#fff" }
                  : { background: "var(--surface-2)", border: "2px solid var(--border)", color: "#9ca3af" }}
              >
                <span className="text-lg block" aria-hidden>{c.icon}</span>
                {c.short}
              </button>
            ))}
          </div>
          {form.category === "models" && (
            <p className="text-xs mt-2" style={{ color: "#fbbf24" }}>
              Model & vixen listings only appear publicly once Merchke has verified your profile.
            </p>
          )}
          {category && <p className="text-xs text-gray-600 mt-1">{category.blurb}</p>}
        </div>

        {form.category === "props" && (
          <Field label="Prop type" htmlFor="sv-prop">
            <select id="sv-prop" value={form.prop_type} onChange={(e) => set("prop_type", e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">Choose…</option>
              {PROP_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
        )}

        <Field label="Listing title *" htmlFor="sv-title">
          <input id="sv-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Bridal & editorial glam" className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Description *" htmlFor="sv-desc">
          <textarea id="sv-desc" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="What's included, your experience, travel, how far in advance to book…" className={`${inputClass} resize-none`} style={inputStyle} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price from (KSh) *" htmlFor="sv-from">
            <input id="sv-from" type="number" min="1" value={form.price_from} onChange={(e) => set("price_from", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Price to (KSh)" htmlFor="sv-to">
            <input id="sv-to" type="number" min="1" value={form.price_to} onChange={(e) => set("price_to", e.target.value)} placeholder="Optional" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Priced per" htmlFor="sv-unit">
            <input id="sv-unit" value={form.price_unit} onChange={(e) => set("price_unit", e.target.value)} placeholder="look, day, hour…" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="City *" htmlFor="sv-city">
            <select id="sv-city" value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} style={inputStyle}>
              {KENYAN_CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          {(form.category === "tattoo" || form.category === "props") && (
            <Field label="Booking deposit (KSh)" htmlFor="sv-dep">
              <input id="sv-dep" type="number" min="0" value={form.booking_deposit} onChange={(e) => set("booking_deposit", e.target.value)} className={inputClass} style={inputStyle} />
            </Field>
          )}
        </div>

        <Field label="External booking link" htmlFor="sv-url" hint="Optional — Calendly, Instagram, your website.">
          <input id="sv-url" type="url" value={form.booking_url} onChange={(e) => set("booking_url", e.target.value)} placeholder="https://" className={inputClass} style={inputStyle} />
        </Field>

        <div>
          <span className="block text-xs font-semibold text-gray-400 mb-2">Portfolio photos * (up to {MAX_IMAGES})</span>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => addImages(e.target.files)} className="hidden" />
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, i) => (
              <div key={`${img.name}-${i}`} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: "var(--surface-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs" aria-label="Remove photo">✕</button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl flex flex-col items-center justify-center text-gray-500 text-xs"
                style={{ border: "2px dashed var(--border)", background: "var(--surface-2)" }}>
                <span className="text-2xl" aria-hidden>＋</span>Add
              </button>
            )}
          </div>
        </div>

        <FormError message={error} />
        <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
          {submitting ? "Publishing…" : "Publish service"}
        </button>
      </form>
    </FormShell>
  );
}

export default function NewServicePage() {
  return <VendorGate next="/dashboard/services/new"><NewServiceForm /></VendorGate>;
}
