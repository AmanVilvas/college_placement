"use client";

import { useMemo, useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { ASSESSMENTS_STORAGE_KEY, ASSESSMENT_ATTEMPTS_STORAGE_KEY } from "@/lib/assessmentTypes";
import type { Assessment, AssessmentAttempt, AssessmentQuestion } from "@/lib/assessmentTypes";
import { CheckCircle2, Code2, Plus, Send } from "lucide-react";

const emptyChoices = ["", "", "", ""];

export function AssessmentManager() {
  const [assessments, setAssessments, ready] = useLocalStorageState<Assessment[]>(ASSESSMENTS_STORAGE_KEY, []);
  const [attempts] = useLocalStorageState<AssessmentAttempt[]>(ASSESSMENT_ATTEMPTS_STORAGE_KEY, []);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Technical");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [kind, setKind] = useState<AssessmentQuestion["kind"]>("mcq");
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState<string[]>(emptyChoices);
  const [correctChoice, setCorrectChoice] = useState(0);
  const [starterCode, setStarterCode] = useState("function solve(input) {\n  // Write your solution\n}\n");
  const [selectedAttemptId, setSelectedAttemptId] = useState("");
  const [error, setError] = useState("");
  const sortedAttempts = useMemo(() => [...attempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [attempts]);

  function addQuestion() {
    if (!prompt.trim()) { setError("Enter a question prompt first."); return; }
    if (kind === "mcq" && choices.some((choice) => !choice.trim())) { setError("Fill all four MCQ options."); return; }
    const question: AssessmentQuestion = kind === "mcq"
      ? { id: crypto.randomUUID(), kind: "mcq", prompt: prompt.trim(), choices: choices.map((choice) => choice.trim()), correctChoice }
      : { id: crypto.randomUUID(), kind: "coding", prompt: prompt.trim(), starterCode };
    setQuestions((current) => [...current, question]);
    setPrompt(""); setChoices(emptyChoices); setCorrectChoice(0); setError("");
  }

  function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError("Give the assessment a title."); return; }
    if (!questions.length) { setError("Add at least one question before saving."); return; }
    const assessment: Assessment = {
      id: crypto.randomUUID(), title: title.trim(), type, description: description.trim(),
      durationMinutes: Math.max(1, durationMinutes), status: "Draft", questions,
      createdAt: new Date().toISOString(),
    };
    setAssessments((current) => [assessment, ...current]);
    setTitle(""); setDescription(""); setDurationMinutes(30); setQuestions([]); setError("");
  }

  function togglePublished(assessment: Assessment) {
    const nextStatus = assessment.status === "Published" ? "Draft" : "Published";
    setAssessments((current) => current.map((item) => item.id === assessment.id
      ? { ...item, status: nextStatus, publishedAt: nextStatus === "Published" ? new Date().toISOString() : undefined }
      : item));
  }

  const selectedAttempt = sortedAttempts.find((attempt) => attempt.id === selectedAttemptId);
  const selectedAssessment = selectedAttempt && assessments.find((assessment) => assessment.id === selectedAttempt.assessmentId);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-600"/><h3 className="font-bold text-slate-900">Quiz & assessment builder</h3></div>
        <p className="mt-1 text-xs leading-5 text-slate-500">Create MCQ and coding questions. Drafts stay hidden from students until published.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. DSA screening quiz" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal"/></label>
          <label className="text-xs font-semibold text-slate-600">Category<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal">{["Technical", "Aptitude", "Logical reasoning", "SQL", "Communication", "Coding challenge"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">Instructions<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Instructions students should see" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal"/></label>
          <label className="text-xs font-semibold text-slate-600">Time limit (minutes)<input type="number" min={1} max={600} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal"/></label>
        </div>

        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-bold text-slate-900">Add a question</h4><p className="mt-0.5 text-[10px] text-slate-500">Questions currently in draft: {questions.length}</p></div><select aria-label="Question type" value={kind} onChange={(event) => setKind(event.target.value as AssessmentQuestion["kind"])} className="rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="mcq">Multiple choice</option><option value="coding">Coding response</option></select></div>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} placeholder={kind === "mcq" ? "Question prompt" : "Coding prompt and problem statement"} className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"/>
          {kind === "mcq" ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{choices.map((choice, index) => <label key={index} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"><input aria-label={`Option ${index + 1} is correct`} type="radio" name="correct-choice" checked={correctChoice === index} onChange={() => setCorrectChoice(index)} className="accent-indigo-600"/><input value={choice} onChange={(event) => setChoices((current) => current.map((item, i) => i === index ? event.target.value : item))} placeholder={`Option ${index + 1} · select radio to mark correct`} className="min-w-0 flex-1 border-0 text-xs outline-none"/></label>)}</div> : <label className="mt-3 block text-xs font-semibold text-slate-600"><span className="flex items-center gap-1"><Code2 className="h-3.5 w-3.5"/>Optional starter code for students</span><textarea value={starterCode} onChange={(event) => setStarterCode(event.target.value)} rows={6} spellCheck={false} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-emerald-100"/></label>}
          <button type="button" onClick={addQuestion} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700"><Plus className="h-3.5 w-3.5"/>Add question</button>
          {questions.length > 0 && <ol className="mt-3 space-y-2">{questions.map((question, index) => <li key={question.id} className="flex items-start gap-2 rounded-lg bg-white p-3 text-xs"><span className="font-bold text-indigo-700">{index + 1}.</span><span className="flex-1 text-slate-700">{question.prompt}<span className="ml-2 text-[10px] text-slate-400">{question.kind === "mcq" ? "MCQ" : "Coding"}</span></span><button type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} className="text-[10px] font-semibold text-rose-600">Remove</button></li>)}</ol>}
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}
        <form onSubmit={saveDraft}><button type="submit" disabled={!title.trim() || questions.length === 0} className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">Save assessment draft</button></form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Assessment library</h3><p className="mt-1 text-xs text-slate-500">Publish a saved assessment to make it available in student Preparation and Assessments tabs.</p>
        {!ready ? <p className="mt-4 text-xs text-slate-500">Loading assessments…</p> : assessments.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No assessments created yet.</p> : <div className="mt-4 space-y-2">{assessments.map((assessment) => <article key={assessment.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-4"><div className="min-w-0 flex-1"><h4 className="text-sm font-bold text-slate-900">{assessment.title}</h4><p className="mt-1 text-xs text-slate-500">{assessment.type} · {assessment.questions.length} questions ({assessment.questions.filter((question) => question.kind === "coding").length} coding) · {assessment.durationMinutes} min</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${assessment.status === "Published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{assessment.status}</span><button type="button" onClick={() => togglePublished(assessment)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">{assessment.status === "Published" ? "Unpublish" : "Publish"}</button></article>)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2"><Send className="h-5 w-5 text-indigo-600"/><h3 className="font-bold text-slate-900">Student submissions</h3></div>
        <p className="mt-1 text-xs text-slate-500">Review submitted answers and source code. MCQ scores are calculated; code is for manual review.</p>
        {sortedAttempts.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No student submissions yet.</p> : <div className="mt-4 space-y-3">{sortedAttempts.map((attempt) => {
          const assessment = assessments.find((item) => item.id === attempt.assessmentId);
          return <details key={attempt.id} className="rounded-xl border border-slate-200 p-4"><summary onClick={() => setSelectedAttemptId(attempt.id)} className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">{attempt.studentName} <span className="font-normal text-slate-500">· {attempt.studentRollNumber}</span></p><p className="mt-1 text-xs text-slate-500">{assessment?.title ?? "Assessment removed"} · {new Date(attempt.submittedAt).toLocaleString()}</p></div><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700">MCQ {attempt.mcqScore}/{attempt.mcqTotal}</span></div></summary><div className="mt-4 space-y-3 border-t border-slate-100 pt-4">{assessment?.questions.map((question, index) => <div key={question.id} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-800">{index + 1}. {question.prompt}</p>{question.kind === "coding" ? <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-xs text-emerald-100">{attempt.answers[question.id] || "No code submitted"}</pre> : <p className="mt-2 text-xs text-slate-600">Answer: {question.choices?.[Number(attempt.answers[question.id])] ?? "No answer"}{Number(attempt.answers[question.id]) === question.correctChoice && <span className="ml-2 font-semibold text-emerald-700">Correct</span>}</p>}</div>)}{!assessment && <p className="text-xs text-rose-600">The question set for this submission is no longer available.</p>}</div></details>;
        })}</div>}
        {selectedAttempt && selectedAssessment && <span className="sr-only">Reviewing {selectedAssessment.title}</span>}
      </section>
      <p className="text-[10px] leading-4 text-slate-400">Demo persistence is browser-local. Code is stored as submitted and is not run in a sandbox.</p>
    </div>
  );
}
