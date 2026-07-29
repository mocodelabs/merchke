"use client";

type Card = {
  gradient: string;
  icon: string;
  label: string;
  tag: string;
  price: string;
  accentColor: string;
};

const COL1: Card[] = [
  { gradient: "linear-gradient(135deg, #ea580c 0%, #db2777 100%)", icon: "🎨", label: "Nairobi Threads", tag: "MERCH DROP", price: "KSh 1,800", accentColor: "#f97316" },
  { gradient: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", icon: "🎟️", label: "Afro Night Vol.5", tag: "EVENT", price: "KSh 2,500", accentColor: "#818cf8" },
  { gradient: "linear-gradient(135deg, #16a34a 0%, #0d9488 100%)", icon: "🎧", label: "Trap Pack 2024", tag: "DIGITAL", price: "KSh 999", accentColor: "#10b981" },
  { gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)", icon: "👕", label: "Harambee Jersey", tag: "SPORTS", price: "KSh 3,200", accentColor: "#f87171" },
];

const COL2: Card[] = [
  { gradient: "linear-gradient(135deg, #0891b2 0%, #2563eb 100%)", icon: "🖼️", label: "Digital Art Print", tag: "EXCLUSIVE", price: "KSh 750", accentColor: "#22d3ee" },
  { gradient: "linear-gradient(135deg, #ca8a04 0%, #ea580c 100%)", icon: "🏷️", label: "OG Streetwear", tag: "BRAND", price: "KSh 2,100", accentColor: "#fbbf24" },
  { gradient: "linear-gradient(135deg, #db2777 0%, #e11d48 100%)", icon: "🎪", label: "Blankets & Wine", tag: "FESTIVAL", price: "KSh 1,500", accentColor: "#f472b6" },
  { gradient: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", icon: "🎵", label: "Afrobeats Mix Vol.7", tag: "DIGITAL", price: "KSh 500", accentColor: "#a78bfa" },
];

const COL3: Card[] = [
  { gradient: "linear-gradient(135deg, #f97316 0%, #eab308 100%)", icon: "🔥", label: "Limited Drop #007", tag: "LIMITED", price: "KSh 4,500", accentColor: "#f97316" },
  { gradient: "linear-gradient(135deg, #0d9488 0%, #16a34a 100%)", icon: "💿", label: "EP: Midnight", tag: "MUSIC", price: "KSh 350", accentColor: "#2dd4bf" },
  { gradient: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", icon: "🎪", label: "Safari Festival", tag: "EVENT", price: "KSh 5,000", accentColor: "#818cf8" },
  { gradient: "linear-gradient(135deg, #e11d48 0%, #db2777 100%)", icon: "🎨", label: "Custom Hoodie", tag: "CUSTOM", price: "KSh 2,800", accentColor: "#fb7185" },
];

function HeroCard({ card }: { card: Card }) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-3 flex-shrink-0 select-none"
      style={{
        width: 164,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
      }}
    >
      {/* Art area */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: 130, background: card.gradient }}
      >
        {/* Noise overlay for texture */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: "180px",
        }} />
        {/* Glow circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full opacity-30 blur-xl" style={{ background: "white" }} />
        </div>
        <span className="relative text-5xl drop-shadow-lg z-10">{card.icon}</span>
        {/* Tag */}
        <span
          className="absolute top-2 left-2 text-xs font-black px-2 py-0.5 rounded-full tracking-wide"
          style={{ background: "rgba(0,0,0,0.55)", color: card.accentColor, fontSize: 9, letterSpacing: "0.06em" }}
        >
          {card.tag}
        </span>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold text-white truncate leading-tight">{card.label}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs font-black" style={{ color: card.accentColor }}>{card.price}</span>
          <span className="text-xs text-gray-600">M-Pesa</span>
        </div>
      </div>
    </div>
  );
}

function Column({
  cards,
  direction,
  duration,
  offset = false,
}: {
  cards: Card[];
  direction: "up" | "down";
  duration: string;
  offset?: boolean;
}) {
  const doubled = [...cards, ...cards];
  return (
    <div
      className="marquee-col overflow-hidden flex-shrink-0"
      style={{
        height: 460,
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
      }}
    >
      <div
        className={direction === "up" ? "marquee-up" : "marquee-down"}
        style={
          {
            "--dur": duration,
            marginTop: offset ? -80 : 0,
          } as React.CSSProperties
        }
      >
        {doubled.map((card, i) => (
          <HeroCard key={i} card={card} />
        ))}
      </div>
    </div>
  );
}

export default function HeroCarousel() {
  return (
    <div className="hidden lg:flex gap-3 items-start justify-center h-[460px] overflow-hidden relative">
      {/* Subtle ambient glow behind columns */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(249,115,22,0.06) 0%, transparent 70%)",
        }}
      />

      <Column cards={COL1} direction="up" duration="24s" />
      <Column cards={COL2} direction="down" duration="30s" offset />
      <Column cards={COL3} direction="up" duration="19s" offset />
    </div>
  );
}
