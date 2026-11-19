"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";

/** Renders children only for logged-in sellers; everyone else is sent to log in. */
export default function VendorGate({ next, children }: { next: string; children: ReactNode }) {
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.replace(`/login?next=${encodeURIComponent(next)}`);
    else if (!user?.is_vendor) router.replace("/register?seller=1");
  }, [hasHydrated, isAuthenticated, user, router, next]);

  if (!isAuthenticated || !user?.is_vendor) return null;
  return <>{children}</>;
}

export function FormShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-400 hover:text-white" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} aria-label="Back to dashboard">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
