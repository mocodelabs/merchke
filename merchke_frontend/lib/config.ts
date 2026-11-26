// Single source for backend URLs. Set NEXT_PUBLIC_API_URL (e.g. https://merchke.onrender.com/api).
// Falls back to the relative "/api", which Netlify proxies to the backend (see netlify.toml).
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

/** Backend origin without the trailing /api — used to resolve /media/... paths. */
export const API_ORIGIN = API_BASE.replace(/\/api$/, "");

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://merchke.netlify.app").replace(/\/$/, "");

/** Turn a media path (or absolute URL) from the API into something <img>/<Image> can load. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Absolute URL for an API path the API returns as relative (e.g. ad click_url). */
export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

/** KSh 1,500 — always Kenyan shillings, never $. */
export function formatKES(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(iso).toLocaleDateString("en-KE", opts);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

/** Pull a human message out of a DRF error response. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const res = (err as { response?: { status?: number; data?: unknown } })?.response;
  const data = res?.data;
  if (res?.status && res.status >= 500) return "The server hit an error. Please try again in a moment.";
  if (!data) return fallback;
  if (typeof data === "string") {
    // Error pages (HTML) and blank bodies are not messages a person can read.
    const text = data.trim();
    return text && !text.startsWith("<") && text.length < 200 ? text : fallback;
  }
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    const first = Object.values(record)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

export const LISTING_FEE_KSH = 130;
export const JOB_FEE_KSH = 500;
