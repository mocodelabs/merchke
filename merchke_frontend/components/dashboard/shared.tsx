"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useFetch } from "@/lib/useFetch";

/** Load data for a dashboard tab once, with loading/error/reload handled. */
export function useLoad<T>(loader: () => Promise<{ data: T }>, initial: T) {
  return useFetch(loader, "tab", initial, "Couldn't load this section.");
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NewButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0" style={{ background: "var(--primary)" }}>
      {children}
    </Link>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-5 space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
    </div>
  );
}

export function PanelEmpty({ icon, text, action }: { icon: string; text: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-4 text-gray-500">
      <span className="text-4xl block mb-3" aria-hidden>{icon}</span>
      <p className="text-sm">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="p-6 text-center text-sm text-gray-400">
      {message}{" "}
      <button onClick={onRetry} className="font-semibold" style={{ color: "var(--primary)" }}>Retry</button>
    </div>
  );
}

export function Pill({ color, bg, children }: { color: string; bg: string; children: ReactNode }) {
  return <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ color, background: bg }}>{children}</span>;
}

export const FEE_PILL: Record<string, { color: string; bg: string; label: string }> = {
  paid:    { color: "#10b981", bg: "rgba(16,185,129,0.15)", label: "Live" },
  pending: { color: "#fbbf24", bg: "rgba(250,204,21,0.15)", label: "Fee pending" },
  failed:  { color: "#f87171", bg: "rgba(239,68,68,0.15)", label: "Fee not paid" },
  expired: { color: "#f87171", bg: "rgba(239,68,68,0.15)", label: "Fee expired" },
};
