import type { Metadata } from "next";
import { mediaUrl } from "@/lib/config";
import { fetchApi, truncate } from "@/lib/server";

type Vendor = { brand_name: string; tagline: string | null; bio: string | null; logo: string | null; banner: string | null; location: string };
type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await fetchApi<Vendor>(`/vendors/${slug}/`);
  if (!vendor) return { title: "Store | Merchke" };
  const description = truncate(vendor.tagline || vendor.bio || `Shop ${vendor.brand_name} on Merchke${vendor.location ? ` — ${vendor.location}` : ""}.`);
  const image = mediaUrl(vendor.banner || vendor.logo);
  return {
    title: `${vendor.brand_name} — Official Store | Merchke`,
    description,
    openGraph: { title: vendor.brand_name, description, type: "website", images: image ? [{ url: image }] : undefined },
  };
}

export default function Layout({ children }: Props) {
  return children;
}
