"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiThinking } from "@/components/shared/loading-spinner";
import type { IntakeQuestion, IntakeResponse } from "@/types";

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
      const data: IntakeResponse & { complete?: boolean } = await res.json();

      if (data.complete) {
        setComplete(true);
        setMessage(data.message || "Your intake is already complete!");
      } else {
        setQuestions(data.questions);
        setMessage(data.message);
      }
    } catch {
      setError("Failed to load questions. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    // Check that all questions are answered
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
          requestFollowUp: round < 3, // Allow up to 3 rounds
        }),
      });

      const data: IntakeResponse = await res.json();

      if (data.complete || !data.questions || data.questions.length === 0) {
        setComplete(true);
        setMessage(data.message || "Your profile is all set!");
      } else {
        setQuestions(data.questions);
        setMessage(data.message);
        setAnswers({});
        setRound((r) => r + 1);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
        <h1 className="text-2xl font-bold mb-2">Intake Complete</h1>
        <p className="text-gray-600 mb-6">{message}</p>
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
        <h1 className="text-2xl font-bold">Let&apos;s Get to Know You</h1>
        <p className="text-gray-600 mt-1">
          Round {round} of your intake interview. The more detail you share, the better your job matches will be.
        </p>
      </div>

      {message && (
        <div className="p-4 bg-brand-50 rounded-lg border border-brand-100 text-sm text-brand-800">
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
          {questions.map((q) => (
            <div key={q.id} className="card p-4">
              <label className="block font-medium text-sm mb-2">{q.text}</label>
              {q.type === "text" && (
                <textarea
                  rows={3}
                  className="input-field"
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Type your answer here..."
                />
              )}
              {q.type === "select" && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        className="text-brand-600"
                      />
                      <span className="text-sm">{opt}</span>
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
                        <span className="text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={handleSubmit} className="btn-primary">
              {round < 3 ? "Submit & Continue" : "Finish Intake"}
            </button>
            {round > 1 && (
              <button
                onClick={() => {
                  setAllAnswers((prev) => ({ ...prev, ...answers }));
                  fetch("/api/intake", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ answers: { ...allAnswers, ...answers }, requestFollowUp: false }),
                  }).then(() => {
                    setComplete(true);
                    setMessage("Intake complete! Your profile has been updated.");
                  });
                }}
                className="btn-secondary"
              >
                Skip, I&apos;m done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
