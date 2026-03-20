"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface StatusChange {
  id: string;
  fromStatus: string;
  toStatus: string;
  note?: string | null;
  changedAt: string;
}

interface ApplicationDetail {
  id: string;
  status: string;
  appliedDate?: string | null;
  responseDate?: string | null;
  coverLetter?: string | null;
  applicationNotes?: string | null;
  followUpDate?: string | null;
  followUpCount: number;
  interviewRounds: number;
  offerAmount?: number | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    company: string;
    location?: string | null;
    description?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    jobType?: string | null;
    remoteType?: string | null;
    url?: string | null;
  };
  statusHistory: StatusChange[];
}

const STATUS_OPTIONS = ["saved", "applied", "interviewing", "offer", "rejected"];
const STATUS_STEPS = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offer", label: "Offer" },
];

function getStatusIndex(status: string): number {
  if (status === "rejected") return -1;
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  async function fetchApplication() {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load application");
        return;
      }
      setApplication(data.application);
      setNotes(data.application.applicationNotes || "");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!application || application.status === newStatus) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchApplication();
      }
    } catch {
      // User can retry
    } finally {
      setChangingStatus(false);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await fetch(`/api/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationNotes: notes }),
      });
    } catch {
      // Silently fail
    } finally {
      setSavingNotes(false);
    }
  }

  async function generateCoverLetter() {
    setGeneratingCover(true);
    try {
      const res = await fetch(`/api/applications/${id}/cover-letter`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchApplication();
      }
    } catch {
      // User can retry
    } finally {
      setGeneratingCover(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/applications");
      }
    } catch {
      setDeleting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatSalary(min?: number | null, max?: number | null): string {
    if (!min && !max) return "Not listed";
    const fmtMin = min ? `$${min.toLocaleString()}` : "?";
    const fmtMax = max ? `$${max.toLocaleString()}` : "?";
    return `${fmtMin} - ${fmtMax}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-red-600">{error || "Application not found"}</p>
        <Link href="/applications" className="btn-secondary mt-4 inline-block">
          Back to Applications
        </Link>
      </div>
    );
  }

  const currentStepIndex = getStatusIndex(application.status);
  const isRejected = application.status === "rejected";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/applications" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Back to Applications
          </Link>
          <h1 className="text-2xl font-bold">{application.job.title}</h1>
          <p className="text-gray-600">{application.job.company}</p>
          {application.job.location && (
            <p className="text-sm text-gray-500">{application.job.location}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-600 hover:text-red-700"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* Status Timeline */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Status</h2>
        {isRejected ? (
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
              Rejected
            </span>
            {application.rejectionReason && (
              <span className="text-sm text-gray-500">{application.rejectionReason}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 mb-3">
            {STATUS_STEPS.map((step, i) => {
              const isActive = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCurrent
                          ? "bg-brand-600 text-white"
                          : isActive
                          ? "bg-brand-100 text-brand-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className={`text-xs mt-1 ${isCurrent ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 ${isActive && i < currentStepIndex ? "bg-brand-300" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={changingStatus || application.status === s}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                application.status === s
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Job Info */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Job Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Type:</span>{" "}
            <span className="text-gray-900">{application.job.jobType || "Not specified"}</span>
          </div>
          <div>
            <span className="text-gray-500">Remote:</span>{" "}
            <span className="text-gray-900">{application.job.remoteType || "Not specified"}</span>
          </div>
          <div>
            <span className="text-gray-500">Salary:</span>{" "}
            <span className="text-gray-900">{formatSalary(application.job.salaryMin, application.job.salaryMax)}</span>
          </div>
          <div>
            <span className="text-gray-500">Saved:</span>{" "}
            <span className="text-gray-900">{formatDate(application.createdAt)}</span>
          </div>
          {application.appliedDate && (
            <div>
              <span className="text-gray-500">Applied:</span>{" "}
              <span className="text-gray-900">{formatDate(application.appliedDate)}</span>
            </div>
          )}
          {application.responseDate && (
            <div>
              <span className="text-gray-500">Response:</span>{" "}
              <span className="text-gray-900">{formatDate(application.responseDate)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-3">
          {application.job.url && (
            <a
              href={application.job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-600 hover:text-brand-700"
            >
              View original listing
            </a>
          )}
        </div>
      </div>

      {/* AI Apply Kit */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Application Kit</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              AI prepares your cover letter, answers to common questions, and step-by-step instructions
            </p>
          </div>
          <Link
            href={`/apply/${application.id}`}
            className="btn-primary text-sm"
          >
            AI Apply
          </Link>
        </div>
      </div>

      {/* Cover Letter */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Cover Letter</h2>
          <div className="flex gap-2">
            {application.coverLetter && (
              <Link
                href={`/cover-letter/${application.id}`}
                className="btn-secondary text-xs"
              >
                Edit
              </Link>
            )}
            <button
              onClick={generateCoverLetter}
              disabled={generatingCover}
              className="btn-primary text-xs"
            >
              {generatingCover
                ? "Generating..."
                : application.coverLetter
                ? "Regenerate"
                : "Generate Cover Letter"}
            </button>
          </div>
        </div>
        {generatingCover && (
          <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-lg border border-brand-100">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-brand-700 font-medium">AI is writing your cover letter...</span>
          </div>
        )}
        {application.coverLetter && !generatingCover && (
          <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {application.coverLetter}
          </div>
        )}
        {!application.coverLetter && !generatingCover && (
          <p className="text-sm text-gray-400">
            No cover letter yet. Click generate to create one tailored to this role.
          </p>
        )}
      </div>

      {/* Tailored Resume */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Tailored Resume</h2>
          <Link
            href={`/tailored/${application.id}`}
            className="btn-secondary text-xs"
          >
            Tailor Resume
          </Link>
        </div>
      </div>

      {/* Notes */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-field w-full min-h-[100px] text-sm"
          placeholder="Add notes about this application, interview prep, contacts, etc."
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            className="btn-secondary text-xs"
          >
            {savingNotes ? "Saving..." : "Save Notes"}
          </button>
        </div>
      </div>

      {/* Status History */}
      {application.statusHistory.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">History</h2>
          <div className="space-y-2">
            {application.statusHistory.map((change) => (
              <div key={change.id} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 whitespace-nowrap text-xs">
                  {formatDate(change.changedAt)}
                </span>
                <span className="text-gray-700">
                  {change.fromStatus} &rarr; {change.toStatus}
                </span>
                {change.note && (
                  <span className="text-gray-500 italic">{change.note}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
