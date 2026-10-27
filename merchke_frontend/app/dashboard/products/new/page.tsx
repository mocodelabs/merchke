"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MpesaPaymentModal from "@/components/MpesaPaymentModal";
import { productApi, variantApi, vendorApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { LISTING_FEE_KSH, apiErrorMessage } from "@/lib/config";

type Category = { id: number; name: string; slug: string; icon: string };

type Variant = {
  id: string;
  size: string; color: string; custom_label: string;
  price_modifier: string; stock: string; sku: string;
};

const DIGITAL_TYPES = [
  { value: "book",  icon: "📖", label: "Book / PDF",  accept: ".pdf,.epub,.mobi",                      formats: "PDF, EPUB, MOBI" },
  { value: "audio", icon: "🎵", label: "Audio",        accept: ".mp3,.wav,.flac,.aac,.m4a,.ogg",        formats: "MP3, WAV, FLAC, AAC" },
  { value: "video", icon: "🎬", label: "Video",        accept: ".mp4,.mov,.mkv,.m4v,.avi",              formats: "MP4, MOV, MKV" },
  { value: "bundle",icon: "📦", label: "Bundle / ZIP", accept: ".zip,.rar,.7z",                         formats: "ZIP, RAR" },
] as const;

type DigitalType = typeof DIGITAL_TYPES[number]["value"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PRODUCT_TYPES = [
  { value: "physical", label: "Physical Product", icon: "📦", desc: "T-shirts, caps, jerseys, etc." },
  { value: "digital", label: "Digital Download", icon: "📲", desc: "Beats, presets, e-books, etc." },
];

export default function NewProductPage() {
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    product_type: "physical",
    category: "",
    price: "",
    sale_price: "",
    stock: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);

  // Digital file upload
  const [digitalType, setDigitalType] = useState<DigitalType>("audio");
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [downloadLimit, setDownloadLimit] = useState("");
  const digitalFileRef = useRef<HTMLInputElement>(null);

  // Listing fee (KSh 130 via M-Pesa) — the product goes live once paid
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [created, setCreated] = useState<{ id: number; phone: string } | null>(null);

  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), size: "", color: "", custom_label: "", price_modifier: "0", stock: "", sku: "" },
    ]);

  const removeVariant = (id: string) => setVariants((prev) => prev.filter((v) => v.id !== id));

  const setVariantField = (id: string, key: keyof Omit<Variant, "id">, value: string) =>
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [key]: value } : v)));

  useEffect(() => {
    if (hasHydrated && (!isAuthenticated || !user?.is_vendor)) {
      router.replace("/login?next=/dashboard/products/new");
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || !user?.is_vendor) return;
    vendorApi.getProfile()
      .then((r) => setMpesaPhone((p) => p || r.data.mpesa_phone || r.data.phone_number || ""))
      .catch(() => {});
  }, [isAuthenticated, user]);

  // Re-fetch categories whenever product type changes
  useEffect(() => {
    if (!isAuthenticated || !user?.is_vendor) return;
    productApi.categories(form.product_type)
      .then((res) => setCategories(res.data))
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_type, isAuthenticated]);

  if (!isAuthenticated || !user?.is_vendor) return null;

  const set = (k: string, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) { setError("Product name is required"); return; }
    if (!form.description.trim()) { setError("Description is required"); return; }
    if (!form.price || Number(form.price) <= 0) { setError("Price must be greater than 0"); return; }
    if (form.product_type !== "digital" && (!form.stock || Number(form.stock) < 0)) {
      setError("Stock quantity is required for physical products"); return;
    }
    if (form.product_type === "digital" && !digitalFile) {
      setError("Please upload your digital file"); return;
    }
    if (!imageFile) { setError("Please upload a product image"); return; }
    if (mpesaPhone.replace(/\D/g, "").length < 9) { setError(`Enter the M-Pesa number to pay the KSh ${LISTING_FEE_KSH} listing fee`); return; }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("name", form.name.trim());
      data.append("description", form.description.trim());
      data.append("short_description", form.short_description.trim());
      data.append("product_type", form.product_type);
      data.append("price", form.price);
      if (form.sale_price) data.append("sale_price", form.sale_price);
      data.append("stock", form.product_type === "digital" ? "0" : form.stock);
      if (form.category) data.append("category", form.category);
      data.append("mpesa_phone", mpesaPhone);
      data.append("image", imageFile);
      if (form.product_type === "digital" && digitalFile) {
        data.append("digital_file", digitalFile);
        if (downloadLimit) data.append("download_limit", downloadLimit);
      }

      const productRes = await productApi.create(data);
      const productId: number = productRes.data.id;

      if (hasVariants && variants.length > 0) {
        await Promise.allSettled(
          variants.map((v) =>
            variantApi.create(productId, {
              size: v.size || undefined,
              color: v.color || undefined,
              custom_label: v.custom_label || undefined,
              price_modifier: v.price_modifier ? Number(v.price_modifier) : 0,
              stock: v.stock ? Number(v.stock) : 0,
              sku: v.sku || undefined,
            })
          )
        );
      }

      setCreated({ id: productId, phone: productRes.data.listing_fee.phone || mpesaPhone });
    } catch (err: unknown) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-gray-200 outline-none placeholder-gray-600 text-sm transition-all focus:ring-1 focus:ring-orange-500";
  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)" };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">Add New Product</h1>
          <p className="text-xs text-gray-500 mt-0.5">Step {step} of 3</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: s <= step ? "var(--primary)" : "var(--border)" }}
          />
        ))}
      </div>

      {/* ── Step 1: Basic Info ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-white">Basic Information</h2>

          {/* Product type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Product Type</label>
            <div className="grid grid-cols-2 gap-3">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((prev) => ({ ...prev, product_type: t.value, category: "" }))}
                  className="p-3 rounded-xl text-left transition-all"
                  style={
                    form.product_type === t.value
                      ? { background: "var(--primary-dim)", border: "2px solid var(--primary)" }
                      : { background: "var(--surface-2)", border: "2px solid var(--border)" }
                  }
                >
                  <span className="text-xl block mb-1">{t.icon}</span>
                  <span className="text-xs font-semibold text-white block">{t.label}</span>
                  <span className="text-xs text-gray-500 block mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selling event tickets? <Link href="/dashboard/events/new" className="font-semibold" style={{ color: "var(--primary)" }}>Create an event</Link> instead — you get QR tickets and gate check-in.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Product Name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Classic Logo Tee"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Short Description</label>
            <input
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              placeholder="One-liner shown in listings (max 300 chars)"
              maxLength={300}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Full Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe your product in detail — materials, sizing, what's included…"
              rows={5}
              className={`${inputClass} resize-none`}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={`${inputClass} cursor-pointer appearance-none`}
              style={inputStyle}
            >
              <option value="">Select a category (optional)</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (!form.name.trim() || !form.description.trim()) {
                setError("Name and description are required");
                return;
              }
              setError("");
              setStep(2);
            }}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all"
            style={{ background: "var(--primary)" }}
          >
            Next: Pricing & Stock →
          </button>
        </div>
      )}

      {/* ── Step 2: Pricing & Stock ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-white">Pricing &amp; Inventory</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Price (KSh) *</label>
              <input
                type="number"
                min="1"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="e.g. 1500"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Sale Price (KSh)</label>
              <input
                type="number"
                min="1"
                value={form.sale_price}
                onChange={(e) => set("sale_price", e.target.value)}
                placeholder="Optional discount"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {form.sale_price && form.price && Number(form.sale_price) >= Number(form.price) && (
            <p className="text-xs text-red-400">Sale price must be less than the original price</p>
          )}

          {form.product_type !== "digital" && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Stock Quantity *</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
                placeholder="Number of units available"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          )}

          {form.product_type === "digital" && (
            <div className="space-y-4 p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <p className="text-sm font-bold text-white">Digital File Upload</p>

              {/* Content type selector */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Content Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {DIGITAL_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setDigitalType(t.value); setDigitalFile(null); if (digitalFileRef.current) digitalFileRef.current.value = ""; }}
                      className="p-2.5 rounded-xl text-center transition-all"
                      style={digitalType === t.value
                        ? { background: "rgba(99,102,241,0.25)", border: "2px solid #818cf8" }
                        : { background: "var(--surface-2)", border: "2px solid var(--border)" }
                      }
                    >
                      <span className="text-xl block mb-1">{t.icon}</span>
                      <span className="text-xs font-semibold text-white block leading-tight">{t.label}</span>
                      <span className="text-xs text-gray-500 block mt-0.5" style={{ fontSize: 10 }}>{t.formats}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File drop zone */}
              <div>
                <input
                  ref={digitalFileRef}
                  type="file"
                  accept={DIGITAL_TYPES.find(t => t.value === digitalType)?.accept}
                  onChange={(e) => setDigitalFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => digitalFileRef.current?.click()}
                  className="w-full rounded-xl transition-all"
                  style={{
                    border: `2px dashed ${digitalFile ? "#818cf8" : "var(--border)"}`,
                    background: digitalFile ? "rgba(99,102,241,0.08)" : "var(--surface-2)",
                    padding: digitalFile ? "14px 16px" : "28px 16px",
                  }}
                >
                  {digitalFile ? (
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-2xl">{DIGITAL_TYPES.find(t => t.value === digitalType)?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{digitalFile.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatBytes(digitalFile.size)}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                        Ready
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <span className="text-3xl">{DIGITAL_TYPES.find(t => t.value === digitalType)?.icon}</span>
                      <p className="text-sm font-semibold text-white">Click to upload file</p>
                      <p className="text-xs">{DIGITAL_TYPES.find(t => t.value === digitalType)?.formats}</p>
                    </div>
                  )}
                </button>
                {digitalFile && (
                  <button
                    type="button"
                    onClick={() => { setDigitalFile(null); if (digitalFileRef.current) digitalFileRef.current.value = ""; }}
                    className="text-xs text-gray-500 hover:text-red-400 mt-1.5 transition-colors"
                  >
                    ✕ Remove file
                  </button>
                )}
              </div>

              {/* Download limit */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Download Limit per Purchase
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDownloadLimit("")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={!downloadLimit
                      ? { background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid #818cf8" }
                      : { background: "var(--surface-2)", color: "#9ca3af", border: "1px solid var(--border)" }
                    }
                  >
                    Unlimited
                  </button>
                  <button
                    type="button"
                    onClick={() => setDownloadLimit(downloadLimit || "3")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={downloadLimit
                      ? { background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid #818cf8" }
                      : { background: "var(--surface-2)", color: "#9ca3af", border: "1px solid var(--border)" }
                    }
                  >
                    Limited
                  </button>
                  {downloadLimit && (
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={downloadLimit}
                      onChange={(e) => setDownloadLimit(e.target.value)}
                      className="w-16 px-2 py-1.5 rounded-lg text-sm text-white text-center outline-none"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    />
                  )}
                  <span className="text-xs text-gray-500">
                    {downloadLimit ? `${downloadLimit} download${Number(downloadLimit) !== 1 ? "s" : ""} per buyer` : "No limit"}
                  </span>
                </div>
              </div>
            </div>
          )}


          {/* ── Variants ──────────────────────────────────────────────────── */}
          {form.product_type === "physical" && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <button
                onClick={() => { setHasVariants((v) => !v); if (!hasVariants && variants.length === 0) addVariant(); }}
                className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-white/5"
                style={{ background: "var(--surface-2)" }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">Add Product Variants</p>
                  <p className="text-xs text-gray-500 mt-0.5">Different sizes, colours, or options</p>
                </div>
                <div className="flex items-center gap-2">
                  {hasVariants && variants.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: "var(--primary)" }}>
                      {variants.length}
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${hasVariants ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {hasVariants && (
                <div className="p-4 space-y-3" style={{ background: "var(--surface)" }}>
                  {variants.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl space-y-3"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-400">Variant</p>
                        <button onClick={() => removeVariant(v.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={v.size}
                          onChange={(e) => setVariantField(v.id, "size", e.target.value)}
                          placeholder="Size (S, M, L, XL…)"
                          className={inputClass}
                          style={{ ...inputStyle, fontSize: "0.75rem" }}
                        />
                        <input
                          value={v.color}
                          onChange={(e) => setVariantField(v.id, "color", e.target.value)}
                          placeholder="Colour (Black, Red…)"
                          className={inputClass}
                          style={{ ...inputStyle, fontSize: "0.75rem" }}
                        />
                      </div>
                      <input
                        value={v.custom_label}
                        onChange={(e) => setVariantField(v.id, "custom_label", e.target.value)}
                        placeholder="Custom label (optional, e.g. 'Limited Edition')"
                        className={inputClass}
                        style={{ ...inputStyle, fontSize: "0.75rem" }}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">+/- Price (KSh)</label>
                          <input
                            type="number"
                            value={v.price_modifier}
                            onChange={(e) => setVariantField(v.id, "price_modifier", e.target.value)}
                            placeholder="0"
                            className={inputClass}
                            style={{ ...inputStyle, fontSize: "0.75rem" }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Stock *</label>
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => setVariantField(v.id, "stock", e.target.value)}
                            placeholder="0"
                            className={inputClass}
                            style={{ ...inputStyle, fontSize: "0.75rem" }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">SKU</label>
                          <input
                            value={v.sku}
                            onChange={(e) => setVariantField(v.id, "sku", e.target.value)}
                            placeholder="Optional"
                            className={inputClass}
                            style={{ ...inputStyle, fontSize: "0.75rem" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addVariant}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                    style={{ border: "1px dashed var(--border)" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Another Variant
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl font-semibold text-gray-300 transition-all" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              ← Back
            </button>
            <button
              onClick={() => {
                if (!form.price || Number(form.price) <= 0) { setError("Price is required"); return; }
                if (form.sale_price && Number(form.sale_price) >= Number(form.price)) { setError("Sale price must be less than price"); return; }
                if (form.product_type !== "digital" && !form.stock) { setError("Stock is required"); return; }
                if (form.product_type === "digital" && !digitalFile) { setError("Please upload your digital file"); return; }
                setError("");
                setStep(3);
              }}
              className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all"
              style={{ background: "var(--primary)" }}
            >
              Next: Add Image →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Image ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-white">Product Image</h2>

          {/* Upload zone */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl transition-all overflow-hidden"
            style={{
              background: "var(--surface-2)",
              border: `2px dashed ${imagePreview ? "var(--primary)" : "var(--border)"}`,
              minHeight: "200px",
            }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-72" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
                <span className="text-5xl">🖼️</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Click to upload image</p>
                  <p className="text-xs mt-1">JPG, PNG, WebP · Max 5MB · Minimum 500×500px</p>
                </div>
              </div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="hidden"
          />

          {imagePreview && (
            <button
              onClick={() => { setImagePreview(null); setImageFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              ✕ Remove image
            </button>
          )}

          {/* Summary card */}
          <div
            className="p-4 rounded-xl text-sm space-y-1.5"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <p className="font-semibold text-white mb-2">Review</p>
            <div className="flex justify-between text-gray-400">
              <span>Name</span><span className="text-white">{form.name}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Type</span>
              <span className="text-white capitalize">{form.product_type}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Price</span>
              <span className="text-white">
                KSh {Number(form.price).toLocaleString()}
                {form.sale_price ? ` → KSh ${Number(form.sale_price).toLocaleString()}` : ""}
              </span>
            </div>
            {form.product_type !== "digital" && (
              <div className="flex justify-between text-gray-400">
                <span>Stock</span><span className="text-white">{form.stock} units</span>
              </div>
            )}
            {hasVariants && variants.length > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Variants</span>
                <span className="text-white">{variants.length} added</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--primary-dim)", border: "1px solid rgba(249,115,22,0.3)" }}>
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden>📱</span>
              <div>
                <p className="text-sm font-semibold text-white">KSh {LISTING_FEE_KSH} listing fee</p>
                <p className="text-xs text-gray-400 mt-0.5">We&apos;ll send an M-Pesa prompt to this number. Your listing goes live as soon as it&apos;s paid.</p>
              </div>
            </div>
            <input
              type="tel"
              inputMode="tel"
              aria-label="M-Pesa number for the listing fee"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="0712 345 678"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl font-semibold text-gray-300 transition-all" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !imageFile}
              className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--primary)" }}
            >
              {submitting ? "Creating listing…" : `Pay KSh ${LISTING_FEE_KSH} & Publish 🚀`}
            </button>
          </div>
        </div>
      )}

      <MpesaPaymentModal
        open={created !== null}
        phone={created?.phone ?? mpesaPhone}
        amount={LISTING_FEE_KSH}
        title="Pay listing fee"
        description={<>Listing: <strong className="text-gray-300">{form.name}</strong></>}
        timeoutSeconds={600}
        check={async () => {
          if (!created) return { status: "pending" };
          const { data } = await productApi.listingFeeStatus(created.id);
          if (data.status === "paid") return { status: "paid" };
          if (data.status === "failed" || data.status === "expired") return { status: data.status, error: data.error };
          return { status: "pending" };
        }}
        onRetry={async () => {
          if (!created) return;
          await productApi.retryListingFee(created.id, mpesaPhone);
        }}
        onClose={() => router.push("/dashboard?tab=products")}
        paidTitle="Your listing is live! 🚀"
        paidBody={`"${form.name}" is now visible in the store.`}
        paidActions={
          <>
            {created && (
              <Link href={`/products/${created.id}`} className="w-full py-3.5 rounded-xl font-bold text-white text-center" style={{ background: "var(--primary)" }}>
                View listing
              </Link>
            )}
            <Link href="/dashboard?tab=products" className="w-full py-3 rounded-xl font-semibold text-sm text-gray-300 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              Back to my products
            </Link>
          </>
        }
      />

      {/* Error */}
      {error && (
        <div
          className="mt-4 p-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
