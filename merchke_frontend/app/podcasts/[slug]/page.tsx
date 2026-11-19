import type { Metadata } from "next";
import PodcastPlayer from "./PodcastPlayer";
import { mediaUrl } from "@/lib/config";
import { fetchApi, truncate } from "@/lib/server";
import type { Podcast } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const podcast = await fetchApi<Podcast>(`/podcasts/${slug}/`);
  if (!podcast) return { title: "Podcast | Merchke" };
  const description = truncate(podcast.description);
  const image = mediaUrl(podcast.cover_image);
  return {
    title: `${podcast.title} — ${podcast.vendor_name} | Merchke Podcasts`,
    description,
    openGraph: { title: podcast.title, description, type: "website", images: image ? [{ url: image }] : undefined },
  };
}

export default async function PodcastPage({ params }: Props) {
  const { slug } = await params;
  return <PodcastPlayer slug={slug} />;
}
