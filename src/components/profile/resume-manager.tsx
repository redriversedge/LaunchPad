"use client";

import { useState, useEffect, useRef } from "react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface ResumeItem {
  id: string;
  name: string;
  type: string;
  originalFileName: string | null;
  fileType: string | null;
  version: number;
  isCurrent: boolean;
  conversionConfidence: string | null;
  conversionIssues: string[];
  applicationId: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  createdAt: string;
}

export function ResumeManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    try {
      const res = await fetch("/api/resume/all");
      if (res.ok) {
        const data = await res.json();
        setResumes(data.resumes);
      }
    } catch {
      setError("Failed to load resumes");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Upload failed");
        return;
      }
      setSuccess(result.message);
      await loadResumes();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  async function handleRevert(id: string) {
    setReverting(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/resume/versions/${id}/revert`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Revert failed");
        return;
      }
      setSuccess(result.message);
      await loadResumes();
    } catch {
      setError("Revert failed.");
    } finally {
      setReverting(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  const baseResumes = resumes.filter((r) => r.type === "original");
  const tailoredResumes = resumes.filter((r) => r.type === "tailored");
  const currentBase = baseResumes.find((r) => r.isCurrent);
  const previousBases = baseResumes.filter((r) => !r.isCurrent);

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold dark:text-white">Resumes</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary text-xs"
          >
            {uploading ? "Uploading..." : baseResumes.length > 0 ? "Replace Base Resume" : "Upload Resume"}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded p-2">
          {success}
        </p>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <LoadingSpinner size="sm" />
          Parsing resume with AI...
        </div>
      )}

      {resumes.length === 0 && !uploading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No resumes uploaded yet. Upload your resume to get started.
        </p>
      )}

      {/* Current base resume */}
      {currentBase && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Active Base Resume
          </h3>
          <ResumeRow resume={currentBase} formatDate={formatDate} />
        </div>
      )}

      {/* Previous base versions */}
      {previousBases.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Previous Versions
          </h3>
          <div className="space-y-2">
            {previousBases.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <ResumeRow resume={r} formatDate={formatDate} />
                <button
                  onClick={() => handleRevert(r.id)}
                  disabled={reverting === r.id}
                  className="btn-secondary text-[10px] ml-3 shrink-0"
                >
                  {reverting === r.id ? "Reverting..." : "Revert"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tailored resumes */}
      {tailoredResumes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Tailored Resumes ({tailoredResumes.length})
          </h3>
          <div className="space-y-2">
            {tailoredResumes.map((r) => (
              <ResumeRow key={r.id} resume={r} formatDate={formatDate} />
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        Up to 3 previous base resume versions are kept. Tailored resumes are never deleted when you replace the base.
      </p>
    </div>
  );
}

function ResumeRow({
  resume,
  formatDate,
}: {
  resume: ResumeItem;
  formatDate: (d: string) => string;
}) {
  const isBase = resume.type === "original";
  const isTailored = resume.type === "tailored";

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex-1 min-w-0">
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded flex items-center justify-center shrink-0 text-xs font-bold ${
          isBase && resume.isCurrent
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            : isBase
            ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            : "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
        }`}
      >
        {isBase ? (resume.fileType === "pdf" ? "PDF" : "DOC") : "T"}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium dark:text-white truncate">
            {resume.originalFileName || resume.name}
          </span>
          {isBase && resume.isCurrent && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              Active
            </span>
          )}
          {isBase && !resume.isCurrent && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              v{resume.version}
            </span>
          )}
          {resume.conversionConfidence && resume.fileType === "pdf" && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                resume.conversionConfidence === "high"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : resume.conversionConfidence === "medium"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              }`}
            >
              {resume.conversionConfidence} conversion
            </span>
          )}
        </div>

        {/* Usage info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {isBase && (
            <span>Base resume, uploaded {formatDate(resume.createdAt)}</span>
          )}
          {isTailored && (
            <span>
              Tailored for{" "}
              {resume.jobTitle && resume.jobCompany ? (
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {resume.jobTitle} at {resume.jobCompany}
                </span>
              ) : (
                <span className="italic">Unknown application</span>
              )}
              {" "}, {formatDate(resume.createdAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
