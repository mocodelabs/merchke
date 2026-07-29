export default function PrivacyPage() {
  const EFFECTIVE = "1 July 2025";
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="text-5xl block mb-4">🔒</span>
        <h1 className="text-3xl font-black text-white mb-3">Privacy Policy</h1>
        <p className="text-xs text-gray-600">Effective date: {EFFECTIVE}</p>
      </div>

      <div className="space-y-6 text-sm text-gray-400 leading-relaxed">
        {[
          {
            title: "1. Who we are",
            body: "Merchke ('we', 'us', 'our') is a Kenya-based online marketplace operated by Merchke Ltd. We connect buyers with vendors selling physical merch, digital products, and event tickets. Contact: privacy@merchke.co.ke",
          },
          {
            title: "2. Information we collect",
            body: "• Account info: name, email address, phone number (M-Pesa)\n• Vendor info: brand name, bank/M-Pesa details for payouts\n• Order info: items purchased, delivery address, payment confirmation\n• Usage data: pages visited, search queries, click events (anonymised)\n• Device data: browser type, IP address, operating system",
          },
          {
            title: "3. How we use your information",
            body: "• Process orders and payments via M-Pesa\n• Send order confirmations and updates via SMS/email\n• Operate and improve the Merchke platform\n• Detect and prevent fraud or policy violations\n• Respond to support requests\n• Send marketing emails (only if you opt in; unsubscribe any time)",
          },
          {
            title: "4. Sharing your data",
            body: "We do not sell your personal data. We share it only with:\n• Vendors — to fulfil your order (name, delivery address, phone)\n• Safaricom — to process M-Pesa payments\n• Delivery partners — to ship physical orders\n• Legal authorities — if required by Kenyan law\n\nAll third parties are bound by confidentiality agreements.",
          },
          {
            title: "5. Data storage & security",
            body: "Your data is stored on secure servers. We use TLS encryption for all data in transit and follow industry-standard security practices. M-Pesa credentials are never stored on our servers.",
          },
          {
            title: "6. Your rights",
            body: "Under the Kenya Data Protection Act 2019, you have the right to:\n• Access the personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your account and data\n• Object to how we process your data\n\nSubmit requests to privacy@merchke.co.ke. We respond within 14 days.",
          },
          {
            title: "7. Cookies",
            body: "We use essential cookies to keep you logged in and remember your cart. We use analytics cookies (anonymised) to understand how the platform is used. You can disable non-essential cookies in your browser settings.",
          },
          {
            title: "8. Children",
            body: "Merchke is not intended for children under 16. We do not knowingly collect data from minors. If you believe a minor has registered, contact us immediately.",
          },
          {
            title: "9. Changes to this policy",
            body: "We may update this policy from time to time. When we do, the effective date at the top will change and we'll notify registered users by email.",
          },
          {
            title: "10. Contact",
            body: "For privacy questions or data requests: privacy@merchke.co.ke\nMerchke Ltd, Nairobi, Kenya",
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
    </div>
  );
}
