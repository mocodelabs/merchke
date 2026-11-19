"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ErrorState } from "@/components/ui";
import { podcastApi } from "@/lib/api";
import { formatDate, mediaUrl } from "@/lib/config";
import type { Podcast, PodcastEpisode } from "@/lib/types";

/** Spotify / YouTube links become embeddable players; anything else opens in a new tab. */
function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("spotify.com")) {
      const [, kind, id] = u.pathname.split("/");
      if (kind && id) return `https://open.spotify.com/embed/${kind}/${id}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    // not a URL
  }
  return null;
}

export default function PodcastPlayer({ slug }: { slug: string }) {
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<PodcastEpisode | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    podcastApi.detail(slug).then((r) => setPodcast(r.data)).catch(() => setError("This podcast isn't available."));
  }, [slug]);

  useEffect(() => {
    if (playing?.audio_file && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [playing]);

  if (error) return <div className="max-w-3xl mx-auto px-4 py-16"><ErrorState message={error} /></div>;
  if (!podcast) return <div className="max-w-4xl mx-auto px-4 py-8"><div className="h-56 skeleton rounded-2xl" /></div>;

  const episodes = podcast.episodes ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <Link href="/podcasts" className="text-sm text-gray-500 hover:text-white">← All podcasts</Link>
      <header className="flex flex-col sm:flex-row gap-6 mt-4 mb-8">
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
          {podcast.cover_image && <Image src={mediaUrl(podcast.cover_image)} alt={podcast.title} fill priority sizes="192px" className="object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--primary)" }}>{podcast.category_display}</p>
          <h1 className="text-3xl font-black text-white mt-1">{podcast.title}</h1>
          <Link href={`/vendors/${podcast.vendor_slug}`} className="text-sm text-gray-400 hover:text-white">by {podcast.vendor_name}</Link>
          <p className="text-sm text-gray-300 mt-3 whitespace-pre-line">{podcast.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { url: podcast.spotify_url, label: "Spotify", color: "#1db954" },
              { url: podcast.apple_url, label: "Apple Podcasts", color: "#a855f7" },
              { url: podcast.youtube_url, label: "YouTube", color: "#ef4444" },
            ].filter((l) => l.url).map((l) => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: `${l.color}22`, color: l.color }}>
                Listen on {l.label} ↗
              </a>
            ))}
          </div>
        </div>
      </header>

      <h2 className="text-lg font-bold text-white mb-3">Episodes ({episodes.length})</h2>
      {episodes.length === 0 ? (
        <p className="text-sm text-gray-500">No episodes yet.</p>
      ) : (
        <ul className="space-y-3">
          {episodes.map((ep) => {
            const embed = !ep.audio_file && ep.external_url ? embedUrl(ep.external_url) : null;
            const isCurrent = playing?.id === ep.id;
            return (
              <li key={ep.id} className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: `1px solid ${isCurrent ? "var(--primary)" : "var(--border)"}` }}>
                <div className="flex items-start gap-3">
                  {ep.audio_file ? (
                    <button
                      onClick={() => setPlaying(ep)}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: "var(--primary)" }}
                      aria-label={isCurrent ? `Now playing ${ep.title}` : `Play ${ep.title}`}
                    >
                      {isCurrent ? "♪" : "▶"}
                    </button>
                  ) : (
                    <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--surface-2)" }} aria-hidden>🎧</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white">{ep.title}</h3>
                    <p className="text-xs text-gray-500">{formatDate(ep.published_at)}{ep.duration ? ` · ${ep.duration}` : ""}</p>
                    {ep.description && <p className="text-xs text-gray-400 mt-1 line-clamp-3">{ep.description}</p>}
                    {!ep.audio_file && ep.external_url && !embed && (
                      <a href={ep.external_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold mt-2 inline-block" style={{ color: "var(--primary)" }}>
                        Listen ↗
                      </a>
                    )}
                  </div>
                </div>
                {embed && (
                  <iframe
                    src={embed}
                    title={ep.title}
                    loading="lazy"
                    className="w-full mt-3 rounded-xl"
                    style={{ height: embed.includes("youtube") ? 220 : 152, border: 0 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {playing?.audio_file && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3" style={{ background: "rgba(17,17,17,0.97)", borderTop: "1px solid var(--border)" }}>
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 pr-16 sm:pr-20">
            <div className="min-w-0 sm:w-56">
              <p className="text-xs font-bold text-white truncate">{playing.title}</p>
              <p className="text-[11px] text-gray-500 truncate">{podcast.title}</p>
            </div>
            <audio ref={audioRef} src={mediaUrl(playing.audio_file)} controls preload="metadata" className="w-full h-10" />
          </div>
        </div>
      )}
    </div>
  );
}
