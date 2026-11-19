import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Centre | Merchke",
  description: "Answers about orders, M-Pesa payments, tickets, refunds and selling on Merchke.",
  openGraph: { title: "Help Centre | Merchke", description: "Answers about orders, M-Pesa payments, tickets, refunds and selling on Merchke.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
