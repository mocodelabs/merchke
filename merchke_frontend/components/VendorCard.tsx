import Link from "next/link";

interface Vendor {
  id: number;
  name: string;
  type: string;
  slug: string;
  followers: string;
  products: number;
  verified: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  artist: "🎨",
  dj: "🎧",
  creative: "🎭",
  jersey: "👕",
  brand: "🏷️",
  events: "🎟️",
  digital: "📲",
};

const TYPE_LABEL: Record<string, string> = {
  artist: "Artist",
  dj: "DJ",
  creative: "Creative",
  jersey: "Jersey Vendor",
  brand: "Local Brand",
  events: "Events",
  digital: "Digital",
};

export default function VendorCard({ vendor }: { vendor: Vendor }) {
  const { name, type, slug, followers, products, verified } = vendor;
  const emoji = TYPE_EMOJI[type] ?? "🏪";
  const typeLabel = TYPE_LABEL[type] ?? "Vendor";

  return (
    <Link
      href={`/vendors/${slug}`}
      className="group block rounded-2xl p-5 card-hover"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      {/* Avatar */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {emoji}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">
              {name}
            </span>
            {verified && (
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: "var(--accent)" }}
                title="Verified"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 font-medium"
            style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
          >
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{followers} followers</span>
        <span>{products} products</span>
      </div>

      {/* Visit CTA */}
      <div
        className="mt-4 py-2 rounded-xl text-xs font-semibold text-center transition-all"
        style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
      >
        Visit Store →
      </div>
    </Link>
  );
}
