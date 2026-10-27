"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useAuthStore } from "@/lib/authStore";
import api, { reviewApi, productApi, reportApi } from "@/lib/api";
import { mediaUrl } from "@/lib/config";

type ProductImage = { id: number; image: string; alt_text: string; is_primary: boolean };
type ProductVariant = {
  id: number; size: string; color: string; custom_label: string;
  price_modifier: number; stock: number;
};
type Review = {
  id: number; username: string; rating: number; title: string;
  body: string; is_verified_purchase: boolean; created_at: string;
};
type ApiProduct = {
  id: number; name: string; description: string;
  price: number; sale_price: number | null;
  effective_price: number; discount_percent: number;
  image: string; images: ProductImage[]; variants: ProductVariant[];
  vendor_name: string; vendor_slug: string; category_name: string;
  product_type: string; average_rating: number; reviews_count: number;
  in_stock: boolean; is_featured: boolean; sales_count: number;
  has_digital_file: boolean; download_limit: number | null;
};


function StarRow({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={size} fill={s <= Math.round(rating) ? "#f97316" : "none"} stroke="#f97316" strokeWidth={1.5} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { addItem } = useCart();
  const { isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/products/${id}/`),
      reviewApi.listProduct(id),
    ])
      .then(([prodRes, revRes]) => {
        setProduct(prodRes.data);
        setReviews(revRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton />;
  if (!product) {
    return (
      <div className="text-center py-20 text-gray-500">
        <span className="text-4xl block mb-3">😕</span>
        <p>Product not found.</p>
        <Link href="/store" className="mt-4 inline-block text-sm" style={{ color: "var(--primary)" }}>
          Back to shop →
        </Link>
      </div>
    );
  }

  const allImages = product.images.length > 0
    ? product.images.map((img) => img.image)
    : [product.image];

  const sizes = [...new Set(product.variants.filter((v) => v.size).map((v) => v.size))];
  const colors = [...new Set(product.variants.filter((v) => v.color).map((v) => v.color))];
  const hasCustomLabels = product.variants.length > 0 && !sizes.length && !colors.length;

  const effectivePrice = selectedVariant
    ? Number(product.effective_price) + Number(selectedVariant.price_modifier)
    : Number(product.effective_price);

  const handleAdd = () => {
    if (product.variants.length > 0 && !selectedVariant) {
      alert("Please select a variant");
      return;
    }
    addItem({
      id: product.id,
      variantId: selectedVariant?.id ?? null,
      name: product.name,
      price: effectivePrice,
      image: mediaUrl(allImages[0]),
      vendor: product.vendor_name,
      variant: selectedVariant
        ? [selectedVariant.size, selectedVariant.color, selectedVariant.custom_label]
            .filter(Boolean)
            .join(" / ")
        : undefined,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleDownload = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/products/${id}`);
      return;
    }
    setDownloading(true);
    setDownloadError("");
    try {
      const res = await productApi.download(product.id);
      const blob = new Blob([res.data]);
      const disposition = res.headers["content-disposition"] ?? "";
      const match = disposition.match(/filename[^;=\n]*=\s*["']?([^"'\n]+)/i);
      const filename = match?.[1] ?? `${product.name}-download`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const e = err as { response?: { data?: Blob; status?: number } };
      if (e.response?.status === 403) {
        setDownloadError("Purchase required — add to cart and complete checkout first.");
      } else {
        setDownloadError("Download failed. Please try again.");
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason) { setReportError("Please select a reason."); return; }
    try {
      await reportApi.reportProduct(id, { reason: reportReason, description: reportDesc });
      setReportSubmitted(true);
    } catch { setReportError("Failed to submit. Please try again."); }
  };

  const ratingDist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return { star, pct: reviews.length ? Math.round((count / reviews.length) * 100) : 0 };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-600 mb-8">
        <Link href="/" className="hover:text-white">Home</Link>
        <span>/</span>
        <Link href="/store" className="hover:text-white">Shop</Link>
        <span>/</span>
        <span className="text-gray-400">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Image gallery */}
        <div className="space-y-3">
          <div
            className="aspect-square rounded-2xl flex items-center justify-center text-8xl relative overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {allImages[activeImg] ? (
              <img
                src={mediaUrl(allImages[activeImg])}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>🛍️</span>
            )}
            {product.discount_percent > 0 && (
              <span
                className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(16,185,129,0.9)", color: "#fff" }}
              >
                -{product.discount_percent}% OFF
              </span>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="w-16 h-16 shrink-0 rounded-xl flex items-center justify-center text-2xl transition-all overflow-hidden"
                  style={{
                    background: "var(--surface)",
                    border: `2px solid ${activeImg === i ? "var(--primary)" : "var(--border)"}`,
                  }}
                >
                  {img ? (
                    <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                  ) : "🛍️"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <Link
              href={`/vendors/${product.vendor_slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium hover:text-white transition-colors"
              style={{ color: "var(--primary)" }}
            >
              <span>🏪</span> {product.vendor_name}
            </Link>
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                🛡️ Protected
              </span>
              <button
                onClick={() => { setShowReportModal(true); setReportSubmitted(false); setReportError(""); setReportReason(""); setReportDesc(""); }}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                title="Report this listing"
              >
                ⚑ Report
              </button>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-3">{product.name}</h1>

          <div className="flex items-center gap-2 mb-5">
            <StarRow rating={product.average_rating} />
            <span className="text-sm text-gray-400">
              {product.average_rating > 0 ? product.average_rating : "No ratings"} · {product.reviews_count} reviews
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-black text-white">
              KSh {effectivePrice.toLocaleString()}
            </span>
            {product.discount_percent > 0 && (
              <>
                <span className="text-xl text-gray-500 line-through">
                  KSh {Number(product.price).toLocaleString()}
                </span>
                <span
                  className="text-sm font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                >
                  -{product.discount_percent}%
                </span>
              </>
            )}
          </div>

          {/* Size selector */}
          {sizes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Size{selectedVariant?.size ? `: ${selectedVariant.size}` : ""}
              </h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const v = product.variants.find((v) => v.size === size);
                  const active = selectedVariant?.size === size;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedVariant(active ? null : v ?? null)}
                      className="w-12 h-12 rounded-xl text-sm font-semibold transition-all"
                      style={
                        active
                          ? { background: "var(--primary)", color: "#fff", border: "2px solid var(--primary)" }
                          : { background: "var(--surface)", border: "2px solid var(--border)", color: "#9ca3af" }
                      }
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color selector */}
          {colors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Color{selectedVariant?.color ? `: ${selectedVariant.color}` : ""}
              </h3>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const v = product.variants.find((v) => v.color === color);
                  const active = selectedVariant?.color === color;
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedVariant(active ? null : v ?? null)}
                      className="px-4 h-10 rounded-xl text-sm font-semibold transition-all"
                      style={
                        active
                          ? { background: "var(--primary)", color: "#fff", border: "2px solid var(--primary)" }
                          : { background: "var(--surface)", border: "2px solid var(--border)", color: "#9ca3af" }
                      }
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom label variants (e.g. Home Kit / Away Kit) */}
          {hasCustomLabels && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Option</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const active = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(active ? null : v)}
                      className="px-4 h-10 rounded-xl text-sm font-semibold transition-all"
                      style={
                        active
                          ? { background: "var(--primary)", color: "#fff", border: "2px solid var(--primary)" }
                          : { background: "var(--surface)", border: "2px solid var(--border)", color: "#9ca3af" }
                      }
                    >
                      {v.custom_label || `Option ${v.id}`}
                      {v.price_modifier > 0 && (
                        <span className="ml-1 text-xs opacity-70">+KSh {Number(v.price_modifier).toLocaleString()}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Quantity</h3>
            <div
              className="inline-flex items-center rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center text-xl text-gray-400 hover:text-white hover:bg-white/5"
              >
                −
              </button>
              <span className="w-12 text-center font-bold text-white">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-10 h-10 flex items-center justify-center text-xl text-gray-400 hover:text-white hover:bg-white/5"
              >
                +
              </button>
            </div>
          </div>

          {/* CTAs */}
          {product.product_type === "digital" ? (
            <div className="mb-6 space-y-3">
              {/* Digital: Buy → then Download */}
              <div className="flex gap-3">
                <button
                  onClick={handleAdd}
                  className="flex-1 py-4 rounded-xl font-bold text-white transition-all text-center"
                  style={{ background: added ? "var(--accent)" : "var(--primary)" }}
                >
                  {added ? "✓ Added to Cart" : "Add to Cart"}
                </button>
                <Link
                  href="/checkout"
                  className="flex-1 py-4 rounded-xl font-bold text-center transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                >
                  Buy Now
                </Link>
              </div>

              {/* Download button — always visible, gated at API level */}
              {product.has_digital_file && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", color: "#818cf8" }}
                >
                  {downloading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Downloading…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download {!isAuthenticated ? "(login required)" : ""}
                    </>
                  )}
                </button>
              )}
              {downloadError && (
                <p className="text-xs text-red-400 text-center">{downloadError}</p>
              )}
              {product.download_limit && (
                <p className="text-xs text-center text-gray-600">
                  {product.download_limit} download{product.download_limit !== 1 ? "s" : ""} per purchase
                </p>
              )}
            </div>
          ) : (
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleAdd}
                disabled={!product.in_stock}
                className="flex-1 py-4 rounded-xl font-bold text-white transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: added ? "var(--accent)" : "var(--primary)" }}
              >
                {!product.in_stock ? "Out of Stock" : added ? "✓ Added to Cart" : "Add to Cart"}
              </button>
              <Link
                href="/checkout"
                className="flex-1 py-4 rounded-xl font-bold text-center transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                Buy Now
              </Link>
            </div>
          )}

          {/* M-Pesa badge / digital delivery info */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-6 text-sm"
            style={{ background: "var(--accent-dim)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <span className="text-xl">{product.product_type === "digital" ? "⚡" : "📱"}</span>
            <div>
              <p className="font-semibold text-white">
                {product.product_type === "digital" ? "Instant Digital Delivery" : "Pay with M-Pesa"}
              </p>
              <p className="text-xs text-gray-400">
                {product.product_type === "digital"
                  ? "Download immediately after payment via M-Pesa"
                  : "STK Push to your phone at checkout"}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">About this product</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{product.description}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.category_name && (
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{ background: "var(--surface)", color: "#6b7280", border: "1px solid var(--border)" }}
              >
                {product.category_name}
              </span>
            )}
            <span
              className="text-xs px-3 py-1 rounded-full capitalize"
              style={{ background: "var(--surface)", color: "#6b7280", border: "1px solid var(--border)" }}
            >
              {product.product_type === "digital" ? "Digital Download" : product.product_type === "ticket" ? "Event Ticket" : "Physical Product"}
            </span>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 pt-10" style={{ borderTop: "1px solid var(--border)" }}>
        <h2 className="text-xl font-bold text-white mb-6">
          Customer Reviews ({product.reviews_count})
        </h2>

        <div
          className="flex items-center gap-6 p-5 rounded-2xl mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="text-center">
            <div className="text-5xl font-black text-white">
              {product.average_rating > 0 ? product.average_rating : "—"}
            </div>
            <div className="flex justify-center mt-1">
              <StarRow rating={product.average_rating} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{product.reviews_count} reviews</p>
          </div>
          <div className="flex-1 space-y-2">
            {ratingDist.map(({ star, pct }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-4">{star}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: "var(--primary)" }}
                  />
                </div>
                <span className="text-gray-600 w-6 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-gray-600 text-sm py-4">
            No reviews yet — be the first to leave one!
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 rounded-xl mb-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
                  >
                    {review.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-white">{review.username}</span>
                  {review.is_verified_purchase && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                    >
                      Verified
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(review.created_at).toLocaleDateString("en-KE", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </span>
              </div>
              <div className="mb-2">
                <StarRow rating={review.rating} size="w-3.5 h-3.5" />
              </div>
              {review.title && (
                <p className="text-sm font-semibold text-white mb-1">{review.title}</p>
              )}
              <p className="text-sm text-gray-400">{review.body}</p>
            </div>
          ))
        )}
      </section>

      {/* Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Report this listing</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            {reportSubmitted ? (
              <div className="text-center py-6">
                <span className="text-4xl block mb-3">✅</span>
                <p className="font-semibold text-white mb-1">Report received</p>
                <p className="text-sm text-gray-400">Our team will review this listing within 24 hours. Thank you for keeping Merchke safe.</p>
                <button onClick={() => setShowReportModal(false)} className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>Close</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: reportReason ? "#e5e7eb" : "#4b5563" }}
                  >
                    <option value="">Select a reason…</option>
                    <option value="counterfeit">Counterfeit / fake product</option>
                    <option value="scam">Suspected scam or fraud</option>
                    <option value="wrong_category">Listed in wrong category</option>
                    <option value="inappropriate">Inappropriate content</option>
                    <option value="not_delivered">Vendor not fulfilling orders</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Additional details (optional)</label>
                  <textarea
                    rows={3}
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Describe the issue…"
                    className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none text-gray-200 placeholder-gray-600 resize-none"
                    style={{ border: "1px solid var(--border)" }}
                  />
                </div>
                {reportError && <p className="text-xs text-red-400">{reportError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setShowReportModal(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ border: "1px solid var(--border)", color: "#9ca3af" }}>Cancel</button>
                  <button onClick={handleReport} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "#dc2626" }}>Submit Report</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-48 rounded skeleton mb-8" />
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="aspect-square rounded-2xl skeleton" />
        <div className="space-y-4 pt-2">
          <div className="h-4 w-28 skeleton rounded" />
          <div className="h-9 w-3/4 skeleton rounded" />
          <div className="h-4 w-40 skeleton rounded" />
          <div className="h-12 w-1/3 skeleton rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-12 h-12 skeleton rounded-xl" />
            ))}
          </div>
          <div className="h-14 skeleton rounded-xl" />
          <div className="h-14 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}

