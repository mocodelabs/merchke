import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders | Merchke",
  description: "Track your orders, tickets and downloads.",
  robots: { index: false, follow: false },
  openGraph: { title: "My Orders | Merchke", description: "Track your orders, tickets and downloads.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
