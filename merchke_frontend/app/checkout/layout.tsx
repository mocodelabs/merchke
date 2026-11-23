import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout | Merchke",
  description: "Pay securely with M-Pesa.",
  robots: { index: false, follow: false },
  openGraph: { title: "Checkout | Merchke", description: "Pay securely with M-Pesa.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
