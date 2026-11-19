import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart | Merchke",
  description: "Items in your Merchke cart.",
  robots: { index: false, follow: false },
  openGraph: { title: "Your Cart | Merchke", description: "Items in your Merchke cart.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
