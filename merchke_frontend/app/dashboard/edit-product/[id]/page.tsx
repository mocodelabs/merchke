"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { productApi, variantApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

type Category = { id: number; name: string; slug: string; icon: string };

type ExistingVariant = {
  id: number;
  size: string; color: string; custom_label: string;
  price_modifier: string; stock: number; sku: string;
};

type NewVariant = {
  _key: string;
  size: string; color: string; custom_label: string;
  price_modifier: string; stock: string; sku: string;
};

const PRODUCT_TYPES = [
  { value: "physical", label: "Physical", icon: "📦" },
  { value: "digital", label: "Digital", icon: "📲" },
  { value: "ticket", label: "Ticket", icon: "🎟️" },
];

const DIGITAL_TYPES = [
  { value: "book",   icon: "📖", label: "Book / PDF",  accept: ".pdf,.epub,.mobi",           formats: "PDF, EPUB" },
  { value: "audio",  icon: "🎵", label: "Audio",        accept: ".mp3,.wav,.flac,.aac,.m4a",  formats: "MP3, WAV, FLAC" },
  { value: "video",  icon: "🎬", label: "Video",        accept: ".mp4,.mov,.mkv,.m4v",        formats: "MP4, MOV, MKV" },
  { value: "bundle", icon: "📦", label: "Bundle",       accept: ".zip,.rar,.7z",              formats: "ZIP, RAR" },
] as const;

type DigitalType = typeof DIGITAL_TYPES[number]["value"];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const inputClass = "w-full px-4 py-3 rounded-xl text-gray-200 outline-none placeholder-gray-600 text-sm transition-all focus:ring-1 focus:ring-orange-500";
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)" };

