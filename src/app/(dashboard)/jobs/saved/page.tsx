"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface SavedJobData {
  id: string;
  fitScore: number | null;
  hireProbability: number | null;
  notes: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    description: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    jobType: string | null;
    remoteType: string | null;
    url: string | null;
  };
}

export default function SavedJobsPage() {
  const router = useRouter();
  const [savedJobs, setSavedJobs] = useState<SavedJobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  async function fetchSavedJobs() {
    try {
      const res = await fetch("/api/jobs/saved");
      const data = await res.json();
      if (res.ok) {
        setSavedJobs(data.savedJobs || []);
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsave(savedJobId: string, jobId: string) {
    try {
      await fetch(`/api/jobs/${jobId}/save`, { method: "DELETE" });
      setSavedJobs((prev) => prev.filter((s) => s.id !== savedJobId));
    } catch {
      // Retry
    }
  }

  async function handleTrack(jobId: string) {
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok || res.status === 409) {
        router.push(`/applications/${data.application?.id}`);
      }
    } catch {
      // Retry
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (savedJobs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Saved Jobs</h1>
        <EmptyState
          title="No saved jobs yet"
          description="Jobs you save from search results will appear here. Save jobs you're interested in to compare and apply later."
          actionLabel="Search Jobs"
          actionHref="/jobs"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">Saved Jobs ({savedJobs.length})</h1>
        <Link href="/jobs" className="btn-secondary text-sm">
          Search More
        </Link>
      </div>

      <div className="space-y-3">
        {savedJobs.map((saved) => {
          const job = saved.job;
          const isExpanded = expanded.has(saved.id);
          const scoreColor = saved.fitScore
            ? saved.fitScore >= 70
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : saved.fitScore >= 40
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            : null;

          return (
            <div key={saved.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => toggleExpand(saved.id)}
                      className="font-semibold text-left hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                    >
                      {job.title}
                    </button>
                    {scoreColor && saved.fitScore && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${scoreColor}`}>
                        Fit: {saved.fitScore}
                      </span>
                    )}
                    {saved.hireProbability && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        Hire: {saved.hireProbability}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{job.company}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {job.location && <span>{job.location}</span>}
                    {(job.salaryMin || job.salaryMax) && (
                      <span>
                        {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ""}
                        {job.salaryMin && job.salaryMax ? " - " : ""}
                        {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ""}
                      </span>
                    )}
                    {job.jobType && <span className="capitalize">{job.jobType}</span>}
                    <span>Saved {new Date(saved.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTrack(job.id)}
                    className="text-xs px-2 py-1 rounded font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
                  >
                    Track
                  </button>
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs"
                    >
                      Apply
                    </a>
                  )}
                  <button
                    onClick={() => handleUnsave(saved.id, job.id)}
                    className="text-xs px-2 py-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {isExpanded && job.description && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {job.description}
                  </div>
                </div>
              )}
              {isExpanded && !job.description && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-400 italic">No description available.</p>
                </div>
              )}
              <button
                onClick={() => toggleExpand(saved.id)}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
