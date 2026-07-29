"use client";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Future: wire to backend contact endpoint
    setSent(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-5xl block mb-4">✉️</span>
        <h1 className="text-3xl font-black text-white mb-3">Contact Us</h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Have a question, issue, or feedback? We're here to help. Typically reply within one business day.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Contact info */}
        <div className="space-y-5">
          {[
            {
              icon: "💬",
              label: "General Support",
              body: "Questions about orders, products, or your account.",
              detail: "support@merchke.co.ke",
            },
            {
              icon: "🏪",
              label: "Vendor Support",
              body: "Help setting up your store, payouts, or listings.",
              detail: "vendors@merchke.co.ke",
            },
            {
              icon: "🛡️",
              label: "Trust & Safety",
              body: "Report a listing, vendor, or account issue.",
              detail: "safety@merchke.co.ke",
            },
          ].map(({ icon, label, body, detail }) => (
            <div
              key={label}
              className="flex gap-4 p-5 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span className="text-2xl shrink-0">{icon}</span>
              <div>
                <p className="font-bold text-white text-sm mb-1">{label}</p>
                <p className="text-xs text-gray-500 mb-1.5">{body}</p>
                <a
                  href={`mailto:${detail}`}
                  className="text-xs font-medium"
                  style={{ color: "var(--primary)" }}
                >
                  {detail}
                </a>
              </div>
            </div>
          ))}

          <div
            className="p-5 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="font-bold text-white text-sm mb-3">Follow us</p>
            <div className="flex gap-3">
              {["Twitter / X", "Instagram", "TikTok"].map((s) => (
                <span
                  key={s}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "var(--surface-2)", color: "#9ca3af", border: "1px solid var(--border)" }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div>
          {sent ? (
            <div
              className="h-full flex flex-col items-center justify-center text-center p-10 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span className="text-5xl mb-4">🎉</span>
              <h3 className="text-lg font-bold text-white mb-2">Message sent!</h3>
              <p className="text-sm text-gray-400">We'll get back to you at <strong className="text-white">{form.email}</strong> within one business day.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-6 space-y-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none text-gray-200 placeholder-gray-600"
                    style={{ border: "1px solid var(--border)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none text-gray-200 placeholder-gray-600"
                    style={{ border: "1px solid var(--border)" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Subject</label>
                <select
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: form.subject ? "#e5e7eb" : "#4b5563" }}
                >
                  <option value="">Select a subject</option>
                  <option>Order issue</option>
                  <option>Vendor / store help</option>
                  <option>Payment / M-Pesa</option>
                  <option>Digital download problem</option>
                  <option>Event tickets</option>
                  <option>Report a listing</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Describe your issue or question…"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none text-gray-200 placeholder-gray-600 resize-none"
                  style={{ border: "1px solid var(--border)" }}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--primary)" }}
              >
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
