"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner, AiThinking } from "@/components/shared/loading-spinner";
import { ChangePopover } from "@/components/resume/change-popover";

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

interface EditStats {
  totalChanges: number;
  applied: number;
  skipped: number;
  skippedEdits: Array<{ original: string; reason: string }>;
  qualityCheck: {
    valid: boolean;
    paragraphCountMatch: boolean;
    originalCount: number;
    currentCount: number;
    formattingDrifts: Array<{ field: string; expected: string; actual: string }>;
  };
}

interface TailoredData {
  id?: string;
  sections: TailoredSections;
  changes: TailoredChange[];
  hasDocx?: boolean;
  docxBase64?: string;
  editStats?: EditStats | null;
}

interface ApplicationInfo {
  job: { title: string; company: string };
}

export default function TailoredResumePage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<TailoredData | null>(null);
  const [appInfo, setAppInfo] = useState<ApplicationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Diff editor state
  const [editedSections, setEditedSections] = useState<TailoredSections | null>(null);
  const [revertedIndexes, setRevertedIndexes] = useState<Set<number>>(new Set());
  const [customEdits, setCustomEdits] = useState<Map<number, string>>(new Map());
  const [changesPanelOpen, setChangesPanelOpen] = useState(true);

  const getDisplayText = useCallback(
    (changeIndex: number): string => {
      if (!data) return "";
      const change = data.changes[changeIndex];
      if (customEdits.has(changeIndex)) return customEdits.get(changeIndex)!;
      if (revertedIndexes.has(changeIndex)) return change.original;
      return change.modified;
    },
    [data, revertedIndexes, customEdits]
  );

  useEffect(() => {
    async function load() {
      try {
        const appRes = await fetch(`/api/applications/${applicationId}`);
        if (appRes.ok) {
          const appData = await appRes.json();
          setAppInfo(appData.application);
        }

        // Check for existing tailored resume
        const res = await fetch(`/api/resume?applicationId=${applicationId}&type=tailored`);
        if (res.ok) {
          const result = await res.json();
          if (result.resume) {
            const parsed: TailoredData = {
              id: result.resume.id,
              sections: JSON.parse(result.resume.tailoredContent),
              changes: JSON.parse(result.resume.changeLog),
            };
            setData(parsed);
            setEditedSections(parsed.sections);
          }
        }
      } catch {
        // No tailored resume yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [applicationId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      // Use tailor-docx endpoint for format-preserving editing
      const res = await fetch(`/api/applications/${applicationId}/tailor-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to generate tailored resume");
        return;
      }
      setData(result);
      setEditedSections(result.sections);
      setRevertedIndexes(new Set());
      setCustomEdits(new Map());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function handleRevert(index: number) {
    setRevertedIndexes((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setCustomEdits((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  }

  function handleRestore(index: number) {
    setRevertedIndexes((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    setCustomEdits((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  }

  function handleEdit(index: number, newText: string) {
    setCustomEdits((prev) => {
      const next = new Map(prev);
      next.set(index, newText);
      return next;
    });
    setRevertedIndexes((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }

  function findChangeIndex(section: string, modifiedText: string): number {
    if (!data) return -1;
    return data.changes.findIndex(
      (c) => c.section === section && c.modified === modifiedText
    );
  }

  function findBulletChangeIndex(currentBullet: string): number {
    if (!data) return -1;
    return data.changes.findIndex(
      (c) => c.section === "workHistory" && c.modified === currentBullet
    );
  }

  // Download the format-preserved .docx
  function handleDownloadDocx() {
    if (!data?.docxBase64) return;
    const binary = atob(data.docxBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const jobTitle = appInfo?.job.title ?? "resume";
    const company = appInfo?.job.company ?? "";
    a.download = `Resume - ${jobTitle}${company ? ` - ${company}` : ""}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build final resume text for .txt download
  function buildResumeText(): string {
    if (!data || !editedSections) return "";
    const lines: string[] = [];

    const summaryChangeIdx = findChangeIndex("summary", data.sections.summary);
    const finalSummary = summaryChangeIdx !== -1 ? getDisplayText(summaryChangeIdx) : editedSections.summary;
    lines.push("PROFESSIONAL SUMMARY");
    lines.push("=".repeat(40));
    lines.push(finalSummary);
    lines.push("");

    lines.push("SKILLS");
    lines.push("=".repeat(40));
    const finalSkills = editedSections.skills.map((skill) => {
      const changeIdx = findChangeIndex("skills", skill);
      if (changeIdx !== -1) return getDisplayText(changeIdx);
      return skill;
    });
    lines.push(finalSkills.join(", "));
    lines.push("");

    lines.push("WORK EXPERIENCE");
    lines.push("=".repeat(40));
    editedSections.workHistory.forEach((job) => {
      lines.push(`${job.title}`);
      lines.push(`${job.company}${job.location ? `, ${job.location}` : ""}`);
      lines.push(`${job.startDate} - ${job.endDate ?? "Present"}`);
      job.bullets.forEach((bullet) => {
        const changeIdx = findBulletChangeIndex(bullet);
        const finalBullet = changeIdx !== -1 ? getDisplayText(changeIdx) : bullet;
        lines.push(`  - ${finalBullet}`);
      });
      lines.push("");
    });

    return lines.join("\n");
  }

  function handleDownloadText() {
    const text = buildResumeText();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const jobTitle = appInfo?.job.title ?? "resume";
    const company = appInfo?.job.company ?? "";
    a.download = `Resume - ${jobTitle}${company ? ` - ${company}` : ""}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const jobTitle = appInfo?.job.title ?? "";
    const company = appInfo?.job.company ?? "";

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Resume - ${jobTitle}${company ? ` - ${company}` : ""}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; padding: 0.75in 1in; line-height: 1.5; font-size: 11pt; }
    h1 { font-size: 14pt; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
    h2 { font-size: 11pt; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 3px; margin-top: 16px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary { margin-bottom: 4px; }
    .skills { margin-bottom: 4px; }
    .job { margin-bottom: 12px; }
    .job-title { font-weight: bold; font-size: 11pt; }
    .job-company { font-style: italic; }
    .job-date { font-size: 10pt; color: #555; margin-bottom: 4px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 3px; font-size: 10.5pt; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${printContent.innerHTML}</body>
</html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }

  function renderTextWithChange(
    text: string,
    section: string
  ): React.ReactNode {
    if (!data) return text;
    const changeIdx = findChangeIndex(section, text);
    if (changeIdx === -1) return text;

    const change = data.changes[changeIdx];
    const displayText = getDisplayText(changeIdx);
    const isReverted = revertedIndexes.has(changeIdx);

    return (
      <ChangePopover
        original={change.original}
        modified={change.modified}
        reason={change.reason}
        isReverted={isReverted}
        onRevert={() => handleRevert(changeIdx)}
        onRestore={() => handleRestore(changeIdx)}
        onEdit={(newText) => handleEdit(changeIdx, newText)}
      >
        {displayText}
      </ChangePopover>
    );
  }

  function renderBulletWithChange(bullet: string): React.ReactNode {
    if (!data) return bullet;
    const changeIdx = findBulletChangeIndex(bullet);
    if (changeIdx === -1) return bullet;

    const change = data.changes[changeIdx];
    const displayText = getDisplayText(changeIdx);
    const isReverted = revertedIndexes.has(changeIdx);

    return (
      <ChangePopover
        original={change.original}
        modified={change.modified}
        reason={change.reason}
        isReverted={isReverted}
        onRevert={() => handleRevert(changeIdx)}
        onRestore={() => handleRestore(changeIdx)}
        onEdit={(newText) => handleEdit(changeIdx, newText)}
      >
        {displayText}
      </ChangePopover>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data && !generating) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          &larr; Back
        </button>

        <div className="card p-8 text-center space-y-4">
          <h1 className="text-xl font-bold dark:text-white">Tailored Resume</h1>
          {appInfo && (
            <p className="text-gray-500 dark:text-gray-400">
              {appInfo.job.title} at {appInfo.job.company}
            </p>
          )}
          <p className="text-gray-600 dark:text-gray-400">
            AI will tailor your resume to match this specific job. If you uploaded a .docx file,
            the original formatting (fonts, spacing, margins, bullet styles) is fully preserved.
            Only the text content changes.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={handleGenerate} className="btn-primary">
            Generate Tailored Resume
          </button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          &larr; Back
        </button>
        <AiThinking message="AI is tailoring your resume to match this job. This takes 15-30 seconds..." />
      </div>
    );
  }

  if (!data || !editedSections) return null;

  const activeChanges = data.changes.length - revertedIndexes.size;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2 inline-block"
          >
            &larr; Back to Application
          </button>
          <h1 className="text-xl font-bold dark:text-white">Tailored Resume</h1>
          {appInfo && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {appInfo.job.title} at {appInfo.job.company}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleGenerate} className="btn-secondary text-xs">
            Regenerate
          </button>
          {data.hasDocx && data.docxBase64 && (
            <button onClick={handleDownloadDocx} className="btn-primary text-xs">
              Download .docx
            </button>
          )}
          <button onClick={handleDownloadText} className="btn-secondary text-xs">
            Download .txt
          </button>
          <button onClick={handlePrint} className="btn-secondary text-xs">
            Print / PDF
          </button>
        </div>
      </div>

      {/* Format preservation notice */}
      {data.hasDocx && data.editStats && (
        <div className="card p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">
              Format-preserved .docx ready.{" "}
              {data.editStats.applied} of {data.editStats.totalChanges} changes applied surgically.
              {data.editStats.skipped > 0 && (
                <> {data.editStats.skipped} skipped (flagged below).</>
              )}
              {" "}Original fonts, spacing, margins, and bullet styles are intact.
            </span>
          </div>
          {data.editStats.skippedEdits.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
                Skipped edits (manual review needed)
              </span>
              {data.editStats.skippedEdits.map((se, i) => (
                <div key={i} className="text-[10px] text-gray-600 dark:text-gray-400 pl-6">
                  {se.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!data.hasDocx && (
        <div className="card p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            No .docx file on record. Re-upload your resume as a .docx to get format-preserved downloads.
            The .txt and Print options are available now.
          </p>
        </div>
      )}

      {/* Changes legend */}
      <div className="card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600" />
              <span className="text-gray-600 dark:text-gray-400">AI changed ({activeChanges})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Reverted ({revertedIndexes.size})</span>
            </span>
            <span className="text-gray-400 dark:text-gray-500">Click any highlighted text to see details</span>
          </div>
          <button
            onClick={() => setChangesPanelOpen(!changesPanelOpen)}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            {changesPanelOpen ? "Hide changes" : "Show changes"} ({data.changes.length})
          </button>
        </div>
      </div>

      {/* Changes panel */}
      {changesPanelOpen && data.changes.length > 0 && (
        <div className="card p-4 max-h-60 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            All Changes ({data.changes.length})
          </h3>
          <div className="space-y-2">
            {data.changes.map((change, i) => {
              const isReverted = revertedIndexes.has(i);
              const hasCustomEdit = customEdits.has(i);
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-2 rounded text-xs ${
                    isReverted
                      ? "bg-gray-50 dark:bg-gray-800 opacity-60"
                      : "bg-amber-50/50 dark:bg-amber-900/10"
                  }`}
                >
                  <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium shrink-0 capitalize">
                    {change.section}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 dark:text-gray-300 truncate">{change.reason}</p>
                    {hasCustomEdit && (
                      <span className="text-brand-600 dark:text-brand-400 text-[10px]">custom edit</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isReverted ? (
                      <button
                        onClick={() => handleRestore(i)}
                        className="px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-200"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRevert(i)}
                        className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                      >
                        Revert
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resume preview */}
      <div className="card p-6 md:p-8 space-y-6">
        {/* Summary */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide border-b border-gray-300 dark:border-gray-600 pb-1 mb-3">
            Professional Summary
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {renderTextWithChange(data.sections.summary, "summary")}
          </p>
        </div>

        {/* Skills */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide border-b border-gray-300 dark:border-gray-600 pb-1 mb-3">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {editedSections.skills.map((skill, i) => {
              const changeIdx = findChangeIndex("skills", skill);
              if (changeIdx !== -1) {
                const change = data.changes[changeIdx];
                const displayText = getDisplayText(changeIdx);
                const isReverted = revertedIndexes.has(changeIdx);
                return (
                  <ChangePopover
                    key={i}
                    original={change.original}
                    modified={change.modified}
                    reason={change.reason}
                    isReverted={isReverted}
                    onRevert={() => handleRevert(changeIdx)}
                    onRestore={() => handleRestore(changeIdx)}
                    onEdit={(newText) => handleEdit(changeIdx, newText)}
                  >
                    <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {displayText}
                    </span>
                  </ChangePopover>
                );
              }
              return (
                <span
                  key={i}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {skill}
                </span>
              );
            })}
          </div>
        </div>

        {/* Work History */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide border-b border-gray-300 dark:border-gray-600 pb-1 mb-3">
            Work Experience
          </h2>
          <div className="space-y-5">
            {editedSections.workHistory.map((job, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between flex-wrap gap-1">
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">
                    {job.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {job.startDate} - {job.endDate ?? "Present"}
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                  {job.company}
                  {job.location ? `, ${job.location}` : ""}
                </div>
                <ul className="space-y-1.5 pl-4">
                  {job.bullets.map((bullet, j) => (
                    <li
                      key={j}
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed list-disc"
                    >
                      {renderBulletWithChange(bullet)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden print-friendly version */}
      <div className="hidden">
        <div ref={printRef}>
          <h2>Professional Summary</h2>
          <p className="summary">
            {data.changes.find((c) => c.section === "summary")
              ? getDisplayText(data.changes.findIndex((c) => c.section === "summary"))
              : editedSections.summary}
          </p>

          <h2>Skills</h2>
          <p className="skills">
            {editedSections.skills
              .map((skill) => {
                const idx = findChangeIndex("skills", skill);
                return idx !== -1 ? getDisplayText(idx) : skill;
              })
              .join(", ")}
          </p>

          <h2>Work Experience</h2>
          {editedSections.workHistory.map((job, i) => (
            <div key={i} className="job">
              <div className="job-title">{job.title}</div>
              <div className="job-company">
                {job.company}
                {job.location ? `, ${job.location}` : ""}
              </div>
              <div className="job-date">
                {job.startDate} - {job.endDate ?? "Present"}
              </div>
              <ul>
                {job.bullets.map((bullet, j) => {
                  const idx = findBulletChangeIndex(bullet);
                  return <li key={j}>{idx !== -1 ? getDisplayText(idx) : bullet}</li>;
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
