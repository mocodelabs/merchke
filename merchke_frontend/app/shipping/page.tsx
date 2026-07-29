import Link from "next/link";

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-5xl block mb-4">📦</span>
        <h1 className="text-3xl font-black text-white mb-3">Shipping Info</h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Everything you need to know about delivery for physical products ordered on Merchke.
        </p>
      </div>

      <div className="space-y-6">
        {[
          {
            title: "Who ships my order?",
            body: "Each vendor on Merchke handles their own shipping. Delivery timelines, courier partners, and packaging are set by the individual seller. Check the product page or vendor store for shipping details before you buy.",
          },
          {
            title: "How long will delivery take?",
            body: "Delivery times vary by vendor location and your delivery address:\n• Nairobi CBD & environs: 1–2 business days\n• Other Nairobi areas: 2–3 business days\n• Outside Nairobi (rest of Kenya): 3–7 business days\n\nSome vendors offer same-day delivery within Nairobi for an extra fee. This will be shown at checkout if available.",
          },
          {
            title: "How much does shipping cost?",
            body: "Shipping fees are set by each vendor and displayed during checkout before you confirm your order. Fees typically range from KES 100–500 depending on location and order size. Some vendors offer free shipping on orders above a threshold.",
          },
          {
            title: "Can I track my delivery?",
            body: "Go to My Orders from your account. Once a vendor ships your order, the status updates to 'Shipped'. Some vendors share a tracking number or courier contact — check your order notes or contact the vendor directly from their store page.",
          },
          {
            title: "What if my order arrives damaged?",
            body: "Take photos immediately and contact the vendor within 48 hours. If the vendor doesn't respond, escalate via our Contact page and we'll help mediate. Keep all original packaging for damage claims.",
          },
          {
            title: "Do you ship outside Kenya?",
            body: "Currently, Merchke vendors primarily ship within Kenya. Some vendors may offer international shipping — this will be indicated on their product listings. International orders are subject to local customs duties and the buyer is responsible for import fees.",
          },
          {
            title: "Digital products have no shipping",
            body: "Digital downloads (beats, mixes, e-books, presets, etc.) are delivered instantly after M-Pesa payment. No physical delivery, no shipping fee, no waiting.",
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
        <p className="text-sm text-gray-400 mb-4">Have a shipping issue with your order?</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/orders"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            View my orders
          </Link>
          <Link
            href="/contact"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "#9ca3af" }}
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
