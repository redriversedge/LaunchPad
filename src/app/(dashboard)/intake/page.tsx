"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiThinking } from "@/components/shared/loading-spinner";

interface IntakeQuestion {
  id: string;
  text: string;
  type: "text" | "select" | "multiselect";
  options?: string[];
}

export default function IntakePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [allAnswers, setAllAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [round, setRound] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      const res = await fetch("/api/intake");
      const data = await res.json();

      if (data.complete) {
        setComplete(true);
        setMessage(data.message || "Your intake is already complete!");
      } else if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        // Ensure every question has a valid id
        const normalized = data.questions.map((q: IntakeQuestion, i: number) => ({
          ...q,
          id: q.id || `q_${round}_${i}`,
          type: q.type || "text",
        }));
        setQuestions(normalized);
        setMessage(data.message || "");
        setAnswers({});
      } else {
        setComplete(true);
        setMessage(data.message || "Your profile looks good!");
      }
    } catch {
      setError("Failed to load questions. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      setError("Please answer all questions before continuing.");
      return;
    }

    setSubmitting(true);
    setError("");

    const mergedAnswers = { ...allAnswers, ...answers };
    setAllAnswers(mergedAnswers);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: mergedAnswers,
          requestFollowUp: round < 3,
        }),
      });

      const data = await res.json();

      if (data.complete || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        setComplete(true);
        setMessage(data.message || "Your profile is all set!");
      } else {
        const nextRound = round + 1;
        const normalized = data.questions.map((q: IntakeQuestion, i: number) => ({
          ...q,
          id: q.id || `q_${nextRound}_${i}`,
          type: q.type || "text",
        }));
        setQuestions(normalized);
        setMessage(data.message || "");
        setAnswers({});
        setRound(nextRound);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    const mergedAnswers = { ...allAnswers, ...answers };
    try {
      await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: mergedAnswers, requestFollowUp: false }),
      });
    } catch {
      // Continue anyway
    }
    setComplete(true);
    setMessage("Intake complete! Your profile has been updated.");
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <AiThinking message="Preparing your intake questions..." />
      </div>
    );
  }

  if (complete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2 dark:text-white">Intake Complete</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push("/profile")} className="btn-primary">
            View Your Profile
          </button>
          <button onClick={() => router.push("/jobs")} className="btn-secondary">
            Search Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Let&apos;s Get to Know You</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Round {round} of your intake interview. The more detail you share, the better your job matches will be.
        </p>
      </div>

      {message && (
        <div className="p-4 bg-brand-50 rounded-lg border border-brand-100 text-sm text-brand-800 dark:bg-brand-950 dark:border-brand-800 dark:text-brand-200">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {submitting ? (
        <AiThinking message="Processing your answers and generating follow-up questions..." />
      ) : (
        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={`${q.id}-${round}-${idx}`} className="card p-4">
              <label className="block font-medium text-sm mb-2 dark:text-gray-200">{q.text}</label>
              {q.type === "text" && (
                <textarea
                  rows={3}
                  className="input-field"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswers((prev) => ({ ...prev, [q.id]: val }));
                  }}
                  placeholder="Type your answer here..."
                />
              )}
              {q.type === "select" && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`${q.id}-${round}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        className="text-brand-600"
                      />
                      <span className="text-sm dark:text-gray-300">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === "multiselect" && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = (answers[q.id] || "").split(", ").filter(Boolean);
                    const isChecked = selected.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked
                              ? selected.filter((s) => s !== opt)
                              : [...selected, opt];
                            setAnswers((prev) => ({ ...prev, [q.id]: updated.join(", ") }));
                          }}
                          className="text-brand-600"
                        />
                        <span className="text-sm dark:text-gray-300">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              {round < 3 ? "Submit & Continue" : "Finish Intake"}
            </button>
            {round > 1 && (
              <button onClick={handleSkip} className="btn-secondary">
                Skip, I&apos;m done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
