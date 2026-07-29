import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="border-t mt-16"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-2xl font-black" style={{ color: "var(--primary)" }}>
              Merch<span className="text-white">ke</span>
            </span>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Kenya's home for creatives. Buy merch, tickets and digital products from the artists and brands you love.
            </p>
            <div className="flex gap-3 mt-4">
              {["twitter", "instagram", "tiktok"].map((s) => (
                <a
                  key={s}
                  href={`https://${s}.com/merchke`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <span className="text-xs uppercase">{s[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              {[
                { href: "/store", label: "All Products" },
                { href: "/events", label: "Events & Tickets" },
                { href: "/digital", label: "Digital Downloads" },
                { href: "/jerseys", label: "Jerseys" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Sell on Merchke</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              {[
                { href: "/sell", label: "Start Selling" },
                { href: "/sell/artists", label: "For Artists" },
                { href: "/sell/events", label: "Event Organizers" },
                { href: "/sell/brands", label: "Local Brands" },
                { href: "/dashboard", label: "Vendor Dashboard" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              {[
                { href: "/how-it-works", label: "How It Works" },
                { href: "/buyer-protection", label: "Buyer Protection" },
                { href: "/help", label: "Help Center" },
                { href: "/shipping", label: "Shipping Info" },
                { href: "/returns", label: "Returns Policy" },
                { href: "/contact", label: "Contact Us" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600"
          style={{ borderColor: "var(--border)" }}
        >
          <p>© {new Date().getFullYear()} Merchke. All rights reserved. Made with 🇰🇪 in Kenya.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              Payments via M-Pesa
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
