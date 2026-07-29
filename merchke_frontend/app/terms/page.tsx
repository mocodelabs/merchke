import Link from "next/link";

export default function TermsPage() {
  const EFFECTIVE = "1 July 2025";
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="text-5xl block mb-4">📋</span>
        <h1 className="text-3xl font-black text-white mb-3">Terms of Service</h1>
        <p className="text-xs text-gray-600">Effective date: {EFFECTIVE}</p>
      </div>

      <div className="space-y-6 text-sm text-gray-400 leading-relaxed">
        {[
          {
            title: "1. Acceptance",
            body: "By creating an account or making a purchase on Merchke, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the platform.",
          },
          {
            title: "2. Eligibility",
            body: "You must be at least 16 years old to use Merchke. By registering, you confirm you meet this requirement. Vendors must additionally have a valid Safaricom M-Pesa account for payouts.",
          },
          {
            title: "3. Buyer obligations",
            body: "As a buyer you agree to:\n• Provide accurate delivery and contact information\n• Pay for all items in your cart at checkout\n• Use M-Pesa only for genuine purchases\n• Not charge back legitimate transactions\n• Treat vendors respectfully",
          },
          {
            title: "4. Vendor obligations",
            body: "As a vendor you agree to:\n• Accurately describe all products and pricing\n• Ship physical orders within 3 business days of confirmation\n• Deliver digital files that work as described\n• Respond to buyer queries within 48 hours\n• Not list counterfeit, infringing, or prohibited items\n• Comply with Kenya's consumer protection laws",
          },
          {
            title: "5. Prohibited content",
            body: "You may not list or sell:\n• Counterfeit or trademark-infringing goods\n• Weapons, drugs, or controlled substances\n• Adult content without explicit permission from Merchke\n• Stolen goods or items obtained illegally\n• Products that violate any Kenyan law\n\nViolations result in immediate account suspension.",
          },
          {
            title: "6. Payments",
            body: "All transactions are processed via M-Pesa (Safaricom). Merchke charges a platform fee per transaction, displayed at checkout. Vendor payouts are processed after order confirmation. Merchke is not liable for M-Pesa service outages or delays caused by Safaricom.",
          },
          {
            title: "7. Intellectual property",
            body: "Vendors retain ownership of all content they upload. By listing on Merchke, you grant us a non-exclusive licence to display your product images and descriptions on the platform. Buyers who purchase digital products receive a personal, non-commercial licence to use the file unless the creator specifies otherwise.",
          },
          {
            title: "8. Dispute resolution",
            body: "Buyer-vendor disputes should first be resolved directly. If no resolution is reached within 48 hours, either party may escalate to Merchke support. We will review the case and issue a binding decision within 5 business days. Our decision regarding refunds is final.",
          },
          {
            title: "9. Limitation of liability",
            body: "Merchke is a marketplace platform. We are not responsible for the quality, accuracy, or legality of vendor listings, or for delays and damage caused by third-party couriers. Our total liability to any user is limited to the value of the transaction in dispute.",
          },
          {
            title: "10. Termination",
            body: "We may suspend or terminate accounts that violate these terms, engage in fraud, or harm other users or the platform. Vendors found selling prohibited items will be permanently banned with no payout of pending earnings.",
          },
          {
            title: "11. Governing law",
            body: "These terms are governed by the laws of Kenya. Any disputes not resolved through our internal process shall be subject to the jurisdiction of Kenyan courts.",
          },
          {
            title: "12. Changes to these terms",
            body: "We may update these terms. Continued use of Merchke after notification constitutes acceptance. Major changes will be communicated via email with at least 14 days notice.",
          },
        ].map(({ title, body }) => (
          <div
            key={title}
            className="rounded-2xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-bold text-white mb-3">{title}</h3>
            <p className="whitespace-pre-line">{body}</p>
          </div>
        ))}
      </div>

      <div
        className="mt-10 rounded-2xl p-6 text-center text-sm text-gray-500"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p>Questions about these terms? <Link href="/contact" className="underline" style={{ color: "var(--primary)" }}>Contact us</Link></p>
        <p className="mt-1">Also see our <Link href="/privacy" className="underline" style={{ color: "var(--primary)" }}>Privacy Policy</Link></p>
      </div>
    </div>
  );
}
