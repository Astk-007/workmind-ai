
"use client";

import { useState } from "react";

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

export default function Home() {
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const scenario = scenarios[selected];

  function handleSubmit() {
    if (!answer.trim()) return;
    setSubmitted(true);
  }

  function chooseScenario(index: number) {
    setSelected(index);
    setAnswer("");
    setSubmitted(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              WorkMind <span className="text-cyan-400">AI</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Workplace Behaviour Assessment
            </p>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300">
            MVP PREVIEW
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[260px_1fr]">
        <aside>
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-slate-500">
            ASSESSMENT SCENARIOS
          </p>

          <div className="space-y-3">
            {scenarios.map((item, index) => (
              <button
                key={item.title}
                onClick={() => chooseScenario(index)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selected === index
                    ? "border-cyan-400/60 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                }`}
              >
                <span className="text-xs text-slate-500">
                  SCENARIO 0{index + 1}
                </span>
                <p className="mt-2 font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.category}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium">Assessment progress</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all"
                style={{ width: submitted ? "100%" : "50%" }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {submitted ? "Response submitted" : "One response in progress"}
            </p>
          </div>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-violet-400/10 px-3 py-1.5 text-xs text-violet-300">
              SITUATIONAL JUDGEMENT TEST
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

          <label
            htmlFor="answer"
            className="mt-8 block text-sm font-semibold"
          >
            Your response
          </label>

          <textarea
            id="answer"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setSubmitted(false);
            }}
            placeholder="Explain the steps you would take and why..."
            rows={7}
            maxLength={5000}
            className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-slate-950 p-4 leading-7 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />

          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Be specific and explain your reasoning.</span>
            <span>{answer.length}/5000</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            Submit Response →
          </button>

          {submitted && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5"
            >
              <h3 className="font-semibold text-emerald-300">
                Response captured successfully!
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Your answer is ready for AI assessment. Gemini integration
                is our next step; this preview does not generate an AI score yet.
              </p>
            </div>
          )}
        </section>
      </div>

      <footer className="border-t border-white/10 px-6 py-5 text-center text-xs leading-5 text-slate-500">
        WorkMind AI · Designed for employee development ·
        Assessment results require human review.
      </footer>
    </main>
  );
}