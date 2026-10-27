import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Protection & Escrow | Merchke",
  description: "Your money is held by Merchke until you confirm you received your order. Learn how escrow and disputes work.",
  openGraph: { title: "Buyer Protection & Escrow | Merchke", description: "Your money is held by Merchke until you confirm you received your order. Learn how escrow and disputes work.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
