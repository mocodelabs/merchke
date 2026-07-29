"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { useAuthStore } from "@/lib/authStore";

export default function Navbar() {
  const { count } = useCart();
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setAvatarOpen(false);
    router.push("/");
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = (e.currentTarget.value || "").trim();
      if (q) {
        setSearchOpen(false);
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
    }
  };

  return (
    <header
      className="sticky top-0 z-50 glass border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            className="text-2xl font-black tracking-tight"
            style={{ color: "var(--primary)" }}
          >
            Merch<span style={{ color: "var(--foreground)" }}>ke</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {[
            { href: "/store", label: "Shop" },
            { href: "/events", label: "Events" },
            { href: "/vendors", label: "Vendors" },
            { href: "/digital", label: "Digital" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Search bar - desktop */}
        <div className="hidden md:flex flex-1 max-w-xs">
          <div
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Search merch, artists, events..."
              className="bg-transparent outline-none w-full text-gray-300 placeholder-gray-600 text-sm"
              onKeyDown={handleSearch}
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Cart */}
          <Link href="/cart" className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {count > 0 && (
              <span
                className="absolute -top-1 -right-1 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "var(--primary)" }}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>

          {/* Auth */}
          {isAuthenticated && user ? (
            <div ref={avatarRef} className="relative hidden md:block">
              <button
                onClick={() => setAvatarOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all hover:bg-white/5"
                style={{ border: "1px solid var(--border)" }}
              >
                {/* Avatar circle */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase"
                  style={{ background: "var(--primary)" }}
                >
                  {user.username[0]}
                </div>
                <span className="text-sm text-gray-300 max-w-[90px] truncate">{user.username}</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {avatarOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl py-1 shadow-xl z-50"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <span
                      className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={user.is_vendor
                        ? { background: "rgba(139,92,246,0.2)", color: "var(--primary)" }
                        : { background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                    >
                      {user.is_vendor ? "Vendor" : "Buyer"}
                    </span>
                  </div>

                  {/* Vendor-specific top item */}
                  {user.is_vendor && (
                    <Link
                      href="/dashboard"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                      style={{ color: "var(--primary)" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Vendor Dashboard
                    </Link>
                  )}

                  <Link
                    href="/orders"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    My Orders
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    Wishlist
                  </Link>

                  {/* Become a Seller CTA for buyers */}
                  {!user.is_vendor && (
                    <>
                      <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />
                      <Link
                        href="/register?seller=1"
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
                        style={{ color: "#a78bfa" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Become a Seller
                      </Link>
                    </>
                  )}

                  <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    style={{ color: "#f87171" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden md:block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: "var(--primary)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start Selling
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              placeholder="Search merch, artists, events..."
              className="bg-transparent outline-none w-full text-gray-300 placeholder-gray-600 text-sm"
              onKeyDown={handleSearch}
            />
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-4 py-4 flex flex-col gap-1"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {[
            { href: "/store", label: "Shop All" },
            { href: "/events", label: "Events & Tickets" },
            { href: "/vendors", label: "Browse Vendors" },
            { href: "/digital", label: "Digital Downloads" },
            { href: "/how-it-works", label: "How It Works" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 font-medium"
            >
              {label}
            </Link>
          ))}
          <div className="border-t my-2" style={{ borderColor: "var(--border)" }} />
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shrink-0"
                  style={{ background: "var(--primary)" }}
                >
                  {user.username[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.username}</p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={user.is_vendor
                      ? { background: "rgba(139,92,246,0.2)", color: "var(--primary)" }
                      : { background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                  >
                    {user.is_vendor ? "Vendor" : "Buyer"}
                  </span>
                </div>
              </div>
              {user.is_vendor && (
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 rounded-lg font-semibold hover:bg-white/5"
                  style={{ color: "var(--primary)" }}
                >
                  Vendor Dashboard
                </Link>
              )}
              <Link href="/orders" onClick={() => setMenuOpen(false)} className="px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 font-medium">
                My Orders
              </Link>
              <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 font-medium">
                Wishlist
              </Link>
              {!user.is_vendor && (
                <Link
                  href="/register?seller=1"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 rounded-lg font-medium hover:bg-white/5"
                  style={{ color: "#a78bfa" }}
                >
                  Become a Seller →
                </Link>
              )}
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="px-3 py-3 rounded-lg font-medium text-left hover:bg-white/5"
                style={{ color: "#f87171" }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 font-medium"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 rounded-lg font-semibold text-white text-center"
                style={{ background: "var(--primary)" }}
              >
                Start Selling
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
