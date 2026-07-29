"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { vendorApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

type Step = 1 | 2 | 3 | 4;

const VENDOR_TYPES = [
  { icon: "🎨", label: "Artist / Musician", value: "artist", desc: "Sell merch, prints, signed items" },
  { icon: "🎧", label: "DJ", value: "dj", desc: "Sell mixes, merch, USB drives" },
  { icon: "🎭", label: "Creative", value: "creative", desc: "Podcaster, comedian, content creator" },
  { icon: "👕", label: "Jersey Vendor", value: "jersey", desc: "Football jerseys with size variants" },
  { icon: "🏷️", label: "Local Brand", value: "brand", desc: "Clothing, accessories, lifestyle" },
  { icon: "🎟️", label: "Event Organizer", value: "events", desc: "Sell tickets for your events" },
  { icon: "📲", label: "Digital Products", value: "digital", desc: "Beats, presets, e-books, software" },
];

const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi",
  "Kitale", "Garissa", "Kakamega", "Nyeri", "Machakos", "Meru", "Embu",
  "Kericho", "Kisii", "Homabay", "Migori", "Siaya", "Kilifi", "Other",
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const logoRef = useRef<HTMLInputElement>(null);

  const presetType = searchParams.get("type") || "";

  // If a type was chosen at registration, skip to step 2
  const [step, setStep] = useState<Step>(presetType ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [vendorType, setVendorType] = useState(presetType);
  const [store, setStore] = useState({
    brand_name: "",
    store_name: "",
    tagline: "",
    bio: "",
    location: "Nairobi",
    county: "Nairobi",
    instagram_handle: "",
    twitter_handle: "",
    tiktok_handle: "",
  });
  const [payout, setPayout] = useState({
    payout_method: "mpesa",
    payout_account: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  // Sync brand_name from user after Zustand hydrates (avoids SSR mismatch)
  useEffect(() => {
    if (user?.username) {
      setStore((s) => ({ ...s, brand_name: s.brand_name || user.username }));
    }
  }, [user?.username]);

  const totalSteps = presetType ? 3 : 4;
  const displayStep = presetType ? step - 1 : step;
  const progress = ((displayStep - 1) / (totalSteps - 1)) * 100;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("vendor_type", vendorType);
      Object.entries(store).forEach(([k, v]) => fd.append(k, v));
      fd.append("payout_method", payout.payout_method);
      fd.append("payout_account", payout.payout_account);
      if (logoFile) fd.append("logo", logoFile);

      await vendorApi.updateProfile(fd);
      router.push("/dashboard");
    } catch {
      setError("Could not save your store. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-3xl font-black" style={{ color: "var(--primary)" }}>
            Merch<span className="text-white">ke</span>
          </span>
          <h1 className="text-2xl font-bold text-white mt-4">Set up your store</h1>
          <p className="text-gray-500 text-sm mt-1">Step {displayStep} of {totalSteps}</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full mb-8 overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "var(--primary)" }}
          />
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {/* ── Step 1: Vendor type ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">What best describes you?</h2>
              <p className="text-sm text-gray-500 mb-6">This helps buyers find you in the right category.</p>
              <div className="grid grid-cols-1 gap-2">
                {VENDOR_TYPES.map((t) => {
                  const selected = vendorType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setVendorType(t.value)}
                      className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                      style={{
                        background: selected ? "rgba(249,115,22,0.15)" : "var(--surface-2)",
                        border: selected ? "2px solid #f97316" : "2px solid var(--border)",
                        outline: "none",
                      }}
                    >
                      <span className="text-2xl shrink-0">{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-sm"
                          style={{ color: selected ? "#f97316" : "#f3f4f6" }}
                        >
                          {t.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                      </div>
                      {/* Checkmark */}
                      <div
                        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
                        style={{
                          background: selected ? "#f97316" : "transparent",
                          border: selected ? "2px solid #f97316" : "2px solid #3a3a44",
                        }}
                      >
                        {selected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => { if (vendorType) setStep(2); }}
                className="w-full mt-6 py-3.5 rounded-xl font-bold text-white text-sm transition-all"
                style={{
                  background: vendorType ? "#f97316" : "#3a3a44",
                  cursor: vendorType ? "pointer" : "not-allowed",
                  opacity: vendorType ? 1 : 0.6,
                }}
              >
                {vendorType
                  ? `Continue as ${VENDOR_TYPES.find((t) => t.value === vendorType)?.label} →`
                  : "Select a category to continue"}
              </button>
            </div>
          )}

          {/* ── Step 2: Store details ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Store details</h2>
                <p className="text-sm text-gray-500">This is what buyers will see on your storefront.</p>
              </div>

              {/* Logo upload */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Store Logo</label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => logoRef.current?.click()}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:opacity-80"
                    style={{
                      background: logoPreview ? "transparent" : "var(--surface-2)",
                      border: "2px dashed var(--border)",
                    }}
                  >
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl text-gray-600">📷</span>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => logoRef.current?.click()}
                      className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "#d1d5db" }}
                    >
                      Upload Logo
                    </button>
                    <p className="text-xs text-gray-600 mt-1">PNG or JPG, square recommended</p>
                  </div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>
              </div>

              {/* Brand name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Brand / Artist Name *</label>
                <input
                  value={store.brand_name}
                  onChange={(e) => setStore((s) => ({ ...s, brand_name: e.target.value }))}
                  placeholder="e.g. Sauti Sol, DJ Maphorisa KE"
                  className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tagline</label>
                <input
                  value={store.tagline}
                  onChange={(e) => setStore((s) => ({ ...s, tagline: e.target.value }))}
                  placeholder="e.g. Official Sauti Sol merch store"
                  maxLength={120}
                  className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">About your store</label>
                <textarea
                  value={store.bio}
                  onChange={(e) => setStore((s) => ({ ...s, bio: e.target.value }))}
                  placeholder="Tell buyers who you are and what you sell…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none resize-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Town / City</label>
                  <input
                    value={store.location}
                    onChange={(e) => setStore((s) => ({ ...s, location: e.target.value }))}
                    placeholder="Nairobi"
                    className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">County</label>
                  <select
                    value={store.county}
                    onChange={(e) => setStore((s) => ({ ...s, county: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "#d1d5db" }}
                  >
                    {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl text-sm text-gray-400 hover:text-white" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>← Back</button>
                <button onClick={() => setStep(3)} disabled={!store.brand_name} className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40" style={{ background: "var(--primary)" }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Social links ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Social links <span className="text-gray-600 text-base font-normal">(optional)</span></h2>
                <p className="text-sm text-gray-500">Help buyers follow you beyond Merchke.</p>
              </div>

              {[
                { key: "instagram_handle", icon: "📸", label: "Instagram", placeholder: "@yourhandle" },
                { key: "twitter_handle", icon: "🐦", label: "X / Twitter", placeholder: "@yourhandle" },
                { key: "tiktok_handle", icon: "🎵", label: "TikTok", placeholder: "@yourhandle" },
              ].map(({ key, icon, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{icon} {label}</label>
                  <input
                    value={store[key as keyof typeof store]}
                    onChange={(e) => setStore((s) => ({ ...s, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="px-5 py-3 rounded-xl text-sm text-gray-400 hover:text-white" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>← Back</button>
                <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-xl font-bold text-white text-sm" style={{ background: "var(--primary)" }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 4: Payout setup ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Get paid 💰</h2>
                <p className="text-sm text-gray-500">Where do you want to receive your earnings?</p>
              </div>

              {/* Payout method */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: "mpesa", icon: "📱", label: "M-Pesa", sub: "Recommended — instant payouts" },
                  { value: "bank", icon: "🏦", label: "Bank Transfer", sub: "1–3 business days" },
                  { value: "flutterwave", icon: "🌍", label: "Flutterwave", sub: "Cards, mobile money" },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPayout((p) => ({ ...p, payout_method: m.value }))}
                    className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                    style={
                      payout.payout_method === m.value
                        ? { background: "var(--accent-dim)", border: "2px solid var(--accent)" }
                        : { background: "var(--surface-2)", border: "2px solid var(--border)" }
                    }
                  >
                    <span className="text-xl shrink-0">{m.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{m.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.sub}</p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: payout.payout_method === m.value ? "var(--accent)" : "var(--border)" }}
                    >
                      {payout.payout_method === m.value && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--accent)" }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Payout account */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  {payout.payout_method === "mpesa"
                    ? "M-Pesa Phone Number"
                    : payout.payout_method === "bank"
                    ? "Bank Account Number"
                    : "Flutterwave Account Email"}
                </label>
                <input
                  value={payout.payout_account}
                  onChange={(e) => setPayout((p) => ({ ...p, payout_account: e.target.value }))}
                  placeholder={
                    payout.payout_method === "mpesa"
                      ? "0700 000 000"
                      : payout.payout_method === "bank"
                      ? "Account number"
                      : "email@example.com"
                  }
                  className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Payouts are released every 2 weeks after a 7-day holding period. 10% platform commission applies.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(3)} className="px-5 py-3 rounded-xl text-sm text-gray-400 hover:text-white" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>← Back</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !payout.payout_account}
                  className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 glow-green"
                  style={{ background: "var(--accent)" }}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving your store…
                    </span>
                  ) : (
                    "🚀 Launch My Store"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Skip for now */}
        {step < 4 && (
          <button
            onClick={() => router.push("/dashboard")}
            className="block w-full text-center mt-4 text-sm text-gray-600 hover:text-gray-400 transition-colors"
          >
            Skip for now — set up later in dashboard
          </button>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
