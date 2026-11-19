"use client";
import { Suspense } from "react";
import Link from "next/link";
import BannerAd from "@/components/BannerAd";
import { EmptyState, ErrorState, FilterChips, PageHeader, SearchBar, inputClass, inputStyle } from "@/components/ui";
import { jobApi } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { formatDate } from "@/lib/config";
import { JOB_CATEGORIES } from "@/lib/constants";
import { useUrlFilters } from "@/lib/useUrlFilters";
import { useFetch } from "@/lib/useFetch";
import type { Job } from "@/lib/types";


const FILTER_KEYS = ["search", "category", "location", "is_remote"] as const;

function JobsContent() {
  const { user } = useAuthStore();
  const { values, setFilter, apiParams } = useUrlFilters(FILTER_KEYS);
  const { data: jobs, loading, error, reload } = useFetch<Job[]>(() => jobApi.list(apiParams), JSON.stringify(apiParams), [], "Couldn't load jobs right now.");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Creative Jobs 💼"
        subtitle="Gigs and roles in music, media, film, photography and events."
        action={
          <Link
            href={user?.is_vendor ? "/dashboard/jobs/new" : "/register?seller=1&next=/dashboard/jobs/new"}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-white shrink-0"
            style={{ background: "var(--primary)" }}
          >
            + Post a job
          </Link>
        }
      />

      <div className="space-y-4 mb-6">
        <SearchBar value={values.search} onSearch={(q) => setFilter("search", q)} placeholder="Search job title, company…" />
        <FilterChips label="Job category" options={JOB_CATEGORIES} value={values.category} onChange={(v) => setFilter("category", v)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            aria-label="Location"
            defaultValue={values.location}
            onBlur={(e) => setFilter("location", e.target.value.trim())}
            onKeyDown={(e) => { if (e.key === "Enter") setFilter("location", (e.target as HTMLInputElement).value.trim()); }}
            placeholder="Location, e.g. Nairobi"
            className={inputClass}
            style={inputStyle}
          />
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 cursor-pointer" style={inputStyle}>
            <input
              type="checkbox"
              checked={values.is_remote === "true"}
              onChange={(e) => setFilter("is_remote", e.target.checked ? "true" : "")}
              className="accent-orange-500 w-4 h-4"
            />
            Remote only
          </label>
        </div>
      </div>

      <div className="mb-6"><BannerAd page="jobs" /></div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : jobs.length === 0 ? (
        <EmptyState icon="🔍" title="No jobs match your search" body="Try a different category or location — new roles are posted every week." />
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.id}`} className="block p-5 rounded-2xl card-hover" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white">{job.title}</h2>
                    <p className="text-sm text-gray-400">{job.company}</p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0" style={{ background: "var(--primary-dim)", color: "var(--primary)" }}>
                    {job.category_display}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                  <span>📍 {job.location}{job.is_remote ? " · Remote OK" : ""}</span>
                  {job.salary_range && <span>💰 {job.salary_range}</span>}
                  {job.deadline && <span>⏳ Apply by {formatDate(job.deadline)}</span>}
                  <span>Posted {formatDate(job.created_at, { day: "numeric", month: "short" })}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-8"><div className="h-40 skeleton rounded-2xl" /></div>}>
      <JobsContent />
    </Suspense>
  );
}
