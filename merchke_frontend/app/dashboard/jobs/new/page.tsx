"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MpesaPaymentModal from "@/components/MpesaPaymentModal";
import VendorGate, { FormShell } from "@/components/VendorGate";
import { Field, FormError, inputClass, inputStyle } from "@/components/ui";
import { jobApi, vendorApi } from "@/lib/api";
import { JOB_FEE_KSH, apiErrorMessage } from "@/lib/config";
import { JOB_CATEGORIES } from "@/lib/constants";
import type { Job } from "@/lib/types";

function NewJobForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", company: "", category: "creative", location: "Nairobi", is_remote: false,
    salary_range: "", deadline: "", description: "", how_to_apply: "",
  });
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    vendorApi.getProfile().then((r) => {
      setPhone((p) => p || r.data.mpesa_phone || r.data.phone_number || "");
      setForm((f) => ({ ...f, company: f.company || r.data.brand_name }));
    }).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) {
      return setError("Title, company and description are required.");
    }
    if (phone.replace(/\D/g, "").length < 9) return setError(`Enter the M-Pesa number for the KSh ${JOB_FEE_KSH} listing fee.`);
    setSubmitting(true);
    try {
      const { data } = await jobApi.create({
        ...form,
        title: form.title.trim(),
        company: form.company.trim(),
        description: form.description.trim(),
        deadline: form.deadline || null,
        mpesa_phone: phone,
      });
      setJob(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormShell title="Post a job" subtitle={`KSh ${JOB_FEE_KSH} per post · live as soon as it's paid`}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Job title *" htmlFor="jb-title">
          <input id="jb-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Music video editor" className={inputClass} style={inputStyle} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Company / brand *" htmlFor="jb-co">
            <input id="jb-co" value={form.company} onChange={(e) => set("company", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Category *" htmlFor="jb-cat">
            <select id="jb-cat" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass} style={inputStyle}>
              {JOB_CATEGORIES.filter((c) => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Location *" htmlFor="jb-loc">
            <input id="jb-loc" value={form.location} onChange={(e) => set("location", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Pay" htmlFor="jb-pay">
            <input id="jb-pay" value={form.salary_range} onChange={(e) => set("salary_range", e.target.value)} placeholder="e.g. KSh 40,000 – 60,000 / month" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Application deadline" htmlFor="jb-dl">
            <input id="jb-dl" type="date" min={new Date().toISOString().slice(0, 10)} value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 cursor-pointer self-end" style={inputStyle}>
            <input type="checkbox" checked={form.is_remote} onChange={(e) => set("is_remote", e.target.checked)} className="accent-orange-500 w-4 h-4" />
            Remote is OK
          </label>
        </div>
        <Field label="Job description *" htmlFor="jb-desc">
          <textarea id="jb-desc" rows={7} value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Role, responsibilities, what you're looking for…" className={`${inputClass} resize-none`} style={inputStyle} />
        </Field>
        <Field label="Extra application instructions" htmlFor="jb-how" hint="Applicants always send name, email, phone and a CV through Merchke.">
          <textarea id="jb-how" rows={2} value={form.how_to_apply} onChange={(e) => set("how_to_apply", e.target.value)}
            placeholder="e.g. Include a link to your showreel" className={`${inputClass} resize-none`} style={inputStyle} />
        </Field>

        <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--primary-dim)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <p className="text-sm font-semibold text-white">📱 KSh {JOB_FEE_KSH} listing fee via M-Pesa</p>
          <input type="tel" inputMode="tel" aria-label="M-Pesa number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className={inputClass} style={inputStyle} />
        </div>

        <FormError message={error} />
        <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
          {submitting ? "Posting…" : `Pay KSh ${JOB_FEE_KSH} & post job`}
        </button>
      </form>

      <MpesaPaymentModal
        open={job !== null}
        phone={job?.fee_phone || phone}
        amount={JOB_FEE_KSH}
        title="Pay job listing fee"
        timeoutSeconds={600}
        check={async () => {
          if (!job) return { status: "pending" };
          const { data } = await jobApi.feeStatus(job.id);
          if (data.fee_status === "paid") return { status: "paid" };
          if (data.fee_status === "failed" || data.fee_status === "expired") return { status: data.fee_status, error: data.fee_error };
          return { status: "pending" };
        }}
        onRetry={async () => { if (job) await jobApi.retryFee(job.id, phone); }}
        onClose={() => router.push("/dashboard?tab=jobs")}
        paidTitle="Your job is live!"
        paidBody="Applications will arrive by email and in your dashboard."
        paidActions={
          <>
            {job && <Link href={`/jobs/${job.id}`} className="w-full py-3.5 rounded-xl font-bold text-white text-center" style={{ background: "var(--primary)" }}>View job post</Link>}
            <Link href="/dashboard?tab=jobs" className="w-full py-3 rounded-xl font-semibold text-sm text-gray-300 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>My jobs</Link>
          </>
        }
      />
    </FormShell>
  );
}

export default function NewJobPage() {
  return <VendorGate next="/dashboard/jobs/new"><NewJobForm /></VendorGate>;
}
