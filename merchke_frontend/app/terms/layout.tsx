import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Merchke",
  description: "The terms that apply when you buy or sell on Merchke.",
  openGraph: { title: "Terms of Service | Merchke", description: "The terms that apply when you buy or sell on Merchke.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
