"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner, AiThinking } from "@/components/shared/loading-spinner";
import type { PrepPackage, CompanyResearch } from "@/lib/ai/schemas/prep-package";

type TabKey = "research" | "star" | "questions" | "talking" | "redflags";

interface PrepData {
  id: string;
  companyResearch: CompanyResearch | null;
  prepPackage: PrepPackage | null;
  createdAt: string;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "research", label: "Company Research" },
  { key: "star", label: "STAR Answers" },
  { key: "questions", label: "Questions to Ask" },
  { key: "talking", label: "Talking Points" },
  { key: "redflags", label: "Red Flags" },
];

export default function InterviewPrepPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;

  const [prep, setPrep] = useState<PrepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("research");
  const [error, setError] = useState<string | null>(null);

  const fetchPrep = useCallback(async () => {
    try {
      const res = await fetch(`/api/interview-prep/${applicationId}`);
      const data = await res.json();
      if (res.ok && data.prep) {
        setPrep(data.prep);
      }
    } catch {
      // Prep not found, that's fine
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchPrep();
  }, [fetchPrep]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview-prep/${applicationId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setPrep(data.prep);
      } else {
        setError(data.error || "Failed to generate prep package");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!prep && !generating) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back
        </button>
        <div className="card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold">Interview Prep</h1>
          <p className="text-gray-600">
            Generate a comprehensive prep package with STAR answers, company
            research, questions to ask, salary talking points, and red flags to
            address.
          </p>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button onClick={handleGenerate} className="btn-primary">
            Generate Prep Package
          </button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <AiThinking message="Building your interview prep package. This takes 30-60 seconds as we research the company and craft personalized answers..." />
      </div>
    );
  }

  const pkg = prep?.prepPackage;
  const research = prep?.companyResearch;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back
        </button>
        <button
          onClick={() => router.push(`/interview-prep/mock/${prep?.id}`)}
          className="btn-primary text-sm"
        >
          Start Mock Interview
        </button>
      </div>

      <h1 className="text-2xl font-bold">Interview Prep</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "research" && research && (
          <CompanyResearchTab research={research} />
        )}
        {activeTab === "star" && pkg && <StarAnswersTab answers={pkg.starAnswers} />}
        {activeTab === "questions" && pkg && (
          <QuestionsTab questions={pkg.questionsToAsk} />
        )}
        {activeTab === "talking" && pkg && (
          <TalkingPointsTab
            salary={pkg.salaryTalking}
            themes={pkg.keyThemes}
          />
        )}
        {activeTab === "redflags" && pkg && (
          <RedFlagsTab flags={pkg.redFlags} />
        )}
      </div>
    </div>
  );
}

function CompanyResearchTab({ research }: { research: CompanyResearch }) {
  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h2 className="font-semibold mb-3">Overview</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {research.overview}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">Mission and Values</h2>
        <p className="text-sm text-gray-700 mb-3">{research.missionAndValues.mission}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {research.missionAndValues.coreValues.map((v, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-brand-50 text-brand-700 text-xs rounded-full"
            >
              {v}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-600">{research.missionAndValues.howTheyLiveIt}</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">Culture</h2>
        <p className="text-sm text-gray-700 mb-3">{research.culture.workStyle}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-green-700 mb-2">Positives</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {research.culture.positives.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-500 flex-shrink-0">+</span> {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-700 mb-2">Concerns</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {research.culture.concerns.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">!</span> {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3 italic">
          {research.culture.glassdoorSentiment}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">Growth Trajectory</h2>
        <p className="text-sm font-medium text-gray-800 mb-2">
          {research.growth.trajectory}
        </p>
        <ul className="text-sm text-gray-700 space-y-1 mb-3">
          {research.growth.recentMoves.map((m, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gray-400 flex-shrink-0">-</span> {m}
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-600">{research.growth.outlook}</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">Interview Style</h2>
        <p className="text-sm text-gray-700 mb-3">
          {research.interviewStyle.reputation}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {research.interviewStyle.commonFormats.map((f, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              {f}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          {research.interviewStyle.tipsFromReputation}
        </p>
      </div>

      {research.talkingPoints.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Talking Points to Impress</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            {research.talkingPoints.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand-500 flex-shrink-0 font-bold">
                  {i + 1}.
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StarAnswersTab({
  answers,
}: {
  answers: PrepPackage["starAnswers"];
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Five STAR-method answers crafted from your real experience. Practice these out loud.
      </p>
      {answers.map((answer, i) => (
        <div key={i} className="card">
          <button
            onClick={() =>
              setExpandedIndex(expandedIndex === i ? null : i)
            }
            className="w-full text-left p-4 flex items-center justify-between"
          >
            <span className="font-medium text-sm pr-4">
              {answer.question}
            </span>
            <span className="text-gray-400 flex-shrink-0 text-xs">
              {expandedIndex === i ? "Collapse" : "Expand"}
            </span>
          </button>
          {expandedIndex === i && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Situation
                </h4>
                <p className="text-sm text-gray-700">{answer.situation}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Task
                </h4>
                <p className="text-sm text-gray-700">{answer.task}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Action
                </h4>
                <p className="text-sm text-gray-700">{answer.action}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Result
                </h4>
                <p className="text-sm text-gray-700">{answer.result}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuestionsTab({
  questions,
}: {
  questions: PrepPackage["questionsToAsk"];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Questions that show genuine insight and interest. Pick 2-3 for the actual interview.
      </p>
      {questions.map((q, i) => (
        <div key={i} className="card p-4">
          <p className="font-medium text-sm">{q.question}</p>
          <p className="text-xs text-gray-500 mt-2">Why this works: {q.why}</p>
        </div>
      ))}
    </div>
  );
}

function TalkingPointsTab({
  salary,
  themes,
}: {
  salary: PrepPackage["salaryTalking"];
  themes: PrepPackage["keyThemes"];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold mb-3">Key Themes to Emphasize</h2>
        <p className="text-sm text-gray-500 mb-3">
          Weave these narratives throughout your interview.
        </p>
        <div className="space-y-3">
          {themes.map((t, i) => (
            <div key={i} className="card p-4">
              <p className="font-medium text-sm">{t.theme}</p>
              <p className="text-sm text-gray-600 mt-2">{t.examples}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Salary Negotiation</h2>
        <p className="text-sm text-gray-500 mb-3">
          Points to have ready when compensation comes up.
        </p>
        <div className="space-y-3">
          {salary.map((s, i) => (
            <div key={i} className="card p-4">
              <p className="font-medium text-sm">{s.point}</p>
              <p className="text-sm text-gray-600 mt-2">{s.context}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RedFlagsTab({ flags }: { flags: PrepPackage["redFlags"] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Potential concerns the interviewer might raise, and how to address them head-on.
      </p>
      {flags.map((f, i) => (
        <div key={i} className="card p-4">
          <div className="flex gap-2 items-start mb-2">
            <span className="text-red-500 flex-shrink-0 text-sm font-bold">
              ?
            </span>
            <p className="font-medium text-sm text-red-800">{f.flag}</p>
          </div>
          <div className="flex gap-2 items-start ml-4">
            <span className="text-green-500 flex-shrink-0 text-sm font-bold">
              &gt;
            </span>
            <p className="text-sm text-gray-700">{f.response}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
