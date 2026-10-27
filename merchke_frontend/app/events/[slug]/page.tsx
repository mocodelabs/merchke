import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventClientFallback from "./EventClientFallback";
import EventView from "@/components/EventView";
import { mediaUrl } from "@/lib/config";
import { fetchApi, truncate } from "@/lib/server";
import type { MerchEvent } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchApi<MerchEvent>(`/events/${slug}/`);
  if (!event) return { title: "Event | Merchke" };
  const description = truncate(event.short_description || event.description);
  const image = mediaUrl(event.banner_image);
  return {
    title: `${event.title} — ${event.town} | Merchke Tickets`,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: "summary_large_image", title: event.title, description, images: image ? [image] : undefined },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await fetchApi<MerchEvent>(`/events/${slug}/`, 60);
  // No absolute API URL at build time (e.g. local dev without NEXT_PUBLIC_API_URL): render client-side.
  if (event === null && !/^https?:\/\//.test(process.env.NEXT_PUBLIC_API_URL || "")) {
    return <EventClientFallback slug={slug} />;
  }
  if (!event) notFound();
  return <EventView event={event} />;
}
