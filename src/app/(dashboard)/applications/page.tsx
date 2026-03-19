"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface ApplicationJob {
  id: string;
  title: string;
  company: string;
  location?: string | null;
}

interface ApplicationItem {
  id: string;
  status: string;
  appliedDate?: string | null;
  createdAt: string;
  updatedAt: string;
  job: ApplicationJob;
}

const STATUS_COLUMNS = [
  { key: "saved", label: "Saved", color: "bg-gray-100 text-gray-700" },
  { key: "applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
  { key: "interviewing", label: "Interviewing", color: "bg-amber-100 text-amber-700" },
  { key: "offer", label: "Offer", color: "bg-green-100 text-green-700" },
  { key: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
];

const STATUS_OPTIONS = STATUS_COLUMNS.map((c) => c.key);

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load applications");
        return;
      }
      setApplications(data.applications);
    } catch {
      setError("Something went wrong loading applications.");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(applicationId: string, newStatus: string) {
    setUpdatingId(applicationId);
    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: newStatus } : app
          )
        );
      }
    } catch {
      // Silently fail, user can retry
    } finally {
      setUpdatingId(null);
    }
  }

  function getColumnApps(status: string) {
    return applications.filter((app) => app.status === status);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Applications</h1>
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No applications yet</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
            When you apply to jobs, they will appear here with status tracking and follow-up reminders.
          </p>
          <Link href="/jobs" className="btn-primary">
            Search Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Applications</h1>
        <span className="text-sm text-gray-500">{applications.length} total</span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATUS_COLUMNS.map((column) => {
          const columnApps = getColumnApps(column.key);
          return (
            <div key={column.key} className="min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${column.color}`}>
                  {column.label}
                </span>
                <span className="text-xs text-gray-400">{columnApps.length}</span>
              </div>

              <div className="space-y-2">
                {columnApps.map((app) => (
                  <div key={app.id} className="card p-3 hover:shadow-md transition-shadow">
                    <Link href={`/applications/${app.id}`} className="block mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {app.job.title}
                      </h3>
                      <p className="text-xs text-gray-600 truncate">{app.job.company}</p>
                      {app.job.location && (
                        <p className="text-xs text-gray-400 truncate">{app.job.location}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {app.appliedDate
                          ? `Applied ${formatDate(app.appliedDate)}`
                          : `Saved ${formatDate(app.createdAt)}`}
                      </p>
                    </Link>

                    <select
                      value={app.status}
                      onChange={(e) => changeStatus(app.id, e.target.value)}
                      disabled={updatingId === app.id}
                      className="input-field w-full text-xs py-1"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {columnApps.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                    None
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
