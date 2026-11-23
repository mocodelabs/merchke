import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Delivery | Merchke",
  description: "Delivery fees, timelines and pickup options for Merchke orders across Kenya.",
  openGraph: { title: "Shipping & Delivery | Merchke", description: "Delivery fees, timelines and pickup options for Merchke orders across Kenya.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
