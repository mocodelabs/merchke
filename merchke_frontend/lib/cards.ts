import { mediaUrl } from "./config";
import type { Product } from "./types";

/** Map an API product to the props ProductCard expects. */
export function toProductCard(p: Product) {
  const badge = p.is_featured
    ? "Bestseller"
    : p.product_type === "digital"
      ? "Digital"
      : p.sales_count === 0
        ? "New"
        : null;
  return {
    id: p.id,
    name: p.name,
    price: Number(p.effective_price),
    image: mediaUrl(p.image),
    vendor: p.vendor_name,
    vendorSlug: p.vendor_slug,
    rating: p.average_rating,
    reviews: p.reviews_count,
    badge,
  };
}
