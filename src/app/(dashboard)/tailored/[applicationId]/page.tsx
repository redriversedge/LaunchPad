"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner, AiThinking } from "@/components/shared/loading-spinner";

interface TailoredChange {
  section: string;
  original: string;
  modified: string;
  reason: string;
}

interface TailoredWorkHistory {
  company: string;
  title: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  bullets: string[];
  industry: string | null;
}

interface TailoredSections {
  summary: string;
  skills: string[];
  workHistory: TailoredWorkHistory[];
}

interface TailoredData {
  id: string;
  sections: TailoredSections;
  changes: TailoredChange[];
}

export default function TailoredResumePage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;

  const [data, setData] = useState<TailoredData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTailored() {
      try {
        const res = await fetch(`/api/resume?applicationId=${applicationId}&type=tailored`);
        if (res.ok) {
          const result = await res.json();
          if (result.resume) {
            setData({
              id: result.resume.id,
              sections: JSON.parse(result.resume.tailoredContent),
              changes: JSON.parse(result.resume.changeLog),
            });
          }
        }
      } catch {
        // No tailored resume yet, that is fine
      } finally {
        setLoading(false);
      }
    }
    fetchTailored();
  }, [applicationId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to generate tailored resume");
        return;
      }
      setData(result);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove() {
    if (!data) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/resume/${data.id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        setApproved(true);
      }
    } catch {
      // Approval failed silently
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // No tailored resume yet, show generate button
  if (!data && !generating) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back
        </button>

        <div className="card p-8 text-center space-y-4">
          <h1 className="text-xl font-bold">Tailored Resume</h1>
          <p className="text-gray-600">
            No tailored resume exists for this application yet. Generate one to
            optimize your resume for this specific job.
          </p>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button onClick={handleGenerate} className="btn-primary">
            Generate Tailored Resume
          </button>
        </div>
      </div>
    );
  }

  // Currently generating
  if (generating) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back
        </button>
        <AiThinking message="AI is tailoring your resume to match this job..." />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tailored Resume</h1>
        <div className="flex gap-3">
          {!approved ? (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="btn-primary text-sm"
            >
              {approving ? "Approving..." : "Approve"}
            </button>
          ) : (
            <span className="text-sm text-green-700 font-medium px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
              Approved
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="card p-6">
        <h2 className="font-semibold mb-2">Summary</h2>
        <p className="text-sm text-gray-700">{data.sections.summary}</p>
      </div>

      {/* Skills */}
      <div className="card p-6">
        <h2 className="font-semibold mb-3">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {data.sections.skills.map((skill, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Work History */}
      <div className="card p-6">
        <h2 className="font-semibold mb-3">Work History</h2>
        <div className="space-y-4">
          {data.sections.workHistory.map((job, i) => (
            <div key={i} className="border-l-2 border-gray-200 pl-4">
              <div className="font-medium text-sm">{job.title}</div>
              <div className="text-sm text-gray-600">
                {job.company}
                {job.location ? `, ${job.location}` : ""}
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {job.startDate} - {job.endDate ?? "Present"}
              </div>
              <ul className="space-y-1">
                {job.bullets.map((bullet, j) => (
                  <li key={j} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-gray-400 flex-shrink-0">-</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Changes */}
      {data.changes.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">
            Changes Made ({data.changes.length})
          </h2>
          <div className="space-y-4">
            {data.changes.map((change, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 bg-brand-50 text-brand-700 rounded capitalize">
                    {change.section}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1">
                      Original
                    </div>
                    <div className="text-sm text-gray-600 bg-red-50 p-2 rounded border border-red-100">
                      {change.original}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1">
                      Modified
                    </div>
                    <div className="text-sm text-gray-700 bg-green-50 p-2 rounded border border-green-100">
                      {change.modified}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 italic">
                  {change.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.changes.length === 0 && (
        <div className="card p-6 text-center text-gray-500 text-sm">
          No changes were needed. Your resume is already well-aligned with this job.
        </div>
      )}
    </div>
  );
}
