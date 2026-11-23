import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creative Jobs in Kenya | Merchke",
  description: "Find jobs and gigs in Kenya's creative industry: video editors, photographers, club DJs, content creators, media and events crew.",
  openGraph: {
    title: "Creative Jobs in Kenya | Merchke",
    description: "Jobs and gigs across music, media, film and events. Apply in minutes.",
    type: "website",
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
