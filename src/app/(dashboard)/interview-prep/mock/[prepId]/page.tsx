"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface TranscriptEntry {
  role: "interviewer" | "candidate" | "feedback";
  content: string;
}

type InterviewType = "behavioral" | "technical" | "case";

const TYPE_LABELS: Record<InterviewType, string> = {
  behavioral: "Behavioral Interview",
  technical: "Technical Interview",
  case: "Case Interview",
};

export default function MockInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const prepId = params.prepId as string;

  const [started, setStarted] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType>("behavioral");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [answer, setAnswer] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [overallFeedback, setOverallFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview-prep/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepId, type: interviewType }),
      });
      const data = await res.json();
      if (res.ok) {
        setInterviewId(data.id);
        setTranscript(data.transcript || []);
        setQuestionNumber(data.questionNumber || 1);
        setStarted(true);
      } else {
        setError(data.error || "Failed to start interview");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!answer.trim() || !interviewId) return;

    setSubmitting(true);
    setError(null);
    const currentAnswer = answer;
    setAnswer("");

    // Optimistically add the candidate's answer to the transcript
    setTranscript((prev) => [
      ...prev,
      { role: "candidate", content: currentAnswer },
    ]);

    try {
      const res = await fetch(
        `/api/interview-prep/mock/${interviewId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: currentAnswer }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        // Replace transcript with server's version (includes feedback and next question)
        setTranscript(data.transcript || []);
        setQuestionNumber(data.questionNumber || questionNumber + 1);

        if (data.isComplete) {
          setIsComplete(true);
          setOverallScore(data.overallScore);
          setOverallFeedback(data.overallFeedback);
        }
      } else {
        setError(data.error || "Failed to submit answer");
        // Restore the answer so the user can retry
        setAnswer(currentAnswer);
        // Remove the optimistically added entry
        setTranscript((prev) => prev.slice(0, -1));
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setAnswer(currentAnswer);
      setTranscript((prev) => prev.slice(0, -1));
    } finally {
      setSubmitting(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back to prep
        </button>

        <div className="card p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold">Mock Interview</h1>
          <p className="text-gray-600">
            Practice with an AI interviewer who will ask 10 questions and
            provide coaching feedback after each answer. Choose your interview
            type to get started.
          </p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            {(
              Object.entries(TYPE_LABELS) as [InterviewType, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setInterviewType(key)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  interviewType === key
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" /> Starting...
              </span>
            ) : (
              "Begin Interview"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-lg font-bold">Mock Interview</h1>
          <p className="text-xs text-gray-500">
            {TYPE_LABELS[interviewType]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Question {Math.min(questionNumber, 10)} of 10
          </div>
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((questionNumber / 10) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {transcript.map((entry, i) => (
          <div key={i}>
            {entry.role === "interviewer" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  IV
                </div>
                <div className="card p-4 max-w-[85%]">
                  <p className="text-sm text-gray-800">{entry.content}</p>
                </div>
              </div>
            )}
            {entry.role === "candidate" && (
              <div className="flex gap-3 justify-end">
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 max-w-[85%]">
                  <p className="text-sm text-gray-800">{entry.content}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  You
                </div>
              </div>
            )}
            {entry.role === "feedback" && (
              <div className="ml-11 mr-11">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                    Coach Feedback
                  </p>
                  <p className="text-sm text-amber-900">{entry.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {submitting && (
          <div className="ml-11">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <LoadingSpinner size="sm" />
              <span>Reviewing your answer...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Complete State */}
      {isComplete && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Interview Complete</h2>
              {overallScore !== null && (
                <div
                  className={`text-3xl font-bold ${
                    overallScore >= 75
                      ? "text-green-600"
                      : overallScore >= 60
                      ? "text-yellow-600"
                      : "text-red-500"
                  }`}
                >
                  {overallScore}
                  <span className="text-sm text-gray-400 font-normal">
                    /100
                  </span>
                </div>
              )}
            </div>
            {overallFeedback && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {overallFeedback}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="btn-secondary text-sm"
              >
                Back to Prep
              </button>
              <button
                onClick={() => {
                  setStarted(false);
                  setInterviewId(null);
                  setTranscript([]);
                  setQuestionNumber(1);
                  setIsComplete(false);
                  setOverallScore(null);
                  setOverallFeedback(null);
                  setAnswer("");
                }}
                className="btn-primary text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!isComplete && (
        <div className="border-t border-gray-200 pt-4">
          {error && (
            <p className="text-sm text-red-600 mb-2">{error}</p>
          )}
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer... (Ctrl+Enter to submit)"
              className="input-field flex-1 min-h-[80px] max-h-[200px] resize-y"
              disabled={submitting}
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!answer.trim() || submitting}
              className="btn-primary self-end"
            >
              {submitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                "Send"
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Answer as you would in a real interview. Be specific and use examples.
          </p>
        </div>
      )}
    </div>
  );
}
