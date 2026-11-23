import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How Merchke Works | Merchke",
  description: "How buying, selling, M-Pesa payments and escrow buyer protection work on Merchke.",
  openGraph: { title: "How Merchke Works | Merchke", description: "How buying, selling, M-Pesa payments and escrow buyer protection work on Merchke.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
