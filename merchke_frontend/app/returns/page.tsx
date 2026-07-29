import Link from "next/link";

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-5xl block mb-4">↩️</span>
        <h1 className="text-3xl font-black text-white mb-3">Returns Policy</h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Our returns and refund policy for physical products, digital downloads, and event tickets.
        </p>
      </div>

      <div className="space-y-6">
        {/* Quick summary */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: "👕", label: "Physical merch", detail: "7-day return window" },
            { icon: "📲", label: "Digital products", detail: "No returns (instant delivery)" },
            { icon: "🎟️", label: "Event tickets", detail: "Non-refundable unless event cancelled" },
          ].map(({ icon, label, detail }) => (
            <div
              key={label}
              className="text-center rounded-2xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <span className="text-3xl block mb-2">{icon}</span>
              <p className="text-sm font-bold text-white mb-1">{label}</p>
              <p className="text-xs text-gray-500">{detail}</p>
            </div>
          ))}
        </div>

        {[
          {
            title: "Physical Products — Returns",
            body: "You have 7 days from the delivery date to request a return for physical items. To qualify:\n• The item must be unused, unwashed, and in original condition\n• Original packaging must be included where possible\n• Custom-printed or personalised items cannot be returned unless faulty\n\nContact the vendor directly first. If unresolved within 48 hours, contact Merchke support and we'll step in.",
          },
          {
            title: "Damaged or Wrong Items",
            body: "If your order arrives damaged or you receive the wrong item, you're entitled to a full refund or replacement at no cost. Take clear photos and contact the vendor within 48 hours of delivery. If the vendor doesn't resolve it, escalate to support@merchke.co.ke with your order number and photos.",
          },
          {
            title: "Digital Products — No Returns",
            body: "Because digital files are delivered instantly and can be copied, we cannot accept returns for digital downloads (beats, mixes, PDFs, presets, etc.) once the file has been accessed.\n\nExceptions apply if:\n• The file is corrupted and the vendor cannot provide a working replacement\n• The product was materially misrepresented in its description\n\nContact us and we'll review your case.",
          },
          {
            title: "Event Tickets — No Refunds (Unless Cancelled)",
            body: "Tickets are non-refundable once purchased. If an event is cancelled or significantly rescheduled, the organiser must issue a full refund within 14 days. If you don't receive a refund from the organiser, contact Merchke support and we will facilitate recovery via M-Pesa reversal where possible.",
          },
          {
            title: "Refund Processing",
            body: "Approved refunds are returned to the original M-Pesa number used at checkout. Processing time is typically 1–5 business days after the vendor approves the return. You'll receive an SMS confirmation from M-Pesa when the funds arrive.",
          },
          {
            title: "How to Start a Return",
            body: "1. Go to My Orders and find the order\n2. Contact the vendor via their store page\n3. If unresolved in 48 hours, use the Contact page and select 'Order issue'\n4. Include your order number, photos (if applicable), and a description of the problem\n\nWe aim to resolve all disputes within 3 business days.",
          },
        ].map(({ title, body }) => (
          <div
            key={title}
            className="rounded-2xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-bold text-white mb-3">{title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{body}</p>
          </div>
        ))}
      </div>

      <div
        className="mt-10 rounded-2xl p-6 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm text-gray-400 mb-4">Need to start a return or escalate an issue?</p>
        <Link
          href="/contact"
          className="inline-block px-8 py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: "var(--primary)" }}
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}
