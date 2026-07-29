"use client";
import { useState } from "react";
import Link from "next/link";

const SECTIONS = [
  {
    icon: "🛒",
    title: "Buying & Orders",
    articles: [
      { q: "How do I place an order?", a: "Browse the store, add items to your cart, and proceed to checkout. You'll pay via M-Pesa — enter your phone number, confirm the STK push, and your order is placed." },
      { q: "How do I track my order?", a: "Go to My Orders from your account menu. Each order shows its current status: Pending, Confirmed, Processing, Shipped, or Delivered." },
      { q: "Can I cancel an order?", a: "You can request a cancellation before the vendor marks it as Shipped. Contact the vendor directly via their store page or use the Contact Us form." },
      { q: "What happens if my payment goes through but the order isn't confirmed?", a: "Wait up to 15 minutes for M-Pesa confirmation. If the order still doesn't appear, contact us at support@merchke.co.ke with your M-Pesa transaction code." },
    ],
  },
  {
    icon: "📲",
    title: "Digital Products",
    articles: [
      { q: "How do I download my digital product?", a: "After payment clears, go to My Orders and click the Download button next to your digital item. Downloads are usually available within seconds." },
      { q: "What if my download link doesn't work?", a: "Try refreshing the page. If the issue persists, contact us with your order number and we'll resolve it within 24 hours." },
      { q: "Is there a download limit?", a: "Some creators set a download limit (e.g. 3 downloads per purchase). The limit is shown on the product page before you buy. Once reached, contact the creator or our support team." },
    ],
  },
  {
    icon: "🎟️",
    title: "Events & Tickets",
    articles: [
      { q: "How do I get my ticket after buying?", a: "Your QR-code ticket is linked to your order in My Orders. Show it at the venue entrance for scanning. You can also screenshot it for offline use." },
      { q: "Can I transfer my ticket to someone else?", a: "Ticket transfers depend on the event organiser's policy, which is listed on the event page. If transfers are allowed, contact the organiser directly." },
      { q: "What if the event is cancelled?", a: "If an event is cancelled, the organiser is responsible for issuing refunds. Merchke will facilitate this process — contact us if you don't hear from the organiser within 48 hours." },
    ],
  },
  {
    icon: "💸",
    title: "Payments & M-Pesa",
    articles: [
      { q: "Why didn't I receive an M-Pesa push?", a: "Ensure your Safaricom line is active and not on DND. Check that you entered the correct number. Try again or contact us if the issue continues." },
      { q: "My M-Pesa was debited but the order failed — what do I do?", a: "This is rare but can happen. Take a screenshot of your M-Pesa confirmation SMS and email it to support@merchke.co.ke. We'll verify and confirm your order manually within 2 hours." },
      { q: "Do you support other payment methods?", a: "Currently, only M-Pesa (Safaricom) is supported. Bank cards and other mobile wallets are coming soon." },
    ],
  },
  {
    icon: "🏪",
    title: "Selling on Merchke",
    articles: [
      { q: "How do I become a vendor?", a: "Register for an account, select 'Vendor' during signup (or go to Register → Start Selling), complete your store profile, and start listing products immediately." },
      { q: "How do I get paid?", a: "Earnings are paid to your registered M-Pesa number. Payouts are processed after order confirmation. Check your dashboard for payout status and history." },
      { q: "What can I sell?", a: "Physical products (merch, jerseys, accessories), digital files (beats, mixes, PDFs, videos), and event tickets. All product types are supported from one vendor account." },
    ],
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-5xl block mb-4">🆘</span>
        <h1 className="text-3xl font-black text-white mb-3">Help Center</h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Find answers to the most common questions, or contact us if you need more help.
        </p>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {SECTIONS.map((s) => (
          <a
            key={s.title}
            href={`#${s.title.replace(/\s+/g, "-").toLowerCase()}`}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }}
          >
            <span>{s.icon}</span>
            {s.title}
          </a>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <div key={section.title} id={section.title.replace(/\s+/g, "-").toLowerCase()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{section.icon}</span>
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
            </div>
            <div className="space-y-2">
              {section.articles.map((art) => {
                const key = `${section.title}-${art.q}`;
                const isOpen = open === key;
                return (
                  <div
                    key={art.q}
                    className="rounded-xl overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <button
                      onClick={() => setOpen(isOpen ? null : key)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-sm font-semibold text-white">{art.q}</span>
                      <span
                        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform"
                        style={{
                          background: isOpen ? "var(--primary)" : "var(--surface-2)",
                          transform: isOpen ? "rotate(45deg)" : "none",
                        }}
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 border-t" style={{ borderColor: "var(--border)" }}>
                        <p className="text-sm text-gray-400 leading-relaxed pt-3">{art.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Contact CTA */}
      <div
        className="mt-14 rounded-2xl p-8 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <span className="text-3xl block mb-3">🙋</span>
        <h3 className="text-lg font-bold text-white mb-2">Still need help?</h3>
        <p className="text-sm text-gray-400 mb-6">Our support team usually replies within one business day.</p>
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
