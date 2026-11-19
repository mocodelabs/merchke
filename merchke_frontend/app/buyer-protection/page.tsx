import Link from "next/link";

const GUARANTEES = [
  {
    icon: "⏳",
    title: "7-day payout hold",
    body: "When you pay for an order, the vendor doesn't receive the money immediately. Funds are held for 7 days after delivery — giving you time to check the item before the seller gets paid.",
  },
  {
    icon: "✅",
    title: "Confirm Receipt early",
    body: "Happy with your order? Hit \"Confirm Receipt\" in My Orders to release payment to the vendor immediately. This rewards sellers who deliver fast and honestly.",
  },
  {
    icon: "⚠️",
    title: "Open a Dispute",
    body: "Something wrong? Open a dispute from your order within the 7-day window. The vendor's payout is frozen and our team investigates within 2 business days.",
  },
  {
    icon: "💸",
    title: "Refund if we rule in your favour",
    body: "If we determine the vendor failed to deliver, sent the wrong item, or misrepresented the product, you receive a full refund via M-Pesa — no questions asked.",
  },
  {
    icon: "⚑",
    title: "Report scam listings",
    body: "See a suspicious listing? Report it from the product page. Our moderation team reviews every report within 24 hours and removes fraudulent sellers.",
  },
  {
    icon: "🔒",
    title: "Secure M-Pesa payments",
    body: "All transactions use Safaricom's official STK push. Your PIN goes directly to Safaricom — Merchke never sees it. No stored card details, no third-party processors.",
  },
];

const ELIGIBLE = [
  "Item not received within the expected delivery window",
  "Wrong item or wrong variant delivered",
  "Item arrived damaged or broken",
  "Product significantly different from the description or photos",
  "Digital file corrupted, missing, or not as described",
  "Event ticket not received or invalid at the venue",
];

const NOT_ELIGIBLE = [
  "Change of mind after a digital file has been downloaded",
  "Event tickets after the event has taken place",
  "Custom / personalised physical items (unless faulty)",
  "Items that match the description but buyer expected something different",
  "Disputes opened after the 7-day window has closed",
];

export default function BuyerProtectionPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-14">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Active on every order
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
          Merchke Buyer Protection
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Every purchase on Merchke is covered. Your money is held securely until you confirm you&apos;re happy — or we issue a refund.
        </p>
      </div>

      {/* Six pillars */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16">
        {GUARANTEES.map((g) => (
          <div
            key={g.title}
            className="rounded-2xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span className="text-3xl block mb-3">{g.icon}</span>
            <h3 className="font-bold text-white text-sm mb-2">{g.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{g.body}</p>
          </div>
        ))}
      </div>

      {/* How it flows */}
      <div className="mb-16">
        <h2 className="text-2xl font-black text-white text-center mb-10">How the protection works</h2>
        <div className="relative">
          {[
            { n: "1", title: "You pay via M-Pesa", body: "Funds leave your M-Pesa and are held by Merchke — not yet paid to the vendor." },
            { n: "2", title: "Vendor ships / delivers", body: "The seller fulfils the order. Status updates to Shipped or Delivered on your orders page." },
            { n: "3", title: "7-day protection window opens", body: "You have 7 days to inspect the item. The vendor's payout is on hold the entire time." },
            { n: "4a", title: "All good? Confirm Receipt", body: "Tap \"Confirm Receipt\" to release payment. The vendor gets paid instantly and you're done." },
            { n: "4b", title: "Problem? Open a Dispute", body: "Tap \"Open Dispute\", describe the issue. Payout stays frozen and our team steps in within 2 business days." },
            { n: "5", title: "Resolution", body: "We rule based on evidence. If in your favour: full M-Pesa refund. If in vendor's favour: payout released." },
          ].map(({ n, title, body }) => (
            <div key={String(n)} className="flex gap-5 mb-6 last:mb-0">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                  style={{ background: String(n).startsWith("4") ? "#dc2626" : "var(--primary)" }}
                >
                  {n}
                </div>
                <div className="w-px flex-1 mt-2" style={{ background: "var(--border)", minHeight: 24 }} />
              </div>
              <div className="pb-2">
                <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What's covered */}
      <div className="grid md:grid-cols-2 gap-5 mb-16">
        <div className="rounded-2xl p-6" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <span style={{ color: "#10b981" }}>✓</span> What&apos;s covered
          </h3>
          <ul className="space-y-2.5">
            {ELIGIBLE.map((e) => (
              <li key={e} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="mt-0.5 text-xs shrink-0" style={{ color: "#10b981" }}>✓</span>
                {e}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <span style={{ color: "#f87171" }}>✕</span> What&apos;s not covered
          </h3>
          <ul className="space-y-2.5">
            {NOT_ELIGIBLE.map((e) => (
              <li key={e} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="mt-0.5 text-xs shrink-0" style={{ color: "#f87171" }}>✕</span>
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(249,115,22,0.08) 100%)",
          border: "1px solid rgba(16,185,129,0.2)",
        }}
      >
        <h2 className="text-xl font-black text-white mb-3">Shop with confidence</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
          Every order on Merchke is protected. Browse, buy, and if anything goes wrong — we&apos;ve got you.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/store"
            className="px-7 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--primary)" }}
          >
            Browse the store
          </Link>
          <Link
            href="/orders"
            className="px-7 py-3 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "#9ca3af" }}
          >
            My Orders
          </Link>
          <Link
            href="/contact"
            className="px-7 py-3 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "#9ca3af" }}
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
