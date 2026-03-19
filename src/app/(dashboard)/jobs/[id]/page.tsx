"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner, AiThinking } from "@/components/shared/loading-spinner";
import type { JobScore } from "@/lib/ai/schemas/job-score";

interface JobDetail {
  id: string;
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
  source: string;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [score, setScore] = useState<JobScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchScore = useCallback(async () => {
    setScoring(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/score`);
      const data = await res.json();
      if (res.ok) setScore(data.score);
    } catch {
      // Score fetch failed silently
    } finally {
      setScoring(false);
    }
  }, [jobId]);

  useEffect(() => {
    async function fetchJob() {
      try {
        // For now, we use the search API to get cached job data
        // In production, add a GET /api/jobs/[id] endpoint
        const res = await fetch(`/api/jobs/${jobId}/score`);
        if (res.status === 400) {
          // No profile yet, can still view job
        }
        // We need to fetch job details from DB directly
        // Using a simple approach: fetch from score endpoint which returns cached data
      } catch {
        // Ignore
      }
      setLoading(false);
    }
    fetchJob();
  }, [jobId]);

  // Simplified: In Phase 2, the job detail comes from search results cached in DB
  // Adding a dedicated endpoint would be cleaner but keeping it simple for now

  useEffect(() => {
    // Auto-fetch score when page loads
    fetchScore();
  }, [fetchScore]);

  async function handleSave() {
    try {
      await fetch(`/api/jobs/${jobId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: false }),
      });
      setSaved(true);
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
        Back to search
      </button>

      {job ? (
        <>
          {/* Job Header */}
          <div className="card p-6">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-lg text-gray-600 mt-1">{job.company}</p>
            <div className="flex gap-3 mt-3 text-sm text-gray-500 flex-wrap">
              {job.location && <span>{job.location}</span>}
              {(job.salaryMin || job.salaryMax) && (
                <span>
                  {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ""}
                  {job.salaryMin && job.salaryMax ? " - " : ""}
                  {job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ""}
                </span>
              )}
              {job.jobType && <span className="capitalize">{job.jobType}</span>}
              {job.remoteType && <span className="capitalize">{job.remoteType}</span>}
            </div>
            <div className="flex gap-3 mt-4">
              {job.url && (
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
                  Apply Now
                </a>
              )}
              <button onClick={handleSave} className={`btn-secondary text-sm ${saved ? "bg-green-50 text-green-700 border-green-200" : ""}`}>
                {saved ? "Saved" : "Save Job"}
              </button>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Job Description</h2>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-6 text-center text-gray-500">
          <p>Job details are being loaded from search results.</p>
          <p className="text-sm mt-1">Navigate here from the search page for full details.</p>
        </div>
      )}

      {/* AI Score */}
      {scoring ? (
        <AiThinking message="AI is analyzing this job match..." />
      ) : score ? (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">AI Match Analysis</h2>

          {/* Score summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-3xl font-bold ${score.fitScore >= 70 ? "text-green-600" : score.fitScore >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                {score.fitScore}
              </div>
              <div className="text-xs text-gray-500 mt-1">Fit Score</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-3xl font-bold ${score.hireProbability >= 70 ? "text-green-600" : score.hireProbability >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                {score.hireProbability}
              </div>
              <div className="text-xs text-gray-500 mt-1">Hire Probability</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            {Object.entries(score.breakdown).map(([key, val]) => (
              <div key={key} className="flex items-start gap-3">
                <div className="w-16 text-right">
                  <span className={`text-sm font-bold ${val.score >= 70 ? "text-green-600" : val.score >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                    {val.score}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium capitalize">{key.replace("Match", " Match")}</div>
                  <div className="text-xs text-gray-600">{val.details}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Strengths and Gaps */}
          {score.strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-green-700 mb-1">Strengths</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {score.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-500 flex-shrink-0">+</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {score.gaps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-600 mb-1">Gaps</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {score.gaps.map((g, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-500 flex-shrink-0">-</span> {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
            <p className="text-sm text-brand-800">{score.recommendation}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
