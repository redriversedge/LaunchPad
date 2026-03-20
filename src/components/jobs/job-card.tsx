"use client";

import { useState } from "react";

interface JobCardProps {
  id: string;
  externalId: string;
  source: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
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
  onTrack?: (jobId: string) => void;
}

export function JobCard({
  id,
  title,
  company,
  location,
  description,
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
  onTrack,
}: JobCardProps) {
  const [saved, setSaved] = useState(initialSaved || false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tracking, setTracking] = useState(false);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: false }),
      });
      if (res.ok) {
        setSaved(true);
        onSave?.(id);
      }
    } catch {
      // Retry possible
    } finally {
      setSaving(false);
    }
  }

  async function handleDismiss() {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: true }),
      });
      if (res.ok) {
        onDismiss?.(id);
      }
    } catch {
      // Retry possible
    } finally {
      setSaving(false);
    }
  }

  async function handleTrack() {
    if (!id) return;
    setTracking(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });
      const data = await res.json();
      if (res.ok || res.status === 409) {
        onTrack?.(data.application?.id || id);
      }
    } catch {
      // Retry possible
    } finally {
      setTracking(false);
    }
  }

  const scoreColor = fitScore
    ? fitScore >= 70
      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
      : fitScore >= 40
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    : "";

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Clickable title to expand */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-semibold text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 text-left truncate"
            >
              {title}
            </button>
            {fitScore !== undefined && fitScore > 0 && (
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${scoreColor}`}>
                {fitScore}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{company}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
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
        <div className="flex gap-2 flex-shrink-0 items-start">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline dark:text-brand-400"
            >
              Apply
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving || saved || !id}
            className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
              saved
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-brand-950 dark:hover:text-brand-400"
            }`}
          >
            {saved ? "Saved" : saving ? "..." : "Save"}
          </button>
          <button
            onClick={handleTrack}
            disabled={tracking || !id}
            className="text-xs px-2 py-1 rounded font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
          >
            {tracking ? "..." : "Track"}
          </button>
          <button
            onClick={handleDismiss}
            disabled={saving || !id}
            className="text-xs px-2 py-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors dark:hover:bg-red-950"
            title="Dismiss"
          >
            X
          </button>
        </div>
      </div>

      {/* Expandable description */}
      {expanded && description && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {description}
          </div>
        </div>
      )}
      {expanded && !description && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description available for this listing.</p>
        </div>
      )}

      {/* Expand/collapse hint */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
