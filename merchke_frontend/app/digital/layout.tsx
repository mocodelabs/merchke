import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digital Downloads — Beats, Presets, E-books | Merchke",
  description: "Instant downloads from Kenyan creators: beats, sample packs, presets, mixes and e-books. Pay with M-Pesa and download straight away.",
  openGraph: { title: "Digital Downloads — Beats, Presets, E-books | Merchke", description: "Instant downloads from Kenyan creators: beats, sample packs, presets, mixes and e-books. Pay with M-Pesa and download straight away.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
