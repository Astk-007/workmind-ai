
"use client";

import { useEffect, useState } from "react";

const scenarios = [
  {
    title: "Urgent Project",
    category: "TEAMWORK",
    question:
      "A teammate has missed an important deadline, and your team must submit the project today. What would you do?",
  },
  {
    title: "Team Conflict",
    category: "COMMUNICATION",
    question:
      "Two colleagues strongly disagree about how to complete a task. Their disagreement is delaying the project. How would you handle it?",
  },
  {
    title: "Competing Priorities",
    category: "DECISION-MAKING",
    question:
      "You have three important tasks due today. How would you prioritise them and communicate your plan?",
  },
];

const competencyLabels = [
  { key: "communication", label: "Communication" },
  { key: "teamwork", label: "Teamwork" },
  { key: "leadership", label: "Leadership" },
  { key: "decisionMaking", label: "Decision-making" },
  { key: "problemSolving", label: "Problem-solving" },
  { key: "conflictResolution", label: "Conflict resolution" },
] as const;

type CompetencyKey = (typeof competencyLabels)[number]["key"];
type EvidenceStatus = "evidence_supported" | "insufficient_evidence";

type EvidenceItem = {
  competency: CompetencyKey;
  snippet: string;
  rationale: string;
};

type AssessmentData = {
  status: "complete" | "needs_follow_up";
  followUpQuestion: string | null;
  scores: Record<CompetencyKey, number | null>;
  competencyStatus: Record<CompetencyKey, EvidenceStatus>;
  evidence: EvidenceItem[];
  strengths: string[];
  growthAreas: string[];
  recommendedInterventions: string[];
};

type HistoryItem = {
  id: number;
  scenarioTitle: string;
  answer: string;
  date: string;
  assessment: AssessmentData;
};

const STORAGE_KEY = "workmind-assessment-history";

function isValidScore(score: unknown): score is number {
  return (
    typeof score === "number" &&
    Number.isInteger(score) &&
    score >= 1 &&
    score <= 10
  );
}

function getAverage(scores: Record<string, number | null | undefined>) {
  const validScores = Object.values(scores).filter(isValidScore);

  if (!validScores.length) return 0;

  return (
    validScores.reduce((total, score) => total + score, 0) /
    validScores.length
  );
}

function normalizeAssessment(data: any): AssessmentData {
  if (!data || typeof data !== "object" || !data.scores) {
    throw new Error("The AI returned an invalid assessment. Please retry.");
  }

  const scores = {} as AssessmentData["scores"];
  const competencyStatus = {} as AssessmentData["competencyStatus"];

  for (const competency of competencyLabels) {
    const key = competency.key;
    const score = data.scores[key];
    const status = data.competencyStatus?.[key];

    if (status === "evidence_supported" && isValidScore(score)) {
      scores[key] = score;
      competencyStatus[key] = "evidence_supported";
    } else {
      scores[key] = null;
      competencyStatus[key] = "insufficient_evidence";
    }
  }

  const evidence: EvidenceItem[] = Array.isArray(data.evidence)
    ? data.evidence.filter(
        (item: any) =>
          item &&
          competencyLabels.some((c) => c.key === item.competency) &&
          typeof item.snippet === "string" &&
          typeof item.rationale === "string"
      )
    : [];

  return {
    status: data.status === "needs_follow_up" ? "needs_follow_up" : "complete",
    followUpQuestion:
      typeof data.followUpQuestion === "string"
        ? data.followUpQuestion
        : null,
    scores,
    competencyStatus,
    evidence,
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    growthAreas: Array.isArray(data.growthAreas) ? data.growthAreas : [],
    recommendedInterventions: Array.isArray(data.recommendedInterventions)
      ? data.recommendedInterventions
      : [],
  };
}

