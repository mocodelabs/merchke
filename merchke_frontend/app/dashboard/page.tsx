"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OrdersTab, OverviewTab, PayoutsTab, ProductsTab } from "@/components/dashboard/CommerceTabs";
import { AdsTab, EventsTab, JobsTab, ServicesTab } from "@/components/dashboard/ListingTabs";
import { useAuthStore } from "@/lib/authStore";

const TABS = {
  overview: { title: "Overview", Component: OverviewTab },
  products: { title: "My Products", Component: ProductsTab },
  orders: { title: "Orders", Component: OrdersTab },
  events: { title: "Events", Component: EventsTab },
  services: { title: "Services & Bookings", Component: ServicesTab },
  jobs: { title: "Jobs", Component: JobsTab },
  ads: { title: "Ads", Component: AdsTab },
  payouts: { title: "Payouts", Component: PayoutsTab },
} as const;

type Tab = keyof typeof TABS;

function DashboardContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const param = searchParams.get("tab") ?? "overview";
  const tab: Tab = param in TABS ? (param as Tab) : "overview";
  const { title, Component } = TABS[tab];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user?.username}&apos;s store · <span style={{ color: "var(--accent)" }}>● Active</span>
          </p>
        </div>
        {tab === "overview" && (
          <Link href="/dashboard/products/new" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: "var(--primary)" }}>
            + Add Product
          </Link>
        )}
      </div>
      {/* key forces a fresh load when switching tabs */}
      <Component key={tab} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8"><div className="h-32 skeleton rounded-2xl" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
