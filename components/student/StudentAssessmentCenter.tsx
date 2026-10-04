"use client";

import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { useMemo, useState } from "react";
import { apiMutate, useApiResource } from "@/lib/useApi";
import type { Assessment, AssessmentAttempt } from "@/lib/assessmentTypes";
import type { Student } from "@/lib/types";
import { ArrowLeft, Code2, FileCode2, ListChecks } from "lucide-react";

export function StudentAssessmentCenter({ student, compact = false }: { student: Student; compact?: boolean }) {
  const { data: assessmentRows, loading: assessmentsLoading, error: assessmentsError } = useApiResource<Assessment[]>("assessments", {}, { fallback: [] });
  const { data: attemptRows, refetch: refetchAttempts } = useApiResource<AssessmentAttempt[]>("assessment_attempts", {}, { fallback: [] });
  const assessments = assessmentRows ?? [];
  const attempts = attemptRows ?? [];
  const [activeId, setActiveId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const published = useMemo(() => assessments.filter((assessment) => assessment.status === "Published"), [assessments]);
  const activeAssessment = published.find((assessment) => assessment.id === activeId);
  const studentAttempts = attempts.filter((attempt) => attempt.studentId === student.id);

  function start(assessment: Assessment) {
    setActiveId(assessment.id);
    setAnswers(Object.fromEntries(assessment.questions.map((question) => [question.id, question.starterCode ?? ""])));
    setMessage("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!activeAssessment) return;
    if (activeAssessment.questions.some((question) => !answers[question.id]?.trim())) {
      setMessage("Answer every question before submitting.");
      return;
    }
    try {
      const attempt = await apiMutate<{ mcqScore: number; mcqTotal: number }>("POST", "assessment_attempts", { assessment_id: activeAssessment.id, answers });
      await refetchAttempts();
      setMessage(`Submitted. MCQ result: ${attempt.mcqScore}/${attempt.mcqTotal}. Coding answers are saved for admin review.`);
      setActiveId(""); setAnswers({});
    } catch (submitError) { setMessage(submitError instanceof Error ? submitError.message : "Could not submit this assessment."); }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Published quizzes & assessments</h3></div>
      <p className="mt-1 text-xs leading-5 text-slate-500">Take quizzes published by the placement office. Coding submissions are saved for review and are not auto-graded.</p>

      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}
      {assessmentsError ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{assessmentsError}</p> : assessmentsLoading ? <DataSkeleton label="Loading assessments…" className="mt-4" /> : activeAssessment ? (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><h4 className="font-bold text-slate-900">{activeAssessment.title}</h4><p className="mt-1 text-xs text-slate-500">{activeAssessment.description || "Assessment"} · {activeAssessment.durationMinutes} minutes · {activeAssessment.questions.length} questions</p></div><button type="button" onClick={() => setActiveId("")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"><ArrowLeft className="h-3.5 w-3.5"/>Back</button></div>
          {activeAssessment.questions.map((question, index) => (
            <fieldset key={question.id} className="rounded-xl border border-slate-100 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-800">{index + 1}. {question.prompt}</legend>
              {question.kind === "mcq" ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{question.choices?.map((choice, choiceIndex) => <label key={`${question.id}-${choiceIndex}`} className={`cursor-pointer rounded-lg border p-3 text-xs ${answers[question.id] === String(choiceIndex) ? "border-red-300 bg-red-50 text-red-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><input required type="radio" name={question.id} value={choiceIndex} checked={answers[question.id] === String(choiceIndex)} onChange={() => setAnswers((current) => ({ ...current, [question.id]: String(choiceIndex) }))} className="sr-only"/>{choice}</label>)}</div> : <div className="mt-3"><div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-red-700"><Code2 className="h-3.5 w-3.5"/>Code submission</div><textarea required value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} rows={10} spellCheck={false} placeholder="Write your solution here" className="w-full rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-5 text-emerald-100"/></div>}
            </fieldset>
          ))}
          {message && <p role="alert" className="text-xs text-rose-700">{message}</p>}
          <button type="submit" className="rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700">Submit assessment</button>
        </form>
      ) : published.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><FileCode2 className="mx-auto h-6 w-6 text-slate-400"/><p className="mt-2 text-sm font-semibold text-slate-700">No quiz available</p><p className="mt-1 text-xs text-slate-500">Published assessments from the placement office will appear here.</p></div>
      ) : (
        <div className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-2" : "lg:grid-cols-2"}`}>
          {published.map((assessment) => {
            const previousAttempts = studentAttempts.filter((attempt) => attempt.assessmentId === assessment.id);
            return <article key={assessment.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-slate-900">{assessment.title}</h4><p className="mt-1 text-xs text-slate-500">{assessment.description || assessment.type || "Assessment"}</p></div><span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">{assessment.questions.length} questions</span></div><p className="mt-3 text-[10px] text-slate-500">{assessment.durationMinutes} min · {assessment.questions.filter((question) => question.kind === "mcq").length} MCQ · {assessment.questions.filter((question) => question.kind === "coding").length} coding</p><button onClick={() => start(assessment)} className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{previousAttempts.length ? "Take again" : "Start assessment"}</button>{previousAttempts.length > 0 && <p className="mt-2 text-[10px] text-slate-500">{previousAttempts.length} attempt{previousAttempts.length === 1 ? "" : "s"} submitted</p>}</article>;
          })}
        </div>
      )}
    </section>
  );
}