export default function EditProductPage() {
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const productId = Number(params.id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Digital file state
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [digitalType, setDigitalType] = useState<DigitalType>("audio");
  const [downloadLimit, setDownloadLimit] = useState("");
  const digitalFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    product_type: "physical",
    category: "",
    price: "",
    sale_price: "",
    stock: "",
    is_active: true,
  });

  // Existing variants (from server)
  const [existingVariants, setExistingVariants] = useState<ExistingVariant[]>([]);
  const [deletingVariantId, setDeletingVariantId] = useState<number | null>(null);
  // Stock typed for existing variants, saved with the rest of the form
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});

  // New variants to add
  const [newVariants, setNewVariants] = useState<NewVariant[]>([]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !user?.is_vendor) {
      router.replace("/login?next=/dashboard");
      return;
    }
    productApi.getOwn(productId)
      .then((prodRes) => {
        const p = prodRes.data;
        const pType = p.product_type ?? "physical";
        setForm({
          name: p.name ?? "",
          short_description: p.short_description ?? "",
          description: p.description ?? "",
          product_type: pType,
          category: p.category ? String(p.category) : "",
          price: p.price ? String(p.price) : "",
          sale_price: p.sale_price ? String(p.sale_price) : "",
          stock: p.stock != null ? String(p.stock) : "",
          is_active: p.is_active ?? true,
        });
        setExistingImageUrl(p.image || null);
        setExistingFileName(p.digital_file_name || null);
        if (p.download_limit) setDownloadLimit(String(p.download_limit));
        setExistingVariants(
          (p.variants ?? []).map((v: Record<string, unknown>) => ({
            id: v.id as number,
            size: (v.size as string) ?? "",
            color: (v.color as string) ?? "",
            custom_label: (v.custom_label as string) ?? "",
            price_modifier: v.price_modifier != null ? String(v.price_modifier) : "0",
            stock: (v.stock as number) ?? 0,
            sku: (v.sku as string) ?? "",
          }))
        );
        // Load categories for the product's type
        return productApi.categories(pType);
      })
      .then((catRes) => setCategories(catRes.data))
      .catch(() => setError("Failed to load product. It may not exist or belong to you."))
      .finally(() => setLoading(false));
  }, [hasHydrated, isAuthenticated, user, productId, router]);

  // Re-fetch categories if vendor switches product type while editing
  useEffect(() => {
    if (loading) return; // don't re-fetch during initial load
    productApi.categories(form.product_type)
      .then((res) => setCategories(res.data))
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_type]);

  if (!isAuthenticated || !user?.is_vendor) return null;

  const set = (k: string, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDeleteVariant = async (variantId: number) => {
    setDeletingVariantId(variantId);
    try {
      await variantApi.delete(productId, variantId);
      setExistingVariants((prev) => prev.filter((v) => v.id !== variantId));
    } catch {
      setError("Failed to delete variant. Please try again.");
    } finally {
      setDeletingVariantId(null);
    }
  };

  const addNewVariant = () =>
    setNewVariants((prev) => [
      ...prev,
      { _key: Math.random().toString(36).slice(2), size: "", color: "", custom_label: "", price_modifier: "0", stock: "", sku: "" },
    ]);

  const removeNewVariant = (key: string) =>
    setNewVariants((prev) => prev.filter((v) => v._key !== key));

  const setNewVariantField = (key: string, field: keyof Omit<NewVariant, "_key">, value: string) =>
    setNewVariants((prev) => prev.map((v) => v._key === key ? { ...v, [field]: value } : v));

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) { setError("Product name is required"); return; }
    if (!form.description.trim()) { setError("Description is required"); return; }
    if (!form.price || Number(form.price) <= 0) { setError("Price must be greater than 0"); return; }
    if (form.product_type !== "digital" && (!form.stock || Number(form.stock) < 0)) {
      setError("Stock quantity is required for physical products"); return;
    }
    if (form.sale_price && Number(form.sale_price) >= Number(form.price)) {
      setError("Sale price must be less than the original price"); return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("name", form.name.trim());
      data.append("description", form.description.trim());
      data.append("short_description", form.short_description.trim());
      data.append("product_type", form.product_type);
      data.append("price", form.price);
      if (form.sale_price) data.append("sale_price", form.sale_price);
      else data.append("sale_price", "");
      data.append("stock", form.product_type === "digital" ? "0" : form.stock);
      if (form.category) data.append("category", form.category);
      data.append("is_active", form.is_active ? "true" : "false");
      if (imageFile) data.append("image", imageFile);
      if (form.product_type === "digital") {
        if (digitalFile) data.append("digital_file", digitalFile);
        data.append("download_limit", downloadLimit || "");
      }

      await productApi.update(productId, data);

      // Save restocked existing variants
      const restocked = existingVariants.filter(
        (v) => stockEdits[v.id] !== undefined && stockEdits[v.id] !== "" && Number(stockEdits[v.id]) !== v.stock
      );
      await Promise.all(
        restocked.map((v) => variantApi.update(productId, v.id, { stock: Math.max(0, Number(stockEdits[v.id])) }))
      );

      // Add any new variants
      if (newVariants.length > 0) {
        await Promise.allSettled(
          newVariants.map((v) =>
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

      setSuccess(true);
      setTimeout(() => router.push("/dashboard?tab=products"), 1200);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } };
      const msgs = axiosErr.response?.data;
      if (msgs) {
        const first = Object.values(msgs)[0];
        setError(Array.isArray(first) ? first[0] : String(first));
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-40 skeleton rounded-2xl" />
        <div className="h-40 skeleton rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/dashboard?tab=products"
          className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">Edit Product</h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{form.name || "Loading…"}</p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div
          className="mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}
        >
          ✓ Product updated — redirecting to products list…
        </div>
      )}

      <div className="space-y-6">
        {/* ── Product Type ─────────────────────────────────────────────── */}
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-bold text-white">Product Type</h2>
          <div className="grid grid-cols-3 gap-3">
            {PRODUCT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setForm((prev) => ({ ...prev, product_type: t.value, category: "" }))}
                className="p-3 rounded-xl text-center transition-all"
                style={
                  form.product_type === t.value
                    ? { background: "var(--primary-dim)", border: "2px solid var(--primary)" }
                    : { background: "var(--surface-2)", border: "2px solid var(--border)" }
                }
              >
                <span className="text-xl block mb-1">{t.icon}</span>
                <span className="text-xs font-semibold text-white">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Basic Info ───────────────────────────────────────────────── */}
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-bold text-white">Basic Information</h2>

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
              placeholder="One-liner shown in listings"
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
              placeholder="Describe your product in detail…"
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
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Pricing & Stock ──────────────────────────────────────────── */}
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-bold text-white">Pricing &amp; Inventory</h2>

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
                placeholder="Optional"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

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

          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="accent-orange-500 w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300 cursor-pointer">
              <span className="font-semibold text-white">Published</span>
              <span className="block text-xs text-gray-500 mt-0.5">Uncheck to make this a draft</span>
            </label>
          </div>
        </div>

        {/* ── Digital File ──────────────────────────────────────────────── */}
        {form.product_type === "digital" && (
          <div className="p-5 rounded-2xl space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Digital File</h2>
              {existingFileName && !digitalFile && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
                  File on record
                </span>
              )}
            </div>

            {/* Show existing file */}
            {existingFileName && !digitalFile && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <span className="text-xl">📁</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{existingFileName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Current file — upload a new one to replace it</p>
                </div>
              </div>
            )}

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

            {/* Upload zone */}
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
                  padding: digitalFile ? "14px 16px" : "24px 16px",
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
                      {existingFileName ? "Replacing" : "New"}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <span className="text-3xl">{DIGITAL_TYPES.find(t => t.value === digitalType)?.icon}</span>
                    <p className="text-sm font-semibold text-white">
                      {existingFileName ? "Upload to replace existing file" : "Click to upload file"}
                    </p>
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
                  ✕ Cancel replacement
                </button>
              )}
            </div>

            {/* Download limit */}
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Download Limit per Purchase</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDownloadLimit("")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={!downloadLimit ? { background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid #818cf8" } : { background: "var(--surface-2)", color: "#9ca3af", border: "1px solid var(--border)" }}
                >Unlimited</button>
                <button type="button" onClick={() => setDownloadLimit(downloadLimit || "3")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={downloadLimit ? { background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid #818cf8" } : { background: "var(--surface-2)", color: "#9ca3af", border: "1px solid var(--border)" }}
                >Limited</button>
                {downloadLimit && (
                  <input type="number" min="1" max="99" value={downloadLimit}
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

        {/* ── Product Image ────────────────────────────────────────────── */}
        <div
          className="p-5 rounded-2xl space-y-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-bold text-white">Product Image</h2>

          {/* Current / new image */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl overflow-hidden transition-all"
            style={{
              background: "var(--surface-2)",
              border: `2px dashed ${imagePreview || existingImageUrl ? "var(--primary)" : "var(--border)"}`,
              minHeight: "160px",
            }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="New image" className="w-full object-cover max-h-64" />
            ) : existingImageUrl ? (
              <div className="relative">
                <img src={existingImageUrl} alt="Current image" className="w-full object-cover max-h-64" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <span className="text-white text-sm font-semibold">Click to replace</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
                <span className="text-4xl">🖼️</span>
                <p className="text-sm font-semibold text-white">Click to upload image</p>
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />

          {imagePreview && (
            <button
              onClick={() => {
                setImagePreview(null);
                setImageFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              ✕ Remove new image (keep existing)
            </button>
          )}
        </div>

        {/* ── Variants ─────────────────────────────────────────────────── */}
        {form.product_type === "physical" && (
          <div
            className="p-5 rounded-2xl space-y-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Variants ({existingVariants.length + newVariants.length})</h2>
              <button
                onClick={addNewVariant}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
              >
                + Add Variant
              </button>
            </div>

            {/* Existing variants */}
            {existingVariants.map((v) => (
              <div
                key={v.id}
                className="p-3 rounded-xl"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400">
                    {[v.size, v.color, v.custom_label].filter(Boolean).join(" · ") || `Variant #${v.id}`}
                  </p>
                  <button
                    onClick={() => handleDeleteVariant(v.id)}
                    disabled={deletingVariantId === v.id}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingVariantId === v.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 items-center">
                  <label className="flex items-center gap-1.5">
                    Stock:
                    <input
                      type="number"
                      min="0"
                      value={stockEdits[v.id] ?? String(v.stock)}
                      onChange={(e) => setStockEdits((prev) => ({ ...prev, [v.id]: e.target.value }))}
                      className="w-16 px-2 py-1 rounded-lg bg-transparent text-white outline-none"
                      style={{ border: `1px solid ${v.stock === 0 && stockEdits[v.id] === undefined ? "#f87171" : "var(--border)"}` }}
                      aria-label={`Stock for ${[v.size, v.color, v.custom_label].filter(Boolean).join(" ") || "variant"}`}
                    />
                  </label>
                  <span>+/- Price: <span className="text-white">KSh {v.price_modifier}</span></span>
                  {v.sku && <span>SKU: <span className="text-white">{v.sku}</span></span>}
                </div>
              </div>
            ))}

            {/* New variants */}
            {newVariants.map((v) => (
              <div
                key={v._key}
                className="p-3 rounded-xl space-y-3"
                style={{ background: "var(--surface-2)", border: "1px solid rgba(139,92,246,0.3)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>New Variant</p>
                  <button onClick={() => removeNewVariant(v._key)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={v.size} onChange={(e) => setNewVariantField(v._key, "size", e.target.value)}
                    placeholder="Sizes, e.g. S, M, L" className={inputClass} style={{ ...inputStyle, fontSize: "0.75rem" }} />
                  <input value={v.color} onChange={(e) => setNewVariantField(v._key, "color", e.target.value)}
                    placeholder="Colours, e.g. Black, Red" className={inputClass} style={{ ...inputStyle, fontSize: "0.75rem" }} />
                </div>
                <input value={v.custom_label} onChange={(e) => setNewVariantField(v._key, "custom_label", e.target.value)}
                  placeholder="Custom label (optional)" className={inputClass} style={{ ...inputStyle, fontSize: "0.75rem" }} />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">+/- Price</label>
                    <input type="number" value={v.price_modifier} onChange={(e) => setNewVariantField(v._key, "price_modifier", e.target.value)}
                      placeholder="0" className={inputClass} style={{ ...inputStyle, fontSize: "0.75rem" }} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Stock (each) *</label>
                    <input type="number" min="0" value={v.stock} onChange={(e) => setNewVariantField(v._key, "stock", e.target.value)}
                      placeholder="0" className={inputClass} style={{ ...inputStyle, fontSize: "0.75rem" }} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">SKU</label>
                    <input value={v.sku} onChange={(e) => setNewVariantField(v._key, "sku", e.target.value)}
                      placeholder="Optional" className={inputClass} style={{ ...inputStyle, fontSize: "0.75rem" }} />
                  </div>
                </div>
              </div>
            ))}

            {existingVariants.length === 0 && newVariants.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-3">No variants — click Add Variant to create size/colour options</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="p-3 rounded-xl text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <Link
            href="/dashboard?tab=products"
            className="flex-1 py-3.5 rounded-xl font-semibold text-gray-300 text-center transition-all"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting || success}
            className="flex-2 flex-1 py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--primary)", minWidth: "60%" }}
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
