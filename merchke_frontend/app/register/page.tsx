"use client";
import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

type AccountType = "buyer" | "seller";

const FIELD_KEYS = new Set(["username", "email", "password", "password2", "vendor_type"]);

const SELLER_TYPES = [
  { icon: "🎨", label: "Artist / Musician", value: "artist", desc: "Merch, prints, signed items" },
  { icon: "🎧", label: "DJ", value: "dj", desc: "Mixes, merch, USB drives" },
  { icon: "🎭", label: "Creative", value: "creative", desc: "Podcaster, comedian, content creator" },
  { icon: "👕", label: "Jersey Vendor", value: "jersey", desc: "Football jerseys & kits" },
  { icon: "🏷️", label: "Local Brand", value: "brand", desc: "Clothing, accessories, lifestyle" },
  { icon: "🎟️", label: "Event Organizer", value: "events", desc: "Sell tickets for your events" },
  { icon: "📲", label: "Digital Products", value: "digital", desc: "Beats, presets, e-books" },
  { icon: "💄", label: "Makeup Artist", value: "makeup", desc: "Products, bookings, tutorials" },
  { icon: "🖋️", label: "Tattoo Artist", value: "tattoo", desc: "Flash art prints, booking deposits" },
  { icon: "🏍️", label: "Biker / Moto Culture", value: "biker", desc: "Gear, accessories, ride tickets" },
];

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </>
      )}
    </svg>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const nextPath = searchParams.get("next") || "";
  const presetSeller = searchParams.get("seller") === "1";
  const presetType = searchParams.get("type") || "";

  const [accountType, setAccountType] = useState<AccountType>(presetSeller || presetType ? "seller" : "buyer");
  const [vendorType, setVendorType] = useState(SELLER_TYPES.some((t) => t.value === presetType) ? presetType : "");
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ username: "", email: "", password: "", password2: "" });
  const setField = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const borderFor = (field: string): React.CSSProperties => ({
    background: "var(--surface-2)",
    border: `1px solid ${errors[field] ? "#f87171" : "var(--border)"}`,
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.username.trim()) errs.username = "Username is required";
    else if (form.username.length < 3) errs.username = "At least 3 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = "Letters, numbers and underscores only";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "At least 8 characters";
    if (form.password !== form.password2) errs.password2 = "Passwords don't match";
    if (accountType === "seller" && !vendorType) errs.vendor_type = "Choose your seller category";
    if (!agreed) errs.terms = "You must accept the Terms of Service";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return Object.keys(errs).length === 0;
  };

  const mapApiErrors = (data: Record<string, unknown>) => {
    const mapped: Record<string, string> = {};
    const formMessages: string[] = [];
    Object.entries(data).forEach(([k, v]) => {
      const msg = Array.isArray(v) ? v[0] : String(v);
      if (FIELD_KEYS.has(k)) {
        mapped[k] = msg;
      } else {
        // non_field_errors, detail, or any unknown key → top-level banner
        formMessages.push(msg);
      }
    });
    if (formMessages.length) mapped.form = formMessages.join(" ");
    return mapped;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    // Step 1: Register
    try {
      await authApi.register({
        ...form,
        is_vendor: accountType === "seller",
        is_customer: accountType === "buyer",
        ...(accountType === "seller" && vendorType ? { vendor_type: vendorType } : {}),
      });
    } catch (err: unknown) {
      const raw = (err as { response?: { data?: unknown } })?.response?.data;
      // Only treat it as structured errors if it's a plain object (not HTML string)
      const isJsonErrors = raw && typeof raw === "object" && !Array.isArray(raw);
      setErrors(isJsonErrors ? mapApiErrors(raw as Record<string, unknown>) : { form: "Registration failed. Please check your details and try again." });
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setLoading(false);
      return;
    }

    // Step 2: Auto-login
    try {
      const loginRes = await authApi.login({ email: form.email, password: form.password });
      const { token, user_id, username, email, is_vendor, is_customer } = loginRes.data;
      setAuth({ id: user_id, username, email: email || form.email, is_vendor, is_customer }, token);
      router.push(is_vendor ? `/onboarding${vendorType ? `?type=${vendorType}` : ""}` : (nextPath.startsWith("/") ? nextPath : "/store"));
    } catch {
      // Account was created — just redirect to login
      router.push(`/login?next=${encodeURIComponent(nextPath || (accountType === "seller" ? "/onboarding" : "/store"))}`);
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = Math.min(4, Math.floor(form.password.length / 2));
  const pwColors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/">
            <span className="text-3xl font-black" style={{ color: "var(--primary)" }}>
              Merch<span className="text-white">ke</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Create your account</h1>
          <p className="text-gray-500 mt-1 text-sm">Join Kenya&apos;s creative marketplace</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div ref={topRef} />
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Global / server error */}
            {errors.form && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.form}
              </div>
            )}

            {/* Account type toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">I want to…</label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                {(["buyer", "seller"] as AccountType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setAccountType(t); setErrors({}); setVendorType(""); }}
                    className="py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={accountType === t ? { background: "var(--primary)", color: "#fff" } : { color: "#6b7280" }}
                  >
                    {t === "buyer" ? "🛍️ Shop & Buy" : "🚀 Sell on Merchke"}
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
              <input
                value={form.username}
                onChange={(e) => setField("username", e.target.value)}
                placeholder="e.g. sautisol_official"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                style={borderFor("username")}
              />
              {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                style={borderFor("email")}
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                  style={borderFor("password")}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {form.password && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="flex-1 h-1 rounded-full transition-all"
                      style={{ background: n <= pwStrength ? pwColors[pwStrength - 1] : "var(--border)" }} />
                  ))}
                </div>
              )}
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showPw2 ? "text" : "password"}
                  value={form.password2}
                  onChange={(e) => setField("password2", e.target.value)}
                  placeholder="Same password again"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                  style={borderFor("password2")}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPw2((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <EyeIcon open={showPw2} />
                </button>
              </div>
              {form.password2 && form.password !== form.password2 && (
                <p className="text-xs text-red-400 mt-1">Passwords don&apos;t match</p>
              )}
              {form.password2 && form.password === form.password2 && form.password.length >= 8 && (
                <p className="text-xs mt-1" style={{ color: "#22c55e" }}>✓ Passwords match</p>
              )}
              {errors.password2 && <p className="text-xs text-red-400 mt-1">{errors.password2}</p>}
            </div>

            {/* Seller category — inline, only for sellers */}
            {accountType === "seller" && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  What do you sell? <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {SELLER_TYPES.map((t) => {
                    const sel = vendorType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => { setVendorType(t.value); setErrors((e) => ({ ...e, vendor_type: "" })); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: sel ? "rgba(249,115,22,0.12)" : "var(--surface-2)",
                          border: `1.5px solid ${errors.vendor_type && !sel ? "#f87171" : sel ? "#f97316" : "var(--border)"}`,
                        }}
                      >
                        <span className="text-lg shrink-0">{t.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: sel ? "#f97316" : "#f3f4f6" }}>{t.label}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{t.desc}</p>
                        </div>
                        <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                          style={{ background: sel ? "#f97316" : "transparent", border: sel ? "2px solid #f97316" : "2px solid var(--border)" }}>
                          {sel && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.vendor_type && <p className="text-xs text-red-400 mt-1">{errors.vendor_type}</p>}
              </div>
            )}

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => { setAgreed(e.target.checked); setErrors((er) => ({ ...er, terms: "" })); }}
                className="mt-0.5 accent-orange-500 shrink-0 w-4 h-4"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                I agree to Merchke&apos;s{" "}
                <Link href="/terms" className="underline hover:text-white">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>
              </span>
            </label>
            {errors.terms && <p className="text-xs text-red-400 -mt-3">{errors.terms}</p>}

            {/* Error summary near the button — shows the actual messages so the user sees them regardless of scroll */}
            {Array.from(FIELD_KEYS).some((k) => errors[k]) && (
              <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {Array.from(FIELD_KEYS).filter((k) => errors[k]).map((k) => (
                  <p key={k} className="flex items-start gap-1.5">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{errors[k]}</span>
                  </p>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: "var(--primary)" }}
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading
                ? "Creating account…"
                : accountType === "seller"
                  ? "Create Store Account 🚀"
                  : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="font-semibold hover:text-white transition-colors"
            style={{ color: "var(--primary)" }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
