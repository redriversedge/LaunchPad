"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface ApplicationData {
  id: string;
  coverLetter?: string | null;
  job: {
    title: string;
    company: string;
  };
}

export default function CoverLetterPage() {
  const params = useParams();
  const applicationId = params.applicationId as string;

  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [applicationId]);

  async function fetchApplication() {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load application");
        return;
      }
      setApplication(data.application);
      if (data.application.coverLetter) {
        setCoverLetter(data.application.coverLetter);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function generateCoverLetter() {
    setGenerating(true);
    setError("");
    setKeyPoints([]);
    setSaved(false);
    try {
      const res = await fetch(`/api/applications/${applicationId}/cover-letter`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate cover letter");
        return;
      }
      setCoverLetter(data.coverLetter);
      setKeyPoints(data.keyPoints || []);
    } catch {
      setError("Something went wrong generating the cover letter.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveCoverLetter() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter }),
      });
      if (res.ok) {
        setSaved(true);
      }
    } catch {
      setError("Failed to save cover letter.");
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadText() {
    if (!coverLetter || !application) return;
    const blob = new Blob([coverLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cover Letter - ${application.job.title} - ${application.job.company}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintCoverLetter() {
    if (!coverLetter || !application) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Cover Letter - ${application.job.title} - ${application.job.company}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; padding: 1in; line-height: 1.7; font-size: 11pt; }
    p { margin-bottom: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${coverLetter.split("\n").map((line: string) => line.trim() ? `<p>${line}</p>` : "<br/>").join("")}</body>
</html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-red-600">{error}</p>
        <Link href="/applications" className="btn-secondary mt-4 inline-block">
          Back to Applications
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/applications/${applicationId}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          &larr; Back to Application
        </Link>
        <h1 className="text-2xl font-bold">Cover Letter</h1>
        {application && (
          <p className="text-gray-600">
            {application.job.title} at {application.job.company}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={generateCoverLetter}
          disabled={generating}
          className="btn-primary"
        >
          {generating
            ? "Generating..."
            : coverLetter
            ? "Regenerate Cover Letter"
            : "Generate Cover Letter"}
        </button>
        {coverLetter && (
          <>
            <button
              onClick={saveCoverLetter}
              disabled={saving}
              className="btn-secondary"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={handleDownloadText} className="btn-secondary">
              Download .txt
            </button>
            <button onClick={handlePrintCoverLetter} className="btn-primary">
              Download PDF
            </button>
          </>
        )}
      </div>

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          Cover letter saved.
        </div>
      )}

      {/* Loading state */}
      {generating && (
        <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-lg border border-brand-100">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-brand-700 font-medium">AI is writing your cover letter...</span>
        </div>
      )}

      {/* Cover letter editor */}
      {coverLetter && !generating && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Letter</h2>
          <textarea
            value={coverLetter}
            onChange={(e) => {
              setCoverLetter(e.target.value);
              setSaved(false);
            }}
            className="input-field w-full min-h-[400px] text-sm leading-relaxed font-serif"
          />
        </div>
      )}

      {/* Key talking points */}
      {keyPoints.length > 0 && !generating && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Key Talking Points</h2>
          <ul className="space-y-2">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-brand-600 font-semibold mt-0.5">*</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-3">
            Use these points when following up or preparing for interviews.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!coverLetter && !generating && (
        <div className="text-center py-12 text-gray-500">
          <p>No cover letter yet.</p>
          <p className="text-sm mt-1">
            Click "Generate Cover Letter" to create one tailored to this job using your profile.
          </p>
        </div>
      )}
    </div>
  );
}
