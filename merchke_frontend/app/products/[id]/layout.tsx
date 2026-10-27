import type { Metadata } from "next";
import { formatKES, mediaUrl } from "@/lib/config";
import { fetchApi, truncate } from "@/lib/server";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchApi<Product>(`/products/${id}/`);
  if (!product) return { title: "Product | Merchke" };
  const description = truncate(`${formatKES(product.effective_price)} from ${product.vendor_name}. ${product.short_description || product.description}`);
  const image = mediaUrl(product.image);
  return {
    title: `${product.name} by ${product.vendor_name} | Merchke`,
    description,
    openGraph: { title: product.name, description, type: "website", images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title: product.name, description, images: image ? [image] : undefined },
  };
}

export default function Layout({ children }: Props) {
  return children;
}
