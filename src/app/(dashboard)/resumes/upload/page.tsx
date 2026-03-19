"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AiThinking } from "@/components/shared/loading-spinner";

export default function ResumeUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  interface ParsedResult {
    headline?: string;
    summary?: string;
    skills?: Array<{ name: string }>;
    workHistory?: Array<{ title: string; company: string }>;
  }
  const [parsed, setParsed] = useState<ParsedResult | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }, []);

  function validateAndSetFile(f: File) {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!validTypes.includes(f.type)) {
      setError("Please upload a PDF or Word document (.pdf, .docx, .doc)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        return;
      }

      setParsed(data.parsed);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (parsed) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Resume Parsed Successfully</h1>
        <div className="card p-6 space-y-4">
          {parsed.headline ? (
            <div>
              <span className="text-sm text-gray-500">Headline</span>
              <p className="font-medium">{parsed.headline}</p>
            </div>
          ) : null}
          {parsed.summary ? (
            <div>
              <span className="text-sm text-gray-500">Summary</span>
              <p className="text-sm">{parsed.summary}</p>
            </div>
          ) : null}
          {parsed.skills && parsed.skills.length > 0 ? (
            <div>
              <span className="text-sm text-gray-500">Skills Found</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {parsed.skills.map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-brand-50 text-brand-700 rounded text-xs font-medium">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {parsed.workHistory && parsed.workHistory.length > 0 ? (
            <div>
              <span className="text-sm text-gray-500">Work History</span>
              {parsed.workHistory.map((w, i) => (
                <p key={i} className="text-sm">
                  <span className="font-medium">{w.title}</span> at {w.company}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push("/intake")} className="btn-primary">
            Continue to Intake Interview
          </button>
          <button onClick={() => router.push("/profile")} className="btn-secondary">
            View Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Your Resume</h1>
        <p className="text-gray-600 mt-1">
          We&apos;ll use AI to extract your skills, experience, and education. The more complete your resume, the better your matches will be.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {uploading ? (
        <div className="space-y-4">
          <AiThinking message="Parsing your resume with AI. This usually takes 10-20 seconds..." />
        </div>
      ) : (
        <>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`card p-12 text-center border-2 border-dashed transition-colors cursor-pointer ${
              dragActive
                ? "border-brand-500 bg-brand-50"
                : file
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <p className="text-xs text-gray-400 mt-2">Click to choose a different file</p>
              </div>
            ) : (
              <div>
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="font-medium text-gray-700">Drop your resume here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                <p className="text-xs text-gray-400 mt-2">PDF or Word (.pdf, .docx, .doc). Max 10MB.</p>
              </div>
            )}
          </div>

          {file && (
            <button onClick={handleUpload} className="btn-primary w-full">
              Upload and Parse Resume
            </button>
          )}
        </>
      )}
    </div>
  );
}
