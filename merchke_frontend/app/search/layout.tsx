import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | Merchke",
  description: "Search merch, events, creators and more across Merchke.",
  openGraph: { title: "Search | Merchke", description: "Search merch, events, creators and more across Merchke.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
