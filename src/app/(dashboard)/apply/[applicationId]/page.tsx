"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface ApplicationKit {
  coverLetter: string;
  whyThisCompany: string;
  whyThisRole: string;
  biggestStrength: string;
  salaryAnswer: string;
  additionalNotes: string;
  applicationSteps: string[];
  estimatedTime: string;
}

interface ApplicationInfo {
  id: string;
  status: string;
  job: {
    title: string;
    company: string;
    url?: string | null;
    location?: string | null;
  };
}

export default function ApplyPage() {
  const params = useParams();
  const applicationId = params.applicationId as string;

  const [kit, setKit] = useState<ApplicationKit | null>(null);
  const [application, setApplication] = useState<ApplicationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

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
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function generateKit() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/kit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate application kit");
        return;
      }
      setKit(data.kit);
    } catch {
      setError("Something went wrong generating the kit.");
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
    }
  }

  async function markAsApplied() {
    try {
      await fetch(`/api/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "applied" }),
      });
      await fetchApplication();
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

  if (!application) {
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
      <Link href={`/applications/${applicationId}`} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        Back to application
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">AI Application Kit</h1>
          {application && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {application.job.title} at {application.job.company}
            </p>
          )}
        </div>
        {application?.job.url && (
          <a
            href={application.job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Open Application
          </a>
        )}
      </div>

      {!kit && !generating && (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2 dark:text-white">Ready to apply?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            AI will prepare your complete application kit: a tailored cover letter, answers to common questions, and step-by-step instructions for this specific role.
          </p>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <button onClick={generateKit} className="btn-primary text-base px-8 py-3">
            Generate Application Kit
          </button>
        </div>
      )}

      {generating && (
        <div className="card p-8">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">AI is preparing your application kit...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Writing your cover letter, preparing answers, and creating step-by-step instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      {kit && (
        <>
          {/* Estimated time */}
          <div className="card p-4 bg-brand-50 border-brand-200 dark:bg-brand-950 dark:border-brand-800">
            <p className="text-sm text-brand-800 dark:text-brand-200">
              Estimated application time: <span className="font-semibold">{kit.estimatedTime}</span>
            </p>
          </div>

          {/* Application Steps */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4 dark:text-white">Step-by-Step Instructions</h2>
            <ol className="space-y-3">
              {kit.applicationSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center dark:bg-brand-900 dark:text-brand-300">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Cover Letter */}
          <CopyableSection
            title="Cover Letter"
            content={kit.coverLetter}
            copied={copied}
            onCopy={() => copyToClipboard(kit.coverLetter, "coverLetter")}
            label="coverLetter"
          />

          {/* Common Questions */}
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold dark:text-white">Common Application Questions</h2>

            <CopyableBlock
              question={`Why do you want to work at ${application?.job.company || "this company"}?`}
              answer={kit.whyThisCompany}
              copied={copied}
              onCopy={() => copyToClipboard(kit.whyThisCompany, "whyCompany")}
              label="whyCompany"
            />

            <CopyableBlock
              question="Why are you interested in this role?"
              answer={kit.whyThisRole}
              copied={copied}
              onCopy={() => copyToClipboard(kit.whyThisRole, "whyRole")}
              label="whyRole"
            />

            <CopyableBlock
              question="What is your greatest strength?"
              answer={kit.biggestStrength}
              copied={copied}
              onCopy={() => copyToClipboard(kit.biggestStrength, "strength")}
              label="strength"
            />

            <CopyableBlock
              question="What are your salary expectations?"
              answer={kit.salaryAnswer}
              copied={copied}
              onCopy={() => copyToClipboard(kit.salaryAnswer, "salary")}
              label="salary"
            />
          </div>

          {/* Additional Notes */}
          {kit.additionalNotes && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3 dark:text-white">Tips for This Application</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{kit.additionalNotes}</p>
            </div>
          )}

          {/* Mark as Applied */}
          {application?.status === "saved" && (
            <div className="card p-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Done submitting your application?
              </p>
              <button onClick={markAsApplied} className="btn-primary">
                Mark as Applied
              </button>
            </div>
          )}

          {/* Regenerate */}
          <div className="text-center">
            <button
              onClick={generateKit}
              disabled={generating}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Regenerate application kit
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CopyableSection({
  title,
  content,
  copied,
  onCopy,
  label,
}: {
  title: string;
  content: string;
  copied: string | null;
  onCopy: () => void;
  label: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold dark:text-white">{title}</h2>
        <button
          onClick={onCopy}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium dark:text-brand-400"
        >
          {copied === label ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function CopyableBlock({
  question,
  answer,
  copied,
  onCopy,
  label,
}: {
  question: string;
  answer: string;
  copied: string | null;
  onCopy: () => void;
  label: string;
}) {
  return (
    <div className="border-t border-gray-100 pt-4 first:border-0 first:pt-0 dark:border-gray-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{question}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{answer}</p>
        </div>
        <button
          onClick={onCopy}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium flex-shrink-0 dark:text-brand-400"
        >
          {copied === label ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
