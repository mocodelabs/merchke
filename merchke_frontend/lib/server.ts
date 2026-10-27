/**
 * Server-side API fetch for Server Components and generateMetadata.
 * Needs an absolute API URL (NEXT_PUBLIC_API_URL, or API_URL_INTERNAL for a private network address).
 * Returns null on any failure so pages can render a graceful fallback.
 */
const SERVER_API = (process.env.API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export async function fetchApi<T>(path: string, revalidate = 120): Promise<T | null> {
  if (!/^https?:\/\//.test(SERVER_API)) return null;
  try {
    const res = await fetch(`${SERVER_API}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchList<T>(path: string, revalidate = 120): Promise<T[]> {
  const data = await fetchApi<T[] | { results: T[] }>(path, revalidate);
  if (!data) return [];
  return Array.isArray(data) ? data : data.results ?? [];
}

export function truncate(text: string, max = 155) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
