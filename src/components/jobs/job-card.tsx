"use client";

import { useState } from "react";
import Link from "next/link";

interface JobCardProps {
  id: string;
  externalId: string;
  source: string;
  title: string;
  company: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  remoteType?: string;
  url?: string;
  postedDate?: string;
  saved?: boolean;
  fitScore?: number;
  hireProbability?: number;
  onSave?: (jobId: string) => void;
  onDismiss?: (jobId: string) => void;
}

export function JobCard({
  id,
  title,
  company,
  location,
  salaryMin,
  salaryMax,
  jobType,
  remoteType,
  url,
  postedDate,
  saved: initialSaved,
  fitScore,
  onSave,
  onDismiss,
}: JobCardProps) {
  const [saved, setSaved] = useState(initialSaved || false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/jobs/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: false }),
      });
      setSaved(true);
      onSave?.(id);
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDismiss() {
    setSaving(true);
    try {
      await fetch(`/api/jobs/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: true }),
      });
      onDismiss?.(id);
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }

  const scoreColor = fitScore
    ? fitScore >= 70
      ? "bg-green-100 text-green-700"
      : fitScore >= 40
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700"
    : "bg-gray-100 text-gray-500";

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/jobs/${id}`} className="font-semibold text-gray-900 hover:text-brand-600 truncate">
              {title}
            </Link>
            {fitScore !== undefined && (
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${scoreColor}`}>
                {fitScore}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{company}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
            {location && <span>{location}</span>}
            {(salaryMin || salaryMax) && (
              <span>
                {salaryMin ? `$${salaryMin.toLocaleString()}` : ""}
                {salaryMin && salaryMax ? " - " : ""}
                {salaryMax ? `$${salaryMax.toLocaleString()}` : ""}
              </span>
            )}
            {jobType && <span className="capitalize">{jobType}</span>}
            {remoteType && <span className="capitalize">{remoteType}</span>}
            {postedDate && (
              <span>{new Date(postedDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline"
            >
              Apply
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600"
            }`}
          >
            {saved ? "Saved" : saving ? "..." : "Save"}
          </button>
          <button
            onClick={handleDismiss}
            disabled={saving}
            className="text-xs px-2 py-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Dismiss"
          >
            X
          </button>
        </div>
      </div>
    </div>
  );
}
