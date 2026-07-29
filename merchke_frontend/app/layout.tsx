import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CartProvider from "@/components/CartProvider";
import ShellWrapper from "@/components/ShellWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Merchke — Kenya's Creative Marketplace",
  description:
    "Buy merch, tickets, digital downloads and products from your favourite Kenyan artists, DJs, creatives, brands and events.",
  keywords: ["kenya", "merch", "artists", "events", "tickets", "nairobi", "music"],
  openGraph: {
    title: "Merchke — Kenya's Creative Marketplace",
    description: "Support Kenyan creatives. Shop merch, tickets & digital products.",
    siteName: "Merchke",
    locale: "en_KE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <CartProvider>
          <ShellWrapper>{children}</ShellWrapper>
        </CartProvider>
      </body>
    </html>
  );
}
