import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in | Merchke",
  description: "Log in to your Merchke account.",
  openGraph: { title: "Log in | Merchke", description: "Log in to your Merchke account.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
