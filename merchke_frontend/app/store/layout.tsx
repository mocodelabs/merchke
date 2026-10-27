import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Kenyan Merch, Jerseys & Brands | Merchke",
  description: "Shop merch, prints, jerseys, local fashion and accessories from Kenyan artists, DJs, creatives and brands. Pay with M-Pesa, protected by escrow.",
  openGraph: { title: "Shop Kenyan Merch, Jerseys & Brands | Merchke", description: "Shop merch, prints, jerseys, local fashion and accessories from Kenyan artists, DJs, creatives and brands. Pay with M-Pesa, protected by escrow.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
