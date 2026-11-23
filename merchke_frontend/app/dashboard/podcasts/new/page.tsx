"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import VendorGate, { FormShell } from "@/components/VendorGate";
import { Field, FormError, inputClass, inputStyle } from "@/components/ui";
import { podcastApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/config";
import { PODCAST_CATEGORIES } from "@/lib/constants";
import type { Podcast } from "@/lib/types";

function PodcastForms() {
  const [mine, setMine] = useState<Podcast[]>([]);
  const [selected, setSelected] = useState<number | "new">("new");
  const [loaded, setLoaded] = useState(false);

  const refresh = () =>
    podcastApi.mine().then((r) => {
      setMine(r.data);
      setSelected((s) => (s === "new" && r.data.length ? r.data[0].id : s));
    }).finally(() => setLoaded(true));

  useEffect(() => { refresh(); }, []);

  if (!loaded) return <FormShell title="Podcasts"><div className="h-64 skeleton rounded-2xl" /></FormShell>;

  return (
    <FormShell title="Podcasts" subtitle="Create a show, then add episodes — upload MP3s or link Spotify/YouTube">
      {mine.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
          {mine.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)} className="shrink-0 px-4 py-2 rounded-full text-sm font-medium"
              style={selected === p.id ? { background: "var(--primary)", color: "#fff" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }}>
              {p.title}
            </button>
          ))}
          <button onClick={() => setSelected("new")} className="shrink-0 px-4 py-2 rounded-full text-sm font-medium"
            style={selected === "new" ? { background: "var(--primary)", color: "#fff" } : { background: "var(--surface)", border: "1px dashed var(--border)", color: "#9ca3af" }}>
            + New show
          </button>
        </div>
      )}
      {selected === "new"
        ? <NewShowForm onCreated={(p) => { setMine((m) => [p, ...m]); setSelected(p.id); }} />
        : <NewEpisodeForm podcast={mine.find((p) => p.id === selected)!} onAdded={refresh} />}
    </FormShell>
  );
}

function NewShowForm({ onCreated }: { onCreated: (p: Podcast) => void }) {
  const [form, setForm] = useState({ title: "", description: "", category: "music", spotify_url: "", apple_url: "", youtube_url: "" });
  const [cover, setCover] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !cover) return setError("Title, description and cover art are required.");
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v.trim()); });
    data.append("cover_image", cover);
    setSubmitting(true);
    setError("");
    try {
      const { data: podcast } = await podcastApi.create(data);
      onCreated({ ...podcast, episodes: [] });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-4 items-start">
        <input ref={coverRef} type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} className="hidden" />
        <button type="button" onClick={() => coverRef.current?.click()} className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-xs text-gray-500"
          style={{ border: "2px dashed var(--border)", background: "var(--surface-2)" }} aria-label="Upload cover art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover ? <img src={URL.createObjectURL(cover)} alt="" className="w-full h-full object-cover" /> : "Cover art *"}
        </button>
        <div className="flex-1 space-y-4">
          <Field label="Show title *" htmlFor="pc-title">
            <input id="pc-title" value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Category" htmlFor="pc-cat">
            <select id="pc-cat" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass} style={inputStyle}>
              {PODCAST_CATEGORIES.filter((c) => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <Field label="About the show *" htmlFor="pc-desc">
        <textarea id="pc-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={`${inputClass} resize-none`} style={inputStyle} />
      </Field>
      <div className="grid sm:grid-cols-3 gap-3">
        {(["spotify_url", "apple_url", "youtube_url"] as const).map((k) => (
          <Field key={k} label={k === "spotify_url" ? "Spotify" : k === "apple_url" ? "Apple Podcasts" : "YouTube"} htmlFor={`pc-${k}`}>
            <input id={`pc-${k}`} type="url" value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder="https://" className={inputClass} style={inputStyle} />
          </Field>
        ))}
      </div>
      <FormError message={error} />
      <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
        {submitting ? "Creating…" : "Create show"}
      </button>
    </form>
  );
}

function NewEpisodeForm({ podcast, onAdded }: { podcast: Podcast; onAdded: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", external_url: "", duration: "" });
  const [audio, setAudio] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk("");
    if (!form.title.trim()) return setError("Give the episode a title.");
    if (!audio && !form.external_url.trim()) return setError("Upload an MP3 or paste a Spotify/YouTube link.");
    if (audio && audio.size > 100 * 1024 * 1024) return setError("Audio must be under 100 MB.");
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v.trim()); });
    if (audio) data.append("audio_file", audio);
    setSubmitting(true);
    setError("");
    try {
      await podcastApi.addEpisode(podcast.id, data);
      setOk(`"${form.title}" is live.`);
      setForm({ title: "", description: "", external_url: "", duration: "" });
      setAudio(null);
      onAdded();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white">New episode for {podcast.title}</h2>
        <Link href={`/podcasts/${podcast.slug}`} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>View show →</Link>
      </div>
      <Field label="Episode title *" htmlFor="ep-title">
        <input id="ep-title" value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} style={inputStyle} />
      </Field>
      <Field label="Show notes" htmlFor="ep-desc">
        <textarea id="ep-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={`${inputClass} resize-none`} style={inputStyle} />
      </Field>
      <div>
        <span className="block text-xs font-semibold text-gray-400 mb-2">Audio (MP3, M4A, WAV · max 100 MB)</span>
        <input type="file" accept=".mp3,.m4a,.aac,.wav,.ogg,audio/*" onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
          aria-label="Upload audio" className="block w-full text-sm text-gray-400 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-white file:bg-orange-500" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Field label="…or Spotify / YouTube link" htmlFor="ep-url">
            <input id="ep-url" type="url" value={form.external_url} onChange={(e) => set("external_url", e.target.value)} placeholder="https://open.spotify.com/episode/…" className={inputClass} style={inputStyle} />
          </Field>
        </div>
        <Field label="Duration" htmlFor="ep-dur">
          <input id="ep-dur" value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="45:30" className={inputClass} style={inputStyle} />
        </Field>
      </div>
      <FormError message={error} />
      {ok && <p role="status" className="text-sm" style={{ color: "var(--accent)" }}>✓ {ok}</p>}
      <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
        {submitting ? "Uploading…" : "Publish episode"}
      </button>
      <p className="text-xs text-gray-600">{podcast.episodes?.length ?? podcast.episodes_count} episode(s) published so far.</p>
    </form>
  );
}

export default function PodcastsDashboardPage() {
  return <VendorGate next="/dashboard/podcasts/new"><PodcastForms /></VendorGate>;
}
