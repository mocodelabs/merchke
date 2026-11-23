"use client";
import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TicketQR from "@/components/TicketQR";
import { EmptyState, ErrorState } from "@/components/ui";
import { ticketApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { useFetch } from "@/lib/useFetch";
import type { Ticket } from "@/lib/types";

export default function MyEventTicketsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  const { data: tickets, loading, error, reload } = useFetch<Ticket[]>(
    () => (isAuthenticated ? ticketApi.mine(slug) : Promise.resolve({ data: [] })),
    `${slug}:${isAuthenticated}`, [], "Couldn't load your tickets.",
  );

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace(`/login?next=/events/${slug}/tickets`);
  }, [hasHydrated, isAuthenticated, router, slug]);

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/events/${slug}`} className="text-sm text-gray-500 hover:text-white">← Back to event</Link>
      <h1 className="text-2xl font-black text-white mt-3 mb-1">My tickets</h1>
      <p className="text-sm text-gray-500 mb-6">
        {tickets[0] ? tickets[0].event_title : "Your QR tickets for this event"}
      </p>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[1, 2].map((i) => <div key={i} className="h-96 skeleton rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon="🎟️"
          title="No tickets for this event yet"
          body="If you just paid, give it a few seconds and refresh."
          action={<Link href={`/events/${slug}`} className="text-sm font-semibold" style={{ color: "var(--primary)" }}>Buy tickets →</Link>}
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            {tickets.map((t) => <TicketQR key={t.id} ticket={t} />)}
          </div>
          <p className="text-xs text-gray-600 text-center mt-6">
            Each QR code admits one person and can only be scanned once.
          </p>
        </>
      )}
    </div>
  );
}
