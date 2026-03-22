"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";

interface ResumeVersion {
  id: string;
  name: string;
  version: number;
  isCurrent: boolean;
  originalFileName: string | null;
  fileType: string | null;
  conversionConfidence: string | null;
  conversionIssues: string[];
  createdAt: string;
}

interface TailoredResume {
  id: string;
  name: string;
  applicationId: string | null;
  createdAt: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [tailored, setTailored] = useState<TailoredResume[]>([]);
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
      // Load versions
      const versionsRes = await fetch("/api/resume/versions");
      if (versionsRes.ok) {
        const data = await versionsRes.json();
        setVersions(data.versions);
      }

      // Load tailored resumes
      const tailoredRes = await fetch("/api/resume?type=tailored&list=true");
      if (tailoredRes.ok) {
        const data = await tailoredRes.json();
        setTailored(data.resumes || []);
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
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  async function handleRevert(id: string) {
    setReverting(id);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/resume/versions/${id}/revert`, {
        method: "POST",
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Revert failed");
        return;
      }

      setSuccess(result.message);
      await loadResumes();
    } catch {
      setError("Revert failed. Please try again.");
    } finally {
      setReverting(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (versions.length === 0 && tailored.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title="No resumes yet"
          description="Upload your resume to get started. AI will parse your skills, experience, and education automatically. Both .docx and .pdf files are supported."
          actionLabel="Upload Resume"
          actionHref="/resumes/upload"
        />
      </div>
    );
  }

  const currentResume = versions.find((v) => v.isCurrent);
  const previousVersions = versions.filter((v) => !v.isCurrent);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">Your Resumes</h1>
        <div className="flex gap-2">
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
            className="btn-primary text-sm"
          >
            {uploading ? "Uploading..." : versions.length > 0 ? "Replace Resume" : "Upload Resume"}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Uploading state */}
      {uploading && (
        <div className="card p-4 flex items-center gap-3">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Uploading and parsing resume with AI...
          </span>
        </div>
      )}

      {/* Current Resume */}
      {currentResume && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Current Resume
          </h2>
          <div className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium dark:text-white flex items-center gap-2">
                  {currentResume.originalFileName || currentResume.name}
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    Active
                  </span>
                </h3>
                <div className="flex gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span>v{currentResume.version}</span>
                  <span className="uppercase">{currentResume.fileType}</span>
                  <span>{formatDate(currentResume.createdAt)}</span>
                </div>

                {/* PDF conversion info */}
                {currentResume.fileType === "pdf" && currentResume.conversionConfidence && (
                  <div className="mt-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        currentResume.conversionConfidence === "high"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : currentResume.conversionConfidence === "medium"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      }`}
                    >
                      PDF conversion: {currentResume.conversionConfidence} confidence
                    </span>
                    {currentResume.conversionIssues.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {currentResume.conversionIssues.map((issue, i) => (
                          <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Previous Versions */}
      {previousVersions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Previous Versions ({previousVersions.length})
          </h2>
          <div className="space-y-2">
            {previousVersions.map((version) => (
              <div key={version.id} className="card p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">
                    {version.originalFileName || version.name}
                  </h3>
                  <div className="flex gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>v{version.version}</span>
                    <span className="uppercase">{version.fileType}</span>
                    <span>{formatDate(version.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRevert(version.id)}
                  disabled={reverting === version.id}
                  className="btn-secondary text-xs"
                >
                  {reverting === version.id ? "Reverting..." : "Revert to this"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tailored Resumes */}
      {tailored.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Tailored Versions ({tailored.length})
          </h2>
          <div className="space-y-2">
            {tailored.map((resume) => (
              <div key={resume.id} className="card p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">{resume.name}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(resume.createdAt)}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                  Tailored
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <p>Upload a new resume at any time to replace the current one. Up to {3} previous versions are kept.</p>
        <p>Tailored resumes (generated for specific job applications) are never deleted when you replace your base resume.</p>
        <p>For best format preservation during tailoring, upload a .docx file. PDFs are automatically converted.</p>
      </div>
    </div>
  );
}
