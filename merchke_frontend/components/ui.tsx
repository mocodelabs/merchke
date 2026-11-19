"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-black text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Debounced search input. Calls onSearch ~350ms after typing stops. */
export function SearchBar({
  value, onSearch, placeholder = "Search…",
}: { value: string; onSearch: (q: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);

  useEffect(() => {
    // keep in sync when the URL changes (back button, chip links)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(value);
  }, [value]);

  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onSearch(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text, value, onSearch]);

  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="bg-transparent outline-none flex-1 min-w-0 text-sm text-gray-200 placeholder-gray-600"
      />
      {text && (
        <button onClick={() => { setText(""); onSearch(""); }} className="text-gray-600 hover:text-gray-300 px-1" aria-label="Clear search">
          ✕
        </button>
      )}
    </div>
  );
}

export function FilterChips<T extends string>({
  options, value, onChange, label,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
            style={active
              ? { background: "var(--primary)", color: "#fff" }
              : { background: "var(--surface)", border: "1px solid var(--border)", color: "#9ca3af" }}
          >
            {o.icon && <span className="mr-1" aria-hidden>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-5xl block mb-4" aria-hidden>{icon}</span>
      <p className="font-semibold text-white mb-1">{title}</p>
      {body && <p className="text-sm text-gray-500 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="text-center py-14 px-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <p className="text-sm text-gray-300 mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonGrid({ count = 6, className = "h-72" }: { count?: number; className?: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => <div key={i} className={`skeleton rounded-2xl ${className}`} />)}
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white" style={{ background: "var(--primary)" }}>
      {children}
    </Link>
  );
}

export const inputClass =
  "w-full px-4 py-3 rounded-xl text-gray-200 outline-none placeholder-gray-600 text-sm transition-all focus:ring-1 focus:ring-orange-500";
export const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)" } as const;

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-400 mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
      {message}
    </div>
  );
}
