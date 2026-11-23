import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Merchke",
  description: "How Merchke collects, uses and protects your data.",
  openGraph: { title: "Privacy Policy | Merchke", description: "How Merchke collects, uses and protects your data.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
