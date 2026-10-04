"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, MicOff, Sparkles } from "lucide-react";

type Mode = "assessment" | "resume" | "resume_review" | "interview" | "coach" | "study_plan" | "tpo";
type ResumeDraft = { headline: string; summary: string; project: string };
type Props = {
  mode: Mode;
  resume?: ResumeDraft;
  targetRole?: string;
  profile?: string;
  context?: string;
  onApplyResume?: (draft: ResumeDraft) => void;
};
type PracticeQuestion = { topic: string; question: string; choices: string[] };
type AIResponse = Record<string, unknown>;
type SpeechResultEvent = { resultIndex?: number; results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

const fieldClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800";
const buttonClass = "inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const interviewQuestions = [
  "Explain a technical project you are proud of.",
  "Tell me about a difficult bug and how you approached it.",
  "How would you design a service that handles repeated requests safely?",
];

export function AICareerPanel({ mode, resume, targetRole = "", profile = "", context = "", onApplyResume }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AIResponse | null>(null);
  const [topic, setTopic] = useState("Data structures and algorithms");
  const [level, setLevel] = useState("intermediate");
  const [count, setCount] = useState(5);
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState<number[]>([]);
  const [gradeResult, setGradeResult] = useState<AIResponse | null>(null);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("Tell me about a project you are proud of and the impact you made.");
  const [resumeText, setResumeText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch { /* The browser may have already stopped listening. */ }
    }
  }, []);

  async function requestAI(payload: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "The AI request did not complete.");
      const next = body.result as AIResponse;
      if (payload.mode !== "grade") setResult(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The AI request did not complete.");
      return null;
    } finally { setLoading(false); }
  }

  async function generateAssessment() {
    setGradeResult(null);
    setSelected([]);
    await requestAI({ mode, topic, level, count });
  }
  async function gradeAssessment() {
    const questions = result?.questions as PracticeQuestion[] | undefined;
    if (!questions) return;
    const graded = await requestAI({
      mode: "grade",
      questions: questions.map((item, index) => ({ ...item, selected: selected[index] ?? -1 })),
    });
    if (graded) setGradeResult(graded);
  }
  async function buildResume() {
    await requestAI({ mode, headline: resume?.headline ?? "", summary: resume?.summary ?? "", project: resume?.project ?? "", targetRole });
  }
  async function reviewResume() {
    await requestAI({ mode, resume: resumeText || `${resume?.headline ?? ""}\n${resume?.summary ?? ""}\n${resume?.project ?? ""}`.trim(), targetRole });
  }
  async function practiceInterview() { await requestAI({ mode, question, answer, targetRole }); }
  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported in this browser. You can type your answer instead.");
      return;
    }
    setVoiceError("");
    setError("");
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).slice(event.resultIndex ?? 0).map((result) => result[0]?.transcript ?? "").filter(Boolean).join(" ");
      if (transcript) {
        setResult(null);
        setAnswer((current) => `${current}${current && !/\s$/.test(current) ? " " : ""}${transcript}`.slice(0, 3000));
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      setVoiceError(event.error === "not-allowed" ? "Microphone access was blocked. Allow microphone access in your browser to use voice input." : "Voice input stopped. You can try again or type your answer.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      setVoiceError("Could not start voice input. Check microphone access and try again.");
    }
  }
  async function requestCoach() { await requestAI({ mode, prompt, profile }); }
  async function requestPlan() { await requestAI({ mode, topics: topic, days, level }); }
  async function requestTpo() { await requestAI({ mode, prompt, context }); }

  const title: Record<Mode, string> = {
    assessment: "AI practice assessment", resume: "AI resume builder", resume_review: "AI resume review",
    interview: "AI mock interview feedback", coach: "AI career coach", study_plan: "AI preparation planner", tpo: "AI TPO copilot",
  };
  const subtitle: Record<Mode, string> = {
    assessment: "Generate a topic-specific quiz, take it, and get explanations. For self-study only.",
    resume: "Turn your own notes into a clearer draft. Review every claim before using it.",
    resume_review: "Get actionable feedback on evidence, clarity, and role keywords. No ATS score is invented.",
    interview: "Type your response or dictate it with your microphone, then get AI feedback on structure, evidence, and clarity.",
    coach: "Get practical next steps tailored to the context you choose to share.",
    study_plan: "Make a manageable daily plan for topics you want to practice.",
    tpo: "Summarize the sample placement snapshot and draft human-reviewed follow-ups. No actions are taken.",
  };

  return <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">{title[mode]}</h3></div>
    <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle[mode]}</p>
    <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-[10px] leading-4 text-amber-900">AI can be wrong. Review its suggestions; they do not establish eligibility, hiring outcomes, or academic performance. Text entered here is sent to the configured AI provider for this request.</p>

    {mode === "assessment" && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_110px_auto] sm:items-end">
      <label className="text-xs font-semibold text-slate-600">Topic<input className={fieldClass} value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={100}/></label>
      <label className="text-xs font-semibold text-slate-600">Difficulty<select className={fieldClass} value={level} onChange={(event) => setLevel(event.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
      <label className="text-xs font-semibold text-slate-600">Questions<select className={fieldClass} value={count} onChange={(event) => setCount(Number(event.target.value))}>{[3, 5, 8].map((number) => <option key={number}>{number}</option>)}</select></label>
      <button className={buttonClass} onClick={generateAssessment} disabled={loading || topic.trim().length < 2}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Generate quiz</button>
    </div>}

    {mode === "resume" && <div className="mt-4 flex flex-wrap items-end gap-3"><p className="flex-1 text-xs text-slate-600">Using the resume draft in your career workspace{targetRole ? ` for ${targetRole}` : ""}.</p><button className={buttonClass} onClick={buildResume} disabled={loading}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Improve my draft</button></div>}

    {mode === "resume_review" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-600">Resume text<input aria-label="Resume text for review" value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Paste resume text here, or use the current draft" className={fieldClass}/></label><button className={buttonClass} onClick={reviewResume} disabled={loading || (resumeText.trim().length < 30 && `${resume?.headline ?? ""}${resume?.summary ?? ""}${resume?.project ?? ""}`.trim().length < 30)}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Review resume</button></div>}

    {mode === "interview" && <div className="mt-4 space-y-3"><div><p className="text-xs font-semibold text-slate-600">Choose a practice question</p><div className="mt-2 flex flex-wrap gap-2">{interviewQuestions.map((item) => <button key={item} type="button" onClick={() => { setQuestion(item); setAnswer(""); setResult(null); }} className={`rounded-lg border px-3 py-2 text-left text-xs transition ${question === item ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{item}</button>)}</div></div><label className="block text-xs font-semibold text-slate-600">Your question<input className={fieldClass} value={question} onChange={(event) => { setQuestion(event.target.value); setResult(null); }} maxLength={500}/></label><label className="block text-xs font-semibold text-slate-600">Your answer<textarea className={fieldClass} rows={5} value={answer} onChange={(event) => { setAnswer(event.target.value); setResult(null); }} maxLength={3000} placeholder="Type your answer, or use voice input below. Share only experiences that are true for you."/></label><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={toggleDictation} aria-pressed={listening} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition ${listening ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{listening ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}{listening ? "Stop speaking" : "Answer with microphone"}</button><button className={buttonClass} onClick={practiceInterview} disabled={loading || answer.trim().length < 10}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Get AI feedback</button></div>{listening && <p role="status" className="text-xs text-red-700">Listening… speak your answer, then select Stop speaking.</p>}{voiceError && <p role="alert" className="text-xs text-amber-800">{voiceError}</p>}</div>}

    {mode === "coach" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-600">What do you need help with?<textarea className={fieldClass} rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1200} placeholder="For example: how should I split my time between DSA and project preparation?"/></label><button className={buttonClass} onClick={requestCoach} disabled={loading || prompt.trim().length < 3}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Ask career coach</button></div>}

    {mode === "study_plan" && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_150px_auto] sm:items-end"><label className="text-xs font-semibold text-slate-600">Topics<input className={fieldClass} value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={500}/></label><label className="text-xs font-semibold text-slate-600">Plan length<select className={fieldClass} value={days} onChange={(event) => setDays(Number(event.target.value))}>{[3, 7, 10, 14].map((number) => <option key={number} value={number}>{number} days</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Level<select className={fieldClass} value={level} onChange={(event) => setLevel(event.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><button className={buttonClass} onClick={requestPlan} disabled={loading}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Build plan</button></div>}

    {mode === "tpo" && <div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-600">Placement office question<textarea className={fieldClass} rows={3} value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1200} placeholder="Summarize pending confirmations, or draft a recruiter follow-up."/></label><button className={buttonClass} onClick={requestTpo} disabled={loading || prompt.trim().length < 3}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Ask TPO copilot</button></div>}

    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    {result && mode === "assessment" && <AssessmentResult result={result} selected={selected} setSelected={setSelected} gradeResult={gradeResult} onGrade={gradeAssessment} loading={loading}/>}
    {result && mode === "resume" && <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">Suggested headline</p><p>{String(result.headline)}</p><p className="font-semibold">Summary</p><p className="whitespace-pre-wrap">{String(result.summary)}</p><p className="font-semibold">Project bullet</p><p>{String(result.projectBullet)}</p><p className="text-xs font-semibold">Skills to highlight: {(result.skillsToHighlight as string[]).join(", ") || "None suggested"}</p><ul className="list-disc pl-5 text-xs text-slate-600">{(result.improvementNotes as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul>{onApplyResume && <button onClick={() => onApplyResume({ headline: String(result.headline), summary: String(result.summary), project: String(result.projectBullet) })} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Use draft in resume builder</button>}</div>}
    {result && mode === "resume_review" && <FeedbackLists positive={result.strengths as string[]} improvements={result.improvements as string[]} extraTitle="Role keywords to consider" extra={result.roleKeywords as string[]} footer={String(result.caution)}/>}
    {result && mode === "interview" && <FeedbackLists positive={result.strengths as string[]} improvements={result.improvements as string[]} extraTitle="Example answer structure" extra={[String(result.exampleStructure)]} footer={String(result.feedback)}/>}
    {result && mode === "coach" && <FeedbackLists positive={[]} improvements={result.nextSteps as string[]} extraTitle="Guidance" extra={[String(result.answer)]} footer={String(result.caveat)}/>}
    {result && mode === "study_plan" && <div className="mt-4 space-y-3"><p className="text-xs leading-5 text-slate-600">{String(result.guidance)}</p><div className="grid gap-2 sm:grid-cols-2">{(result.plan as { day: number; focus: string; task: string }[]).map((item) => <article key={item.day} className="rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase text-red-700">Day {item.day} · {item.focus}</p><p className="mt-1 text-xs text-slate-700">{item.task}</p></article>)}</div></div>}
    {result && mode === "tpo" && <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">Summary</p><p>{String(result.analysis)}</p><ul className="list-disc pl-5 text-xs text-slate-700">{(result.suggestions as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul><p className="font-semibold">Draft (review before sending)</p><p className="whitespace-pre-wrap text-xs">{String(result.draft)}</p><p className="text-[10px] text-slate-500">{String(result.caveat)}</p></div>}
  </section>;
}

function FeedbackLists({ positive, improvements, extraTitle, extra, footer }: { positive: string[]; improvements: string[]; extraTitle: string; extra: string[]; footer: string }) {
  return <div className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">
    {footer && <p>{footer}</p>}
    {positive.length > 0 && <div><p className="font-bold text-emerald-800">What is working</p><ul className="list-disc pl-5">{positive.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {improvements.length > 0 && <div><p className="font-bold text-amber-800">Ways to improve</p><ul className="list-disc pl-5">{improvements.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    <div><p className="font-bold">{extraTitle}</p><ul className="list-disc pl-5">{extra.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
  </div>;
}

function AssessmentResult({ result, selected, setSelected, gradeResult, onGrade, loading }: { result: AIResponse; selected: number[]; setSelected: (next: number[]) => void; gradeResult: AIResponse | null; onGrade: () => void; loading: boolean }) {
  const questions = result.questions as PracticeQuestion[];
  const grades = gradeResult?.results as { correctAnswerIndex: number; feedback: string }[] | undefined;
  const correctCount = grades?.reduce((total, item, index) => total + (selected[index] === item.correctAnswerIndex ? 1 : 0), 0);
  return <div className="mt-5 space-y-4">
    <h4 className="font-bold text-slate-900">{String(result.title)}</h4>
    {questions.map((item, index) => <fieldset key={`${index}-${item.question}`} className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-800"><span className="mr-2 rounded bg-red-50 px-2 py-1 text-[10px] text-red-700">{item.topic}</span>{item.question}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{item.choices.map((choice, choiceIndex) => <label key={choiceIndex} className={`cursor-pointer rounded-lg border p-3 text-xs ${selected[index] === choiceIndex ? "border-red-300 bg-red-50" : "border-slate-200"}`}><input className="sr-only" type="radio" name={`ai-question-${index}`} checked={selected[index] === choiceIndex} disabled={Boolean(grades)} onChange={() => { const next = [...selected]; next[index] = choiceIndex; setSelected(next); }}/>{choice}</label>)}</div>{grades?.[index] && <p className={`mt-3 rounded-lg p-3 text-xs ${selected[index] === grades[index].correctAnswerIndex ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>Correct option: {item.choices[grades[index].correctAnswerIndex]}. {grades[index].feedback}</p>}</fieldset>)}
    {!grades && <button onClick={onGrade} disabled={loading} className={buttonClass}>{loading && <LoaderCircle className="h-4 w-4 animate-spin"/>}Submit and review</button>}
    {grades && <p aria-live="polite" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-950">Practice result: {correctCount}/{questions.length} correct. {String(gradeResult?.summary ?? "Review the explanations and keep practicing.")}</p>}
  </div>;
}
