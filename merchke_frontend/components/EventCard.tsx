import Image from "next/image";
import Link from "next/link";
import { formatKES, mediaUrl } from "@/lib/config";
import type { MerchEvent } from "@/lib/types";

export const EVENT_CATEGORIES = [
  { value: "", label: "All", icon: "🎟️" },
  { value: "concert", label: "Concerts", icon: "🎤" },
  { value: "tournament", label: "Football", icon: "⚽" },
  { value: "comedy", label: "Comedy", icon: "😂" },
  { value: "podcast_live", label: "Live Podcasts", icon: "🎙️" },
  { value: "exhibition", label: "Exhibitions", icon: "🖼️" },
  { value: "ride", label: "Bike Rides", icon: "🏍️" },
  { value: "other", label: "Other", icon: "✨" },
] as const;

export default function EventCard({ event, priority = false }: { event: MerchEvent; priority?: boolean }) {
  const d = new Date(event.start_datetime);
  const month = d.toLocaleString("en-KE", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const time = d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
  const price = event.min_price;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden card-hover"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="relative aspect-[16/10] overflow-hidden" style={{ background: "var(--surface-2)" }}>
        {event.banner_image && (
          <Image
            src={mediaUrl(event.banner_image)}
            alt={event.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute top-3 left-3 w-12 rounded-xl flex flex-col items-center py-1.5 text-center" style={{ background: "rgba(10,10,10,0.85)" }}>
          <span className="text-[10px] font-bold" style={{ color: "var(--primary)" }}>{month}</span>
          <span className="text-lg font-black text-white leading-none">{day}</span>
        </div>
        {event.is_featured && (
          <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ background: "var(--primary)" }}>
            FEATURED
          </span>
        )}
        {event.is_sold_out && (
          <span className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full text-white bg-red-600">SOLD OUT</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--primary)" }}>
          {event.category_display}{event.genre ? ` · ${event.genre}` : ""}
        </p>
        <h3 className="text-base font-bold text-white leading-snug mt-1 line-clamp-2 group-hover:text-orange-400 transition-colors">
          {event.title}
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 truncate">📍 {event.venue_name}, {event.town} · {time}</p>
        <div className="flex items-center justify-between mt-auto pt-3">
          <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            {price == null ? "Tickets soon" : Number(price) === 0 ? "Free" : `From ${formatKES(price)}`}
          </span>
          <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
            {event.is_sold_out ? "View" : "Get Tickets →"}
          </span>
        </div>
      </div>
    </Link>
  );
}
