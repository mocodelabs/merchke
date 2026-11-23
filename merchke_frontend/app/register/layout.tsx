import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account | Merchke",
  description: "Join Merchke to shop Kenyan creators or open your own store.",
  openGraph: { title: "Create an Account | Merchke", description: "Join Merchke to shop Kenyan creators or open your own store.", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
