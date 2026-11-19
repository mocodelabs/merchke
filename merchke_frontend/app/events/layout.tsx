import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events & Tickets in Kenya | Merchke",
  description: "Concerts, comedy, football tournaments, live podcasts and bike rides across Kenya. Buy tickets with M-Pesa and get a QR ticket instantly.",
  openGraph: {
    title: "Events & Tickets in Kenya | Merchke",
    description: "Buy event tickets with M-Pesa. Instant QR tickets, buyer protection on every purchase.",
    type: "website",
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
