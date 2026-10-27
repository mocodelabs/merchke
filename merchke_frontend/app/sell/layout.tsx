import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell on Merchke — Open Your Store | Merchke",
  description: "Open a free store in minutes. Sell merch, tickets, digital products and services to fans across Kenya with M-Pesa and buyer protection.",
  openGraph: { title: "Sell on Merchke — Open Your Store | Merchke", description: "Open a free store in minutes. Sell merch, tickets, digital products and services to fans across Kenya with M-Pesa and buyer protection.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
