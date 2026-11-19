import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CartProvider from "@/components/CartProvider";
import ChatWidget from "@/components/ChatWidget";
import ShellWrapper from "@/components/ShellWrapper";
import { SITE_URL } from "@/lib/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Merchke — Kenya's Creative Industry Hub",
    template: "%s",
  },
  description:
    "One platform where fans buy, creatives sell, and the industry connects. Merch, event tickets, digital downloads, creative services, podcasts and jobs — pay with M-Pesa.",
  keywords: ["kenya", "merch", "artists", "events", "tickets", "nairobi", "music", "m-pesa", "creatives", "jobs", "podcasts"],
  openGraph: {
    title: "Merchke — Kenya's Creative Industry Hub",
    description: "Fans buy, creatives sell, the industry connects. Pay with M-Pesa, protected by escrow.",
    siteName: "Merchke",
    locale: "en_KE",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
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
          <ChatWidget />
        </CartProvider>
      </body>
    </html>
  );
}
