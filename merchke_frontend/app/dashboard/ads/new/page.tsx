"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MpesaPaymentModal from "@/components/MpesaPaymentModal";
import VendorGate, { FormShell } from "@/components/VendorGate";
import { Field, FormError, inputClass, inputStyle } from "@/components/ui";
import { adApi, paymentApi, vendorApi } from "@/lib/api";
import { apiErrorMessage, formatKES } from "@/lib/config";
import type { AdType, MpesaTransaction } from "@/lib/types";

const AD_TYPES: { value: AdType; label: string; desc: string; min: number }[] = [
  { value: "homepage_spotlight", label: "Homepage spotlight", desc: "Big card in the Featured section on the homepage.", min: 1000 },
  { value: "banner", label: "Category banner", desc: "One banner on a category page (store, events, jobs…).", min: 500 },
  { value: "featured_listing", label: "Featured listing", desc: "Shown alongside featured items on the page you pick.", min: 300 },
];

const PAGES = [
  { value: "home", label: "Homepage" }, { value: "store", label: "Store" }, { value: "events", label: "Events" },
  { value: "football", label: "Football" }, { value: "hire", label: "Hire" }, { value: "jobs", label: "Jobs" },
  { value: "podcasts", label: "Podcasts" }, { value: "all", label: "All pages" },
];

function NewAdForm() {
  const router = useRouter();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState(() => ({
    ad_type: "banner" as AdType, target_page: "store", title: "", tagline: "", link: "",
    budget_ksh: "500",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
  }));
  const [image, setImage] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txn, setTxn] = useState<MpesaTransaction | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const type = AD_TYPES.find((t) => t.value === form.ad_type)!;

  useEffect(() => {
    vendorApi.getProfile().then((r) => {
      setPhone((p) => p || r.data.mpesa_phone || "");
      setForm((f) => ({ ...f, link: f.link || `/vendors/${r.data.slug}` }));
    }).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !image) return setError("Add a headline and an image.");
    if (Number(form.budget_ksh) < type.min) return setError(`Minimum budget for a ${type.label.toLowerCase()} is ${formatKES(type.min)}.`);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, String(v).trim()));
    if (form.ad_type === "homepage_spotlight") data.set("target_page", "home");
    data.append("image", image);
    data.append("phone", phone);
    setSubmitting(true);
    try {
      const { data: res } = await adApi.create(data);
      setTxn(res.transaction);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormShell title="Advertise on Merchke" subtitle="Prepaid with M-Pesa · goes live as soon as it's paid">
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2" role="radiogroup" aria-label="Ad type">
          {AD_TYPES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={form.ad_type === t.value}
              onClick={() => { set("ad_type", t.value); set("budget_ksh", String(Math.max(Number(form.budget_ksh), t.min))); }}
              className="w-full p-4 rounded-xl text-left"
              style={form.ad_type === t.value ? { background: "var(--primary-dim)", border: "2px solid var(--primary)" } : { background: "var(--surface-2)", border: "2px solid var(--border)" }}>
              <span className="text-sm font-bold text-white block">{t.label} <span className="font-normal text-gray-500">· from {formatKES(t.min)}</span></span>
              <span className="text-xs text-gray-500">{t.desc}</span>
            </button>
          ))}
        </div>

        {form.ad_type !== "homepage_spotlight" && (
          <Field label="Show on" htmlFor="ad-page">
            <select id="ad-page" value={form.target_page} onChange={(e) => set("target_page", e.target.value)} className={inputClass} style={inputStyle}>
              {PAGES.filter((p) => p.value !== "home").map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
        )}

        <Field label="Headline *" htmlFor="ad-title">
          <input id="ad-title" maxLength={80} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. New drop: Gengetone Tour Tees" className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Tagline" htmlFor="ad-tag">
          <input id="ad-tag" maxLength={140} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="One line that makes people tap" className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Link *" htmlFor="ad-link" hint="A Merchke page like /vendors/your-store, or a full https:// link.">
          <input id="ad-link" value={form.link} onChange={(e) => set("link", e.target.value)} className={inputClass} style={inputStyle} />
        </Field>

        <div>
          <span className="block text-xs font-semibold text-gray-400 mb-2">Image * (landscape works best)</span>
          <input ref={imgRef} type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="hidden" />
          <button type="button" onClick={() => imgRef.current?.click()} className="w-full aspect-[3/1] rounded-xl overflow-hidden flex items-center justify-center text-sm text-gray-500"
            style={{ border: "2px dashed var(--border)", background: "var(--surface-2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {image ? <img src={URL.createObjectURL(image)} alt="" className="w-full h-full object-cover" /> : "🖼️ Upload ad image"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Budget (KSh) *" htmlFor="ad-budget">
            <input id="ad-budget" type="number" min={type.min} value={form.budget_ksh} onChange={(e) => set("budget_ksh", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Starts" htmlFor="ad-start">
            <input id="ad-start" type="date" min={today} value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Ends" htmlFor="ad-end">
            <input id="ad-end" type="date" min={form.start_date} value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
        </div>

        <Field label="M-Pesa number *" htmlFor="ad-phone">
          <input id="ad-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className={inputClass} style={inputStyle} />
        </Field>

        <FormError message={error} />
        <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
          {submitting ? "Creating ad…" : `Pay ${formatKES(form.budget_ksh)} & launch`}
        </button>
      </form>

      <MpesaPaymentModal
        open={txn !== null}
        phone={txn?.phone ?? phone}
        amount={form.budget_ksh}
        title="Pay for your ad"
        check={async () => {
          if (!txn) return { status: "pending" };
          const { data } = await paymentApi.transaction(txn.id);
          if (data.status === "completed") return { status: "paid" };
          if (data.status === "failed") return { status: "failed", error: data.result_desc || "Payment was cancelled." };
          return { status: "pending" };
        }}
        onRetry={async () => { if (txn) setTxn((await paymentApi.retry(txn.id, phone)).data); }}
        onClose={() => router.push("/dashboard?tab=ads")}
        paidTitle="Your ad is live! 📣"
        paidBody="Track impressions and clicks from your dashboard."
      />
    </FormShell>
  );
}

export default function NewAdPage() {
  return <VendorGate next="/dashboard/ads/new"><NewAdForm /></VendorGate>;
}
