"use client";
import { useState, type ReactNode } from "react";

/**
 * <img> for uploaded media that degrades gracefully. If the file is missing or fails to load
 * (e.g. an upload lost from the server's disk), it shows `fallback` instead of the browser's
 * broken-image icon with the alt text spilling across the layout.
 */
export default function MediaImage({
  src,
  alt = "",
  className = "w-full h-full object-cover",
  fallback = <span aria-hidden>🛍️</span>,
  fallbackClassName = "w-full h-full flex items-center justify-center",
  loading = "lazy",
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
  fallbackClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return fallback === null ? null : (
      <div className={fallbackClassName} role={alt ? "img" : undefined} aria-label={alt || undefined}>
        {fallback}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading={loading} className={className} onError={() => setFailedSrc(src)} />
  );
}
