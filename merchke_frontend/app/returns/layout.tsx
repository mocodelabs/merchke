import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns Policy | Merchke",
  description: "How returns, refunds and disputes work on Merchke.",
  openGraph: { title: "Returns Policy | Merchke", description: "How returns, refunds and disputes work on Merchke.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
