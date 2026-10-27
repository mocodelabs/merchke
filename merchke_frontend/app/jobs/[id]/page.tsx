import type { Metadata } from "next";
import JobDetail from "./JobDetail";
import { fetchApi, truncate } from "@/lib/server";
import type { Job } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await fetchApi<Job>(`/jobs/${id}/`);
  if (!job) return { title: "Job | Merchke" };
  const description = truncate(`${job.company} is hiring in ${job.location}. ${job.description}`);
  return {
    title: `${job.title} at ${job.company} | Merchke Jobs`,
    description,
    openGraph: { title: `${job.title} at ${job.company}`, description, type: "website" },
  };
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  return <JobDetail id={Number(id)} />;
}
