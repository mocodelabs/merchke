import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Merchke",
  description: "Get in touch with the Merchke team.",
  openGraph: { title: "Contact Us | Merchke", description: "Get in touch with the Merchke team.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
