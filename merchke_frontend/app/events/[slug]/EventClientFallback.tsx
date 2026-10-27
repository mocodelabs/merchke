"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import EventView from "@/components/EventView";
import { eventApi } from "@/lib/api";
import type { MerchEvent } from "@/lib/types";

/** Used only when the server can't reach the API (relative API URL); fetches in the browser instead. */
export default function EventClientFallback({ slug }: { slug: string }) {
  const [event, setEvent] = useState<MerchEvent | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    eventApi.detail(slug).then((r) => setEvent(r.data)).catch(() => setMissing(true));
  }, [slug]);

  if (missing) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-400 mb-6">This event doesn&apos;t exist or is no longer listed.</p>
        <Link href="/events" className="px-5 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "var(--primary)" }}>Browse events</Link>
      </div>
    );
  }
  if (!event) return <div className="max-w-6xl mx-auto px-4 py-8"><div className="aspect-[21/8] skeleton rounded-2xl" /></div>;
  return <EventView event={event} />;
}
