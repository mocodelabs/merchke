import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kenyan Podcasts | Merchke",
  description: "Listen to Kenyan podcasts on music, comedy, sports, business and culture — straight from the creators.",
  openGraph: { title: "Kenyan Podcasts | Merchke", description: "Stream Kenyan podcasts on Merchke.", type: "website" },
};

export default function PodcastsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
