import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Kenyan Creators & Brands | Merchke",
  description: "Discover artists, DJs, creatives, jersey vendors, makeup and tattoo artists and local brands selling on Merchke.",
  openGraph: { title: "Browse Kenyan Creators & Brands | Merchke", description: "Discover artists, DJs, creatives, jersey vendors, makeup and tattoo artists and local brands selling on Merchke.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
