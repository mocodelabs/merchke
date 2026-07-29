"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

const VENDOR_PREFIXES = ["/dashboard", "/onboarding"];

export default function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isVendorRoute = VENDOR_PREFIXES.some((p) => pathname.startsWith(p));

  if (isVendorRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