function normalizeHistoryItem(item: any): HistoryItem | null {
  if (
    !item ||
    typeof item !== "object" ||
    !item.assessment ||
    typeof item.scenarioTitle !== "string"
  ) {
    return null;
  }

  const oldScores = item.assessment.scores ?? {};
  const scores = {} as AssessmentData["scores"];
  const competencyStatus = {} as AssessmentData["competencyStatus"];

  for (const competency of competencyLabels) {
    const key = competency.key;
    const score = oldScores[key];

    // Older saved assessments used five numeric scores and had no
    // evidence status. Preserve those scores for backward compatibility.
    scores[key] = isValidScore(score) ? score : null;
    competencyStatus[key] = isValidScore(score)
      ? "evidence_supported"
      : "insufficient_evidence";
  }

  return {
    id: typeof item.id === "number" ? item.id : Date.now(),
    scenarioTitle: item.scenarioTitle,
    answer: typeof item.answer === "string" ? item.answer : "",
    date: typeof item.date === "string" ? item.date : new Date().toISOString(),
    assessment: {
      status: "complete",
      followUpQuestion: null,
      scores,
      competencyStatus,
      evidence: Array.isArray(item.assessment.evidence)
        ? item.assessment.evidence
        : [],
      strengths: Array.isArray(item.assessment.strengths)
        ? item.assessment.strengths
        : [],
      growthAreas: Array.isArray(item.assessment.growthAreas)
        ? item.assessment.growthAreas
        : [],
      recommendedInterventions: Array.isArray(
        item.assessment.recommendedInterventions
      )
        ? item.assessment.recommendedInterventions
        : [],
    },
  };
}

