"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";

const NAV_ITEMS = [
  { label: "Overview",    icon: "📊", tab: ""        },
  { label: "Products",    icon: "📦", tab: "products" },
  { label: "Orders",      icon: "🧾", tab: "orders"  },
  { label: "Events",      icon: "🎟️", tab: "events"  },
  { label: "Payouts",     icon: "💰", tab: "payouts" },
];

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? "";
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
    onClose?.();
  };

  const isAddProduct = pathname === "/dashboard/add-product";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <Link href="/" className="text-xl font-black" style={{ color: "var(--primary)" }}>
          Merch<span className="text-white">ke</span>
        </Link>
        <p className="text-xs text-gray-600 mt-0.5 font-medium">Vendor Portal</p>
      </div>

      {/* User info */}
      <div className="mx-4 mb-5 p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white uppercase shrink-0"
            style={{ background: "var(--primary)" }}
          >
            {user?.username?.[0] ?? "V"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isOnDash = pathname === "/dashboard";
          const isActive = !isAddProduct && isOnDash && currentTab === item.tab;
          const href = item.tab ? `/dashboard?tab=${item.tab}` : "/dashboard";
          return (
            <Link
              key={item.label}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={
                isActive
                  ? { background: "rgba(139,92,246,0.15)", color: "var(--primary)", borderLeft: "2px solid var(--primary)" }
                  : { color: "#9ca3af" }
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div className="py-2">
          <div className="h-px" style={{ background: "var(--border)" }} />
        </div>

        <Link
          href="/dashboard/add-product"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={
            isAddProduct
              ? { background: "var(--primary)", color: "#fff" }
              : { background: "rgba(139,92,246,0.12)", color: "var(--primary)" }
          }
        >
          <span className="text-base">➕</span>
          Add Product
        </Link>
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-5 pt-3 space-y-0.5" style={{ borderTop: "1px solid var(--border)" }}>
        <Link
          href="/store"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-all hover:bg-white/5"
        >
          <span className="text-base">🛒</span>
          Browse Store
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5"
          style={{ color: "#f87171" }}
        >
          <span className="text-base">🚪</span>
          Log out
        </button>
      </div>
    </div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <Suspense fallback={<div className="h-full" style={{ background: "var(--surface)" }} />}>
      <SidebarNav onClose={onClose} />
    </Suspense>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?next=/dashboard");
    } else if (isAuthenticated && !user?.is_vendor) {
      router.replace("/store");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user?.is_vendor) return null;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto lg:hidden">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 h-14 sticky top-0 z-30"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="text-lg font-black" style={{ color: "var(--primary)" }}>
            Merch<span className="text-white">ke</span>
          </Link>
          <span className="text-xs text-gray-600">Vendor Portal</span>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
