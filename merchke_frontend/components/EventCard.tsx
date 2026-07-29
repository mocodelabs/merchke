import Link from "next/link";

interface Event {
  id: number;
  title: string;
  date: string;
  venue: string;
  price: number;
  image: string;
  genre: string;
}

const GENRE_COLORS: Record<string, { bg: string; color: string }> = {
  Afrobeats: { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
  Comedy: { bg: "rgba(250,204,21,0.15)", color: "#fbbf24" },
  Gospel: { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  Talk: { bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
  default: { bg: "rgba(255,255,255,0.08)", color: "#9ca3af" },
};

export default function EventCard({ event }: { event: Event }) {
  const { id, title, date, venue, price, genre } = event;
  const genreStyle = GENRE_COLORS[genre] ?? GENRE_COLORS.default;

  const dateObj = new Date(date);
  const month = dateObj.toLocaleString("en-KE", { month: "short" }).toUpperCase();
  const day = dateObj.getDate();

  return (
    <Link
      href={`/events/${id}`}
      className="group flex gap-4 rounded-2xl p-4 card-hover"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Date block */}
      <div
        className="shrink-0 w-14 rounded-xl flex flex-col items-center justify-center py-2 text-center"
        style={{ background: "var(--primary-dim)", border: "1px solid rgba(249,115,22,0.2)" }}
      >
        <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>{month}</span>
        <span className="text-2xl font-black text-white leading-none">{day}</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-white leading-snug group-hover:text-orange-400 transition-colors line-clamp-2">
            {title}
          </h3>
          <span
            className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: genreStyle.bg, color: genreStyle.color }}
          >
            {genre}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-2 truncate">📍 {venue}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            KSh {price.toLocaleString()}
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--primary)" }}
          >
            Get Tickets →
          </span>
        </div>
      </div>
    </Link>
  );
}
