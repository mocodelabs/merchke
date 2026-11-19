"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ErrorState, Field, FormError, inputClass, inputStyle } from "@/components/ui";
import { jobApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { apiErrorMessage, formatDate } from "@/lib/config";
import type { Job } from "@/lib/types";

export default function JobDetail({ id }: { id: number }) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    jobApi.detail(id).then((r) => setJob(r.data)).catch(() => setError("This job is no longer available."));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState message={error} />
        <div className="text-center mt-6"><Link href="/jobs" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>Browse all jobs →</Link></div>
      </div>
    );
  }
  if (!job) {
    return <div className="max-w-3xl mx-auto px-4 py-8 space-y-4"><div className="h-10 w-2/3 skeleton" /><div className="h-64 skeleton rounded-2xl" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-28 sm:pb-8">
      <Link href="/jobs" className="text-sm text-gray-500 hover:text-white">← All jobs</Link>
      <div className="mt-4 p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
          {job.category_display}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-3">{job.title}</h1>
        <p className="text-base text-gray-300 mt-1">{job.company}</p>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-sm">
          <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
            <dt className="text-xs text-gray-500">Location</dt>
            <dd className="text-white font-medium">{job.location}{job.is_remote ? " · Remote OK" : ""}</dd>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
            <dt className="text-xs text-gray-500">Pay</dt>
            <dd className="text-white font-medium">{job.salary_range || "Discussed at interview"}</dd>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
            <dt className="text-xs text-gray-500">Apply by</dt>
            <dd className="text-white font-medium">{job.deadline ? formatDate(job.deadline) : "Open until filled"}</dd>
          </div>
        </dl>
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line mt-6">{job.description}</div>
        {job.how_to_apply && (
          <div className="mt-5 p-4 rounded-xl text-sm" style={{ background: "var(--surface-2)" }}>
            <p className="font-semibold text-white mb-1">How to apply</p>
            <p className="text-gray-400 whitespace-pre-line">{job.how_to_apply}</p>
          </div>
        )}
        <div className="hidden sm:block mt-6">
          <ApplyButton job={job} applied={applied} onClick={() => setApplyOpen(true)} />
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 p-4 z-30" style={{ background: "rgba(10,10,10,0.92)", borderTop: "1px solid var(--border)" }}>
        <ApplyButton job={job} applied={applied} onClick={() => setApplyOpen(true)} />
      </div>

      {applyOpen && (
        <ApplyModal job={job} onClose={() => setApplyOpen(false)} onApplied={() => { setApplied(true); setApplyOpen(false); }} />
      )}
    </div>
  );
}

function ApplyButton({ job, applied, onClick }: { job: Job; applied: boolean; onClick: () => void }) {
  if (applied) {
    return <p className="w-full py-3.5 rounded-xl text-center font-bold text-sm" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>✓ Application sent</p>;
  }
  if (!job.is_open) {
    return <p className="w-full py-3.5 rounded-xl text-center text-sm text-gray-500" style={{ background: "var(--surface-2)" }}>Applications closed</p>;
  }
  return (
    <button onClick={onClick} className="w-full py-3.5 rounded-xl font-bold text-white glow-orange" style={{ background: "var(--primary)" }}>
      Apply now
    </button>
  );
}

function ApplyModal({ job, onClose, onApplied }: { job: Job; onClose: () => void; onApplied: () => void }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: user?.email ?? "", phone: "", cv_url: "", cover: "" });
  const [cv, setCv] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Name, email and phone are required.");
      return;
    }
    if (!cv && !form.cv_url.trim()) {
      setError("Attach your CV or paste a link to it.");
      return;
    }
    if (cv && cv.size > 5 * 1024 * 1024) {
      setError("CV must be under 5 MB.");
      return;
    }
    const data = new FormData();
    data.append("applicant_name", form.name.trim());
    data.append("email", form.email.trim());
    data.append("phone", form.phone.trim());
    data.append("cover_letter", form.cover.trim());
    if (cv) data.append("cv_file", cv);
    if (form.cv_url.trim()) data.append("cv_url", form.cv_url.trim());
    setSubmitting(true);
    try {
      await jobApi.apply(job.id, data);
      onApplied();
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't send your application."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="apply-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-6 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div>
          <h2 id="apply-title" className="text-lg font-black text-white">Apply: {job.title}</h2>
          <p className="text-xs text-gray-500">{job.company} will receive your details by email.</p>
        </div>
        <Field label="Full name *" htmlFor="ap-name">
          <input id="ap-name" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" className={inputClass} style={inputStyle} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email *" htmlFor="ap-email">
            <input id="ap-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Phone *" htmlFor="ap-phone">
            <input id="ap-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" className={inputClass} style={inputStyle} />
          </Field>
        </div>
        <div>
          <span className="block text-xs font-semibold text-gray-400 mb-2">CV (PDF or Word, max 5 MB)</span>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCv(e.target.files?.[0] ?? null)} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full p-4 rounded-xl text-sm text-left"
            style={{ border: `2px dashed ${cv ? "var(--primary)" : "var(--border)"}`, background: "var(--surface-2)" }}
          >
            {cv ? <span className="text-white">📄 {cv.name}</span> : <span className="text-gray-500">📎 Tap to upload your CV</span>}
          </button>
          <input
            aria-label="Or paste a CV / portfolio link"
            value={form.cv_url}
            onChange={(e) => set("cv_url", e.target.value)}
            placeholder="…or paste a link (Google Drive, Behance, YouTube)"
            className={`${inputClass} mt-2`}
            style={inputStyle}
          />
        </div>
        <Field label="Cover letter" htmlFor="ap-cover">
          <textarea id="ap-cover" rows={4} value={form.cover} onChange={(e) => set("cover", e.target.value)} placeholder="Why you're a great fit, links to your best work…" className={`${inputClass} resize-none`} style={inputStyle} />
        </Field>
        <FormError message={error} />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-300" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
            {submitting ? "Sending…" : "Send application"}
          </button>
        </div>
      </form>
    </div>
  );
}
