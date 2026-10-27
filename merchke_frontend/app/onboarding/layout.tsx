import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set Up Your Store | Merchke",
  description: "Finish setting up your Merchke store.",
  robots: { index: false, follow: false },
  openGraph: { title: "Set Up Your Store | Merchke", description: "Finish setting up your Merchke store.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