export default function Home() {
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [originalAnswer, setOriginalAnswer] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"assessment" | "dashboard">(
    "assessment"
  );

  const scenario = scenarios[selected];
  const isFollowingUp = followUpQuestion !== null;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setHistory(
            parsed
              .map(normalizeHistoryItem)
              .filter((item): item is HistoryItem => item !== null)
          );
        }
      }
    } catch {
      console.error("Could not load saved assessment history.");
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      setError(
        "Your browser could not save assessment history. Check available storage."
      );
    }
  }, [history, historyLoaded]);

  function saveCompletedAssessment(
    data: AssessmentData,
    fullAnswer: string
  ) {
    const newRecord: HistoryItem = {
      id: Date.now(),
      scenarioTitle: scenario.title,
      answer: fullAnswer,
      date: new Date().toISOString(),
      assessment: data,
    };

    setHistory((previous) => [newRecord, ...previous].slice(0, 100));
  }

  async function handleSubmit() {
    if (loading) return;

    const submittedAnswer = isFollowingUp ? followUpAnswer : answer;

    if (!submittedAnswer.trim()) return;

    setLoading(true);
    setError("");

    try {
      const payload = isFollowingUp
        ? {
            scenario: scenario.question,
            answer: followUpAnswer.trim(),
            stage: "follow_up",
            previousAnswer: originalAnswer,
            followUpQuestion,
          }
        : {
            scenario: scenario.question,
            answer: answer.trim(),
            stage: "initial",
          };

      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Assessment failed. Please try again."
        );
      }

      const data = normalizeAssessment(result.data);

      if (!isFollowingUp && data.status === "needs_follow_up") {
        if (!data.followUpQuestion?.trim()) {
          throw new Error("A follow-up question was missing. Please retry.");
        }

        setOriginalAnswer(answer.trim());
        setFollowUpQuestion(data.followUpQuestion);
        setFollowUpAnswer("");
        setAssessment(null);
        return;
      }

      const finalAnswer = isFollowingUp
        ? `${originalAnswer}\n\nFollow-up question: ${followUpQuestion}\nFollow-up answer: ${followUpAnswer.trim()}`
        : answer.trim();

      setAssessment(data);
      setFollowUpQuestion(null);
      setFollowUpAnswer("");
      saveCompletedAssessment(data, finalAnswer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the assessment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function chooseScenario(index: number) {
    if (loading) return;

    setSelected(index);
    setAnswer("");
    setFollowUpAnswer("");
    setOriginalAnswer("");
    setFollowUpQuestion(null);
    setAssessment(null);
    setError("");
    setActiveTab("assessment");
  }

  function clearHistory() {
    if (
      window.confirm(
        "Delete all saved assessment history? This cannot be undone."
      )
    ) {
      setHistory([]);
    }
  }

  function startNewAnswer() {
    setAssessment(null);
    setError("");
    setFollowUpQuestion(null);
    setFollowUpAnswer("");
    setOriginalAnswer("");
  }

  const completedCount = history.length;

  const allScores = history.map((item) => getAverage(item.assessment.scores));
  const assessmentsWithScores = allScores.filter((score) => score > 0);

  const averageOverall = assessmentsWithScores.length
    ? assessmentsWithScores.reduce((total, score) => total + score, 0) /
      assessmentsWithScores.length
    : 0;

  const competencyAverages = competencyLabels.map((competency) => {
    const scores = history
      .map((item) => item.assessment?.scores?.[competency.key])
      .filter(isValidScore);

    const average = scores.length
      ? scores.reduce((total, score) => total + score, 0) / scores.length
      : 0;

    return { ...competency, average, count: scores.length };
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              WorkMind <span className="text-cyan-400">AI</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Evidence-Driven Workplace Development
            </p>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300">
            ADAPTIVE ASSESSMENT MVP
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <nav className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab("assessment")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "assessment"
                ? "bg-cyan-400 text-slate-950"
                : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
            }`}
          >
            ✦ New Assessment
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "dashboard"
                ? "bg-cyan-400 text-slate-950"
                : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
            }`}
          >
            ▦ Analytics Dashboard
          </button>
        </nav>

        {activeTab === "dashboard" ? (
          <section className="space-y-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
                WORKMIND ANALYTICS
              </p>
              <h2 className="mt-2 text-3xl font-bold">Assessment Dashboard</h2>
              <p className="mt-2 text-slate-400">
                Saved developmental assessments and evidence-supported scores.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-6">
                <p className="text-sm text-slate-400">Completed Assessments</p>
                <p className="mt-3 text-4xl font-bold text-cyan-300">
                  {completedCount}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Saved in this browser
                </p>
              </div>
              <div className="rounded-2xl border border-violet-400/20 bg-slate-900/70 p-6">
                <p className="text-sm text-slate-400">
                  Average Supported Score
                </p>
                <p className="mt-3 text-4xl font-bold text-violet-300">
                  {assessmentsWithScores.length
                    ? `${averageOverall.toFixed(1)}/10`
                    : "—"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Unsupported competencies are excluded
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-slate-900/70 p-6">
                <p className="text-sm text-slate-400">Scenarios Available</p>
                <p className="mt-3 text-4xl font-bold text-emerald-300">
                  {scenarios.length}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Workplace situations to practise
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
              <h3 className="text-xl font-bold">Competency Analytics</h3>
              <p className="mt-2 text-sm text-slate-400">
                Average of available, evidence-supported scores only.
              </p>

              <div className="mt-8 space-y-6">
                {competencyAverages.map((item) => (
                  <div key={item.key}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm font-bold text-cyan-300">
                        {item.count ? `${item.average.toFixed(1)}/10` : "—"}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                        style={{ width: `${(item.average / 10) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Based on {item.count} supported score
                      {item.count === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>

              {completedCount === 0 && (
                <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  Complete your first assessment to see analytics.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Assessment History</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Your recent completed assessments.
                  </p>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-300 hover:bg-red-400/10"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-lg font-semibold">No assessments saved yet</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Complete a scenario to build your history.
                  </p>
                  <button
                    onClick={() => setActiveTab("assessment")}
                    className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                  >
                    Start Assessment
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">{item.scenarioTitle}</h4>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(item.date).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-lg bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-300">
                          {getAverage(item.assessment.scores)
                            ? `${getAverage(item.assessment.scores).toFixed(1)}/10`
                            : "No supported scores"}
                        </span>
                      </div>
                      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-400">
                        {item.answer}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {competencyLabels.map((competency) => {
                          const score =
                            item.assessment.scores?.[competency.key];
                          return (
                            <div
                              key={competency.key}
                              className="rounded-lg bg-slate-950/70 p-3"
                            >
                              <p className="text-xs text-slate-500">
                                {competency.label}
                              </p>
                              <p className="mt-1 font-bold text-slate-200">
                                {isValidScore(score) ? `${score}/10` : "Insufficient evidence"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs leading-5 text-slate-500">
              History is stored locally in this browser. AI-generated feedback
              is indicative and intended for development, not employment decisions.
            </p>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <aside>
              <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-slate-500">
                ASSESSMENT SCENARIOS
              </p>
              <div className="space-y-3">
                {scenarios.map((item, index) => (
                  <button
                    key={item.title}
                    onClick={() => chooseScenario(index)}
                    disabled={loading}
                    aria-pressed={selected === index}
                    className={`w-full rounded-xl border p-4 text-left transition disabled:opacity-60 ${
                      selected === index
                        ? "border-cyan-400/60 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="text-xs text-slate-500">
                      SCENARIO 0{index + 1}
                    </span>
                    <p className="mt-2 font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.category}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium">Assessment progress</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{
                      width: assessment
                        ? "100%"
                        : isFollowingUp
                          ? "70%"
                          : answer.trim()
                            ? "35%"
                            : "0%",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {loading
                    ? "AI assessment in progress..."
                    : assessment
                      ? "Assessment completed"
                      : isFollowingUp
                        ? "One targeted follow-up requested"
                        : answer.trim()
                          ? "Response ready for assessment"
                          : "Waiting for your response"}
                </p>
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs text-slate-500">SAVED ASSESSMENTS</p>
                  <p className="mt-1 text-2xl font-bold text-cyan-300">
                    {completedCount}
                  </p>
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className="mt-2 text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    View dashboard →
                  </button>
                </div>
              </div>
            </aside>

            <div className="min-w-0 space-y-8">
              <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 sm:p-9">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-violet-400/10 px-3 py-1.5 text-xs text-violet-300">
                    EVIDENCE-DRIVEN ASSESSMENT
                  </span>
                  <span className="text-sm text-slate-400">
                    Question {selected + 1} of {scenarios.length}
                  </span>
                </div>

                <h2 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
                  How would you respond?
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  {scenario.question}
                </p>

                <label htmlFor="answer" className="mt-8 block text-sm font-semibold">
                  Your response
                </label>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    setAssessment(null);
                    setFollowUpQuestion(null);
                    setFollowUpAnswer("");
                    setOriginalAnswer("");
                    setError("");
                  }}
                  placeholder="Explain the steps you would take and why..."
                  rows={7}
                  maxLength={5000}
                  disabled={loading || isFollowingUp}
                  className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-slate-950 p-4 leading-7 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400 disabled:opacity-60"
                />
                <div className="mt-2 flex justify-between gap-3 text-xs text-slate-500">
                  <span>Be specific. Describe actions and reasoning.</span>
                  <span>{answer.length}/5000</span>
                </div>

                {isFollowingUp && (
                  <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-5">
                    <p className="text-xs font-semibold tracking-[0.15em] text-amber-300">
                      ONE TARGETED FOLLOW-UP
                    </p>
                    <h3 className="mt-2 text-lg font-bold">
                      Could you provide more detail?
                    </h3>
                    <p className="mt-3 leading-7 text-slate-200">
                      {followUpQuestion}
                    </p>
                    <label
                      htmlFor="follow-up-answer"
                      className="mt-5 block text-sm font-semibold"
                    >
                      Your follow-up answer
                    </label>
                    <textarea
                      id="follow-up-answer"
                      value={followUpAnswer}
                      onChange={(event) => {
                        setFollowUpAnswer(event.target.value);
                        setError("");
                      }}
                      placeholder="Add a specific example, action, or explanation..."
                      rows={5}
                      maxLength={5000}
                      disabled={loading}
                      className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-slate-950 p-4 leading-7 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400 disabled:opacity-60"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Your original answer will be retained and assessed together
                      with this response.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    (isFollowingUp ? !followUpAnswer.trim() : !answer.trim())
                  }
                  className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {loading
                    ? "Analysing your response..."
                    : isFollowingUp
                      ? "Submit Follow-up →"
                      : "Assess Response →"}
                </button>

                {isFollowingUp && !loading && (
                  <button
                    onClick={() => {
                      setFollowUpQuestion(null);
                      setFollowUpAnswer("");
                      setOriginalAnswer("");
                      setError("");
                    }}
                    className="ml-3 mt-6 rounded-xl border border-white/10 px-5 py-4 text-sm font-semibold text-slate-300 hover:bg-white/[0.05]"
                  >
                    Cancel Follow-up
                  </button>
                )}

                {loading && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4"
                  >
                    <p className="font-medium text-cyan-300">
                      <span className="mr-2 inline-block animate-spin">◌</span>
                      Gemini AI is reviewing the evidence
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      This can take a little time. Please keep this page open.
                    </p>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4"
                  >
                    <h3 className="font-semibold text-red-300">
                      Assessment could not be completed
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {error}
                    </p>
                    <button
                      onClick={handleSubmit}
                      disabled={
                        loading ||
                        (isFollowingUp
                          ? !followUpAnswer.trim()
                          : !answer.trim())
                      }
                      className="mt-3 rounded-lg border border-red-300/30 px-4 py-2 text-sm text-red-200 hover:bg-red-400/10 disabled:opacity-50"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </section>

              {assessment && (
                <section
                  aria-live="polite"
                  className="space-y-6"
                  id="assessment-results"
                >
                  <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-6 sm:p-8">
                    <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
                      GEMINI AI ANALYSIS
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      Your assessment results
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Each score below must be supported by observable evidence.
                    </p>

                    <div className="mt-8 space-y-6">
                      {competencyLabels.map((item) => {
                        const score = assessment.scores[item.key];
                        const supported =
                          assessment.competencyStatus[item.key] ===
                            "evidence_supported" && isValidScore(score);

                        return (
                          <div key={item.key}>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                              <span className="text-sm font-medium text-slate-200">
                                {item.label}
                              </span>
                              {supported ? (
                                <span className="text-sm font-bold text-cyan-300">
                                  {score}/10 · Evidence supported
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-amber-300">
                                  Insufficient evidence
                                </span>
                              )}
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                                style={{
                                  width: supported ? `${(score / 10) * 100}%` : "0%",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
                    <h3 className="text-xl font-bold">Evidence and Rationale</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      These snippets are the stated basis for the competency feedback.
                    </p>

                    {assessment.evidence.length ? (
                      <div className="mt-5 space-y-4">
                        {assessment.evidence.map((item, index) => {
                          const label =
                            competencyLabels.find(
                              (competency) => competency.key === item.competency
                            )?.label ?? item.competency;

                          return (
                            <article
                              key={`${item.competency}-${index}`}
                              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                            >
                              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                                {label}
                              </p>
                              <blockquote className="mt-3 border-l-2 border-cyan-400/60 pl-4 text-sm italic leading-6 text-slate-200">
                                “{item.snippet}”
                              </blockquote>
                              <p className="mt-3 text-sm leading-6 text-slate-400">
                                <strong className="text-slate-300">
                                  Why it matters:
                                </strong>{" "}
                                {item.rationale}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200">
                        No specific evidence snippets were returned. Interpret
                        any feedback cautiously.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-400/20 bg-slate-900/70 p-6">
                      <h3 className="text-lg font-bold text-emerald-300">
                        Strengths
                      </h3>
                      {assessment.strengths.length ? (
                        <ul className="mt-5 space-y-3">
                          {assessment.strengths.map((item, index) => (
                            <li
                              key={`${index}-${item}`}
                              className="flex gap-3 text-sm leading-6 text-slate-300"
                            >
                              <span className="text-emerald-300">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm text-slate-400">
                          No evidence-backed strengths identified.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-amber-400/20 bg-slate-900/70 p-6">
                      <h3 className="text-lg font-bold text-amber-300">
                        Growth Areas
                      </h3>
                      {assessment.growthAreas.length ? (
                        <ul className="mt-5 space-y-3">
                          {assessment.growthAreas.map((item, index) => (
                            <li
                              key={`${index}-${item}`}
                              className="flex gap-3 text-sm leading-6 text-slate-300"
                            >
                              <span className="text-amber-300">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm text-slate-400">
                          No specific growth areas identified.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-violet-400/20 bg-slate-900/70 p-6 sm:p-8">
                    <p className="text-xs font-semibold tracking-[0.2em] text-violet-300">
                      PERSONAL DEVELOPMENT
                    </p>
                    <h3 className="mt-2 text-xl font-bold">
                      Recommended Training
                    </h3>
                    {assessment.recommendedInterventions.length ? (
                      <ul className="mt-5 space-y-3">
                        {assessment.recommendedInterventions.map(
                          (item, index) => (
                            <li
                              key={`${index}-${item}`}
                              className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 font-semibold text-violet-300">
                                {index + 1}
                              </span>
                              <span>{item}</span>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p className="mt-4 text-sm text-slate-400">
                        No specific training recommendations returned.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-slate-400">
                    <strong className="text-slate-300">
                      Developmental feedback only.
                    </strong>{" "}
                    This prototype is not a validated employment assessment.
                    Results should not be used alone for hiring, promotion, pay,
                    or disciplinary decisions.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={startNewAnswer}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.05]"
                    >
                      Try Another Answer
                    </button>
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                    >
                      View Analytics →
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 px-6 py-5 text-center text-xs leading-5 text-slate-500">
        WorkMind AI · Evidence-driven employee development · Human review required.
      </footer>
    </main>
  );
}
