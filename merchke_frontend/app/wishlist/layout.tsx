import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wishlist | Merchke",
  description: "Products you've saved on Merchke.",
  robots: { index: false, follow: false },
  openGraph: { title: "My Wishlist | Merchke", description: "Products you've saved on Merchke.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
