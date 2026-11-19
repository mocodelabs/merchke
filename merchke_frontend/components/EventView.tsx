import Image from "next/image";
import Link from "next/link";
import TicketPurchase from "@/components/TicketPurchase";
import { formatDateTime, mediaUrl } from "@/lib/config";
import type { MerchEvent } from "@/lib/types";

export default function EventView({ event }: { event: MerchEvent }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.start_datetime,
    endDate: event.end_datetime ?? undefined,
    eventStatus: event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: event.venue_name, address: `${event.venue_address}, ${event.town}, Kenya` },
    image: event.banner_image ? [mediaUrl(event.banner_image)] : undefined,
    organizer: { "@type": "Organization", name: event.vendor_name },
    offers: event.ticket_types.map((t) => ({
      "@type": "Offer", name: t.name, price: Number(t.price), priceCurrency: "KES",
      availability: t.is_sold_out ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    })),
  };

  return (
    <div className="pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/8] max-h-[520px] overflow-hidden" style={{ background: "var(--surface)" }}>
        {event.banner_image && (
          <Image src={mediaUrl(event.banner_image)} alt={event.title} fill priority sizes="100vw" className="object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--background) 0%, transparent 60%)" }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 sm:-mt-24 relative">
        <Link href="/events" className="text-sm text-gray-400 hover:text-white">← All events</Link>
        <div className="grid lg:grid-cols-3 gap-8 mt-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
                {event.category_display}{event.genre ? ` · ${event.genre}` : ""}
              </p>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mt-1">{event.title}</h1>
              <p className="text-sm text-gray-400 mt-2">
                by <Link href={`/vendors/${event.vendor_slug}`} className="font-semibold text-white hover:text-orange-400">{event.vendor_name}</Link>
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs text-gray-500 mb-1">📅 When</p>
                <p className="text-sm font-semibold text-white">{formatDateTime(event.start_datetime)}</p>
                {event.end_datetime && <p className="text-xs text-gray-500">until {formatDateTime(event.end_datetime)}</p>}
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs text-gray-500 mb-1">📍 Where</p>
                <p className="text-sm font-semibold text-white">{event.venue_name}</p>
                <p className="text-xs text-gray-500">{event.venue_address}, {event.town}</p>
                {event.google_maps_link && (
                  <a href={event.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold mt-1 inline-block" style={{ color: "var(--primary)" }}>
                    Open in Maps →
                  </a>
                )}
              </div>
            </div>

            <section>
              <h2 className="text-lg font-bold text-white mb-2">About this event</h2>
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{event.description}</div>
            </section>

            {event.flyer && (
              <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden" style={{ background: "var(--surface)" }}>
                <Image src={mediaUrl(event.flyer)} alt={`${event.title} flyer`} fill sizes="(max-width: 768px) 100vw, 400px" className="object-contain" />
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <TicketPurchase event={event} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
