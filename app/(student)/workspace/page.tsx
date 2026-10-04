"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentDocuments } from "@/components/student/StudentDocuments";
import { AICareerPanel } from "@/components/shared/AICareerPanel";
import { StudentAssessmentCenter } from "@/components/student/StudentAssessmentCenter";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useStudentProfile } from "@/lib/studentState";
import { useApiResource } from "@/lib/useApi";
import type { Branch, Drive } from "@/lib/types";
import {
  Award, BookOpen, CalendarDays,
  FileText, GraduationCap, Heart, MessageCircle, Search, Send, TrendingUp,
  Sparkles, Users, Plus, Trash2, LoaderCircle, X,
} from "lucide-react";

const areas = ["Preparation", "Role match & resume review", "Assessments", "Interview practice", "Career coach", "Alumni & experiences", "Events & cohorts", "Documents & privacy", "AI assessment", "AI resume assistant"] as const;
type Area = (typeof areas)[number];
type PrepSubtopic = { id: string; title: string; details?: string; deadline?: string; completed: boolean };
type PrepTopic = { id: string; title: string; deadline: string; subtopics: PrepSubtopic[]; completedBeforePlan?: number; source?: "ai"; guidance?: string };
type WorkspaceData = {
  prep: (string | PrepTopic)[];
  savedResume: { headline: string; summary: string; project: string };
  publicPortfolio: boolean;
  assessmentScores: number[];
  joinedEvents: string[];
  joinedCohorts: string[];
  mockAnswers: Record<string, string>;
  experiences: { company: string; role: string; round: string; topics: string }[];
  docs: string[];
  privacy: Record<string, boolean>;
  internshipStages: Record<string, boolean>;
  mentorshipRequests: string[];
  notificationPreferences: Record<string, boolean>;
  integrityEvents: string[];
};
const defaultData: WorkspaceData = {
  prep: [], savedResume: { headline: "", summary: "", project: "" },
  publicPortfolio: false, assessmentScores: [], joinedEvents: [], joinedCohorts: [], mockAnswers: {},
  experiences: [], docs: [], privacy: { email: false, resume: false, projects: true }, internshipStages: {}, mentorshipRequests: [],
  notificationPreferences: { newDrives: true, deadlines: true, interviews: true, announcements: true },
  integrityEvents: [],
};

function normalizePreparation(items: WorkspaceData["prep"] = []): PrepTopic[] {
  return (Array.isArray(items) ? items : []).map((item, index) => typeof item === "string"
    ? { id: `legacy-${index}`, title: item, deadline: "", subtopics: [{ id: `legacy-task-${index}`, title: item, completed: true }] }
    : item && typeof item === "object" && typeof item.title === "string"
      ? { ...item, subtopics: Array.isArray(item.subtopics) ? item.subtopics : [] }
      : null).filter((item): item is PrepTopic => item !== null);
}
function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const alumni: { name: string; company: string; role: string; branch: string; topics: string }[] = [];
const cohorts: { id: string; name: string; pace: string }[] = [];

interface WorkspaceEvent { id: string; title: string; event_type: string; starts_at?: string | null; }

interface WorkspaceApiDrive {
  id: string; company_id: string; role_title: string; job_type: string; package_lpa?: number;
  stipend_monthly?: number; location?: string; work_mode?: string; openings: number;
  application_deadline?: string; drive_date?: string; status: string; official_apply_link?: string;
  description?: string; eligibility?: { branches?: string[]; minCGPA?: number; maxBacklogs?: number };
  required_skills?: string[]; selection_process?: string[];
  companies?: { name?: string; logo_url?: string; metadata?: { logoColor?: string } };
}

export default function StudentWorkspacePage() {
  const [student] = useStudentProfile();
  const { data: campusEvents } = useApiResource<WorkspaceEvent[]>("events", {}, { fallback: [] });
  const { data: apiDrives } = useApiResource<WorkspaceApiDrive[]>(
    "drives", { select: "id,company_id,role_title,job_type,package_lpa,stipend_monthly,location,work_mode,openings,application_deadline,drive_date,status,official_apply_link,description,eligibility,required_skills,selection_process,companies(name,logo_url,metadata)", limit: "500" }, { fallback: [] }
  );
  const drives: Drive[] = (apiDrives ?? []).map((drive) => ({
    id: drive.id, companyId: drive.company_id, companyName: drive.companies?.name ?? "",
    companyLogoUrl: drive.companies?.logo_url, companyLogoColor: drive.companies?.metadata?.logoColor ?? "#b91c1c",
    role: drive.role_title, jobType: drive.job_type as Drive["jobType"], packageLPA: drive.package_lpa,
    stipendMonthly: drive.stipend_monthly, location: drive.location ?? "", workMode: (drive.work_mode ?? "On-site") as Drive["workMode"],
    openings: drive.openings, applicationDeadline: drive.application_deadline ?? "", driveDate: drive.drive_date ?? "",
    status: drive.status as Drive["status"], officialApplyLink: drive.official_apply_link ?? "", jobDescription: drive.description ?? "",
    eligibility: { branches: (drive.eligibility?.branches ?? []) as Branch[], minCGPA: drive.eligibility?.minCGPA ?? 0, maxBacklogs: drive.eligibility?.maxBacklogs ?? 0 },
    requiredSkills: drive.required_skills ?? [], selectionProcess: drive.selection_process ?? [], importantInstructions: [], createdAt: "",
  }));
  const [area, setArea] = useState<Area>("Preparation");
  const [data, setData, ready] = useLocalStorageState<WorkspaceData>(`placement-helper:student-workspace:records-v2:${student.id || student.rollNumber}`, defaultData);
  const [experience, setExperience] = useState({ company: "", role: "", round: "", topics: "" });
  const [coachPrompt, setCoachPrompt] = useState("");
  const [coachAnswer, setCoachAnswer] = useState("");
  const [search, setSearch] = useState("");
  const [targetDriveId, setTargetDriveId] = useState(drives[0]?.id ?? "");
  const [topicDraft, setTopicDraft] = useState({ title: "", deadline: "", subtopics: "" });
  const [subtopicDrafts, setSubtopicDrafts] = useState<Record<string, string>>({});
  const [aiOpen, setAiOpen] = useState(false);
  const [aiStep, setAiStep] = useState<1 | 2>(1);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCompleted, setAiCompleted] = useState(0);
  const [aiDueDate, setAiDueDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 14); return localDateValue(date); });
  const [aiLevel, setAiLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const preparationTopics = useMemo(() => normalizePreparation(data.prep), [data.prep]);
  const preparationCounts = preparationTopics.reduce((counts, topic) => ({
    complete: counts.complete + (topic.completedBeforePlan ?? 0) + topic.subtopics.filter((item) => item.completed).length,
    total: counts.total + (topic.completedBeforePlan ?? 0) + topic.subtopics.length,
  }), { complete: 0, total: 0 });
  const progress = preparationCounts.total ? Math.round(preparationCounts.complete / preparationCounts.total * 100) : 0;
  const completeProfile = [student.name, student.email, student.branch, student.cgpa].filter(Boolean).length;
  const targetDrive = drives.find((drive) => drive.id === targetDriveId);
  const normalizedStudentSkills = student.skills.map((skill) => skill.toLowerCase());
  const skillMatches = targetDrive?.requiredSkills.filter((required) => required.toLowerCase().split(/[\/,]/).some((option) => normalizedStudentSkills.some((skill) => option.trim().includes(skill) || skill.includes(option.trim())))) ?? [];
  const eligibilityReasons = targetDrive ? [
    ...(!targetDrive.eligibility.branches.includes(student.branch) ? [`Branch ${student.branch} is not listed`] : []),
    ...(student.cgpa < targetDrive.eligibility.minCGPA ? [`CGPA ${student.cgpa} is below ${targetDrive.eligibility.minCGPA}`] : []),
    ...(student.backlogs > targetDrive.eligibility.maxBacklogs ? [`Backlogs ${student.backlogs} exceed ${targetDrive.eligibility.maxBacklogs}`] : []),
  ] : [];
  const resumeText = `${data.savedResume.headline} ${data.savedResume.summary} ${data.savedResume.project}`.toLowerCase();
  const resumeKeywords = targetDrive?.requiredSkills.map((skill) => ({ skill, present: skill.toLowerCase().split(/[\/,]/).some((option) => resumeText.includes(option.trim())) })) ?? [];
  const skillDemand = [...new Set(drives.flatMap((drive) => drive.requiredSkills))].map((skill) => ({
    skill,
    drives: drives.filter((drive) => drive.requiredSkills.includes(skill)).length,
    hasSkill: normalizedStudentSkills.some((studentSkill) => skill.toLowerCase().split(/[\/,]/).some((option) => option.trim().includes(studentSkill) || studentSkill.includes(option.trim()))),
  })).sort((a, b) => b.drives - a.drives).slice(0, 8);

  function savePreparation(topics: PrepTopic[]) {
    setData((current) => ({ ...current, prep: topics }));
  }
  function addPreparationTopic(event: React.FormEvent) {
    event.preventDefault();
    const title = topicDraft.title.trim();
    if (!title || !topicDraft.deadline) return;
    const subtopics: PrepSubtopic[] = topicDraft.subtopics.split("\n").map((item) => item.trim()).filter(Boolean).map((item) => ({ id: crypto.randomUUID(), title: item, completed: false }));
    savePreparation([{ id: crypto.randomUUID(), title, deadline: topicDraft.deadline, subtopics }, ...preparationTopics]);
    setTopicDraft({ title: "", deadline: "", subtopics: "" });
  }
  function togglePreparationSubtopic(topicId: string, subtopicId: string) {
    savePreparation(preparationTopics.map((topic) => topic.id !== topicId ? topic : {
      ...topic, subtopics: topic.subtopics.map((item) => item.id === subtopicId ? { ...item, completed: !item.completed } : item),
    }));
  }
  function addPreparationSubtopic(topicId: string) {
    const title = subtopicDrafts[topicId]?.trim();
    if (!title) return;
    savePreparation(preparationTopics.map((topic) => topic.id === topicId ? { ...topic, subtopics: [...topic.subtopics, { id: crypto.randomUUID(), title, completed: false }] } : topic));
    setSubtopicDrafts((current) => ({ ...current, [topicId]: "" }));
  }
  function removePreparationTopic(topicId: string) {
    savePreparation(preparationTopics.filter((topic) => topic.id !== topicId));
  }
  async function generateAiPreparation(event: React.FormEvent) {
    event.preventDefault(); setAiLoading(true); setAiError("");
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "preparation_plan", topic: aiTopic.trim(), completed: aiCompleted, dueDate: aiDueDate, level: aiLevel }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not generate a preparation plan.");
      const plan = body.result as { guidance: string; subtopics: { title: string; details: string; deadline: string }[] };
      const newTopic: PrepTopic = {
        id: crypto.randomUUID(), title: aiTopic.trim(), deadline: aiDueDate, completedBeforePlan: aiCompleted, source: "ai", guidance: plan.guidance,
        subtopics: plan.subtopics.map((item) => ({ id: crypto.randomUUID(), title: item.title, details: item.details, deadline: item.deadline, completed: false })),
      };
      savePreparation([newTopic, ...preparationTopics]);
      setAiOpen(false); setAiStep(1); setAiTopic("");
    } catch (error) { setAiError(error instanceof Error ? error.message : "Could not generate a preparation plan."); }
    finally { setAiLoading(false); }
  }
  function askCoach() {
    const prompt = coachPrompt.toLowerCase();
    if (prompt.includes("company") || drives.some((drive) => prompt.includes(drive.companyName.toLowerCase()))) {
      const targetDrive = drives.find((drive) => prompt.includes(drive.companyName.toLowerCase()));
      setCoachAnswer(targetDrive ? `For ${targetDrive.companyName}'s ${targetDrive.role}, review ${targetDrive.requiredSkills.join(", ") || "the skills listed in the drive"}. The listed process is ${targetDrive.selectionProcess.join(" → ") || "not provided"}. Check the drive page for its official criteria and current status.` : "Choose a company with a published placement drive to see its role requirements and application details.");
    } else if (prompt.includes("resume")) setCoachAnswer("Try rewriting each project bullet as: what you built + the tools you used + a measurable result. Keep the version you share tailored to the role, and ask a mentor to review it.");
    else if (prompt.includes("dsa") || prompt.includes("plan")) setCoachAnswer("A practical 7-day starter plan: arrays and hashing, two pointers, stacks and queues, binary search, trees, graphs, then a timed mixed set. Track completed practice rather than relying on a generated readiness score.");
    else setCoachAnswer("Start with your target role, then compare its listed requirements with your projects and preparation checklist. I can help with a drive, resume edits, or a DSA practice plan.");
  }
  function addExperience(event: React.FormEvent) {
    event.preventDefault();
    if (!experience.company.trim() || !experience.round.trim()) return;
    setData((current) => ({ ...current, experiences: [{ ...experience }, ...current.experiences] }));
    setExperience({ company: "", role: "", round: "", topics: "" });
  }

  return (
    <div>
      <StudentHeader title="Career workspace" subtitle="Prepare, practice, and manage the next steps in your placement journey" />
      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-7">
        <div className="rounded-2xl bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-red-200">Student career OS</p><h2 className="mt-2 text-2xl font-bold">Build your next opportunity, {student.name.split(" ")[0]}.</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">A personal space for preparation, practice, career documents, alumni learning, and events.</p></div>
            <div className="min-w-52 rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between text-xs"><span className="text-slate-300">Preparation checklist</span><span className="font-bold text-white">{progress}%</span></div><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-red-400 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[10px] text-slate-400">Based on tasks you mark complete</p></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Career workspace modules">
          {areas.map((item) => <button key={item} role="tab" aria-selected={area === item} onClick={() => setArea(item)} className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${area === item ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{item}</button>)}
        </div>

        {area === "AI assessment" && <AICareerPanel mode="assessment" targetRole={targetDrive?.role}/>}
        {area === "AI resume assistant" && <AICareerPanel mode="resume" resume={data.savedResume} targetRole={targetDrive?.role} onApplyResume={(draft) => setData((current) => ({ ...current, savedResume: draft }))}/>}
        {area === "AI resume assistant" && <AICareerPanel mode="resume_review" resume={data.savedResume} targetRole={targetDrive?.role}/>}
        {area === "Interview practice" && <AICareerPanel mode="interview" targetRole={targetDrive?.role}/>}

        {area === "Preparation" && <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)]">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">My preparation plan</h3></div><p className="mt-1 text-xs text-slate-500">Add topics, choose deadlines, and check off each subtopic as you finish it.</p></div>
              <button type="button" onClick={() => { setAiOpen((open) => !open); setAiStep(1); setAiError(""); }} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800 hover:bg-red-100"><Sparkles size={14}/>{aiOpen ? "Close AI plan" : "Build a plan with AI"}</button>
            </div>

            {aiOpen && <form onSubmit={aiStep === 1 ? (event) => { event.preventDefault(); if (aiTopic.trim().length >= 2) { setAiStep(2); setAiError(""); } } : generateAiPreparation} className="mt-5 rounded-2xl border border-red-100 bg-red-50/40 p-4 sm:p-5">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-red-700">AI preparation plan · Step {aiStep} of 2</p><h4 className="mt-1 text-sm font-bold text-slate-900">{aiStep === 1 ? "What topic do you want to prepare?" : `How much have you completed in “${aiTopic.trim()}”?`}</h4></div><button type="button" onClick={() => { setAiOpen(false); setAiError(""); }} aria-label="Close AI preparation form" className="rounded-lg p-1.5 text-slate-400 hover:bg-white"><X size={15}/></button></div>
              {aiStep === 1 ? <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]"><label className="text-xs font-semibold text-slate-600">Preparation topic<input autoFocus required minLength={2} maxLength={160} value={aiTopic} onChange={(event) => setAiTopic(event.target.value)} placeholder="e.g. Data structures and algorithms" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"/></label><label className="text-xs font-semibold text-slate-600">Your level<select value={aiLevel} onChange={(event) => setAiLevel(event.target.value as typeof aiLevel)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><button type="submit" disabled={aiTopic.trim().length < 2} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40 sm:col-span-2">Next · Set progress and deadline</button></div>
                : <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_190px]"><label className="text-xs font-semibold text-slate-600">Subtopics already completed<input type="number" required min={0} max={100} step={1} value={aiCompleted} onChange={(event) => setAiCompleted(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"/><span className="mt-1 block font-normal text-slate-400">AI will focus its checklist on what remains.</span></label><label className="text-xs font-semibold text-slate-600">Finish by<input type="date" required min={localDateValue(new Date())} max={(() => { const max = new Date(); max.setDate(max.getDate() + 180); return localDateValue(max); })()} value={aiDueDate} onChange={(event) => setAiDueDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"/></label>{aiError && <p role="alert" className="rounded-lg bg-white px-3 py-2 text-xs text-red-700 sm:col-span-2">{aiError}</p>}<div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" onClick={() => { setAiStep(1); setAiError(""); }} disabled={aiLoading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700">Back</button><button type="submit" disabled={aiLoading || !aiDueDate} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{aiLoading ? <><LoaderCircle size={14} className="animate-spin"/>Building plan…</> : <><Sparkles size={14}/>Generate remaining subtopics</>}</button></div></div>}
            </form>}

            <form onSubmit={addPreparationTopic} className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-800">Create your own topic</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]"><label className="text-xs font-medium text-slate-600">Topic name<input required maxLength={120} value={topicDraft.title} onChange={(event) => setTopicDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Database systems" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="text-xs font-medium text-slate-600">Deadline<input type="date" required min={localDateValue(new Date())} value={topicDraft.deadline} onChange={(event) => setTopicDraft((current) => ({ ...current, deadline: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label></div>
              <label className="mt-3 block text-xs font-medium text-slate-600">Checklist items <span className="font-normal text-slate-400">(optional, one per line)</span><textarea rows={2} maxLength={1500} value={topicDraft.subtopics} onChange={(event) => setTopicDraft((current) => ({ ...current, subtopics: event.target.value }))} placeholder={"e.g. Relational algebra\nSQL joins and indexes"} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
              <button type="submit" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-white"><Plus size={14}/>Add topic</button>
            </form>

            <div className="mt-5 space-y-3">
              {preparationTopics.map((topic) => <article key={topic.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-slate-900">{topic.title}</h4>{topic.source === "ai" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-700">AI plan</span>}</div><p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><CalendarDays size={12}/>{topic.deadline ? `Due ${topic.deadline}` : "No deadline set"}</p>{Boolean(topic.completedBeforePlan) && <p className="mt-1 text-[10px] text-emerald-700">{topic.completedBeforePlan} subtopic{topic.completedBeforePlan === 1 ? "" : "s"} completed before this plan</p>}</div><button type="button" aria-label={`Delete ${topic.title}`} title="Delete topic" onClick={() => removePreparationTopic(topic.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"><Trash2 size={14}/></button></div>
                {topic.guidance && <p className="mt-3 rounded-lg bg-red-50/60 px-3 py-2 text-[11px] leading-5 text-slate-600">{topic.guidance}</p>}
                <div className="mt-3 space-y-2">{topic.subtopics.map((subtopic) => <label key={subtopic.id} className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 hover:bg-slate-100"><input type="checkbox" checked={subtopic.completed} onChange={() => togglePreparationSubtopic(topic.id, subtopic.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"/><span className="min-w-0 flex-1"><span className={`block text-xs ${subtopic.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{subtopic.title}</span>{subtopic.details && <span className="mt-1 block text-[10px] leading-4 text-slate-500">{subtopic.details}</span>}</span>{subtopic.deadline && <span className="shrink-0 text-[9px] text-slate-400">{subtopic.deadline}</span>}</label>)}</div>
                <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); addPreparationSubtopic(topic.id); }}><input value={subtopicDrafts[topic.id] ?? ""} onChange={(event) => setSubtopicDrafts((current) => ({ ...current, [topic.id]: event.target.value }))} maxLength={160} aria-label={`Add a checklist item to ${topic.title}`} placeholder="Add a checklist item" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"/><button disabled={!subtopicDrafts[topic.id]?.trim()} type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"><Plus size={13}/>Add</button></form>
              </article>)}
              {preparationTopics.length === 0 && <div className="rounded-2xl bg-slate-50 px-5 py-8 text-center"><BookOpen className="mx-auto h-6 w-6 text-slate-300"/><p className="mt-2 text-sm font-medium text-slate-700">Your plan starts here</p><p className="mt-1 text-xs text-slate-500">Create a topic above or ask AI to build a dated checklist for you.</p></div>}
            </div>
          </div>
          <div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Plan progress</h3></div><div className="mt-4"><div className="flex justify-between text-xs"><span className="text-slate-500">Subtopics completed</span><b>{preparationCounts.complete}/{preparationCounts.total}</b></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-red-500 transition-all" style={{ width: `${progress}%` }}/></div><p className="mt-2 text-[10px] text-slate-400">{progress}% of your preparation checklist</p></div><div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Branch</span><b>{student.branch} · {student.year}{student.year === "4" ? "th" : "nd"} year</b></div><div className="flex justify-between"><span className="text-slate-500">CGPA</span><b>{student.cgpa}</b></div><div className="flex justify-between"><span className="text-slate-500">Backlogs</span><b>{student.backlogs}</b></div><div className="flex justify-between"><span className="text-slate-500">Profile fields present</span><b>{completeProfile}/4</b></div></div><Link href="/profile" className="mt-4 inline-block text-xs font-semibold text-red-700">Review profile →</Link></div><div className="rounded-2xl border border-red-100 bg-red-50/70 p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-red-600"/><h3 className="text-sm font-bold text-red-950">Skill gap starting point</h3></div><p className="mt-2 text-xs leading-5 text-red-900/80">Compare your skills with a target drive on the Companies page. Use the “eligible for me” filter for academic criteria; skill overlap is guidance only.</p><Link href="/companies" className="mt-3 inline-block rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">Explore roles</Link></div></div>
        </section>}
        {area === "Preparation" && <StudentAssessmentCenter student={student} compact />}

        {area === "Role match & resume review" && <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Role fit explorer</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">Compares your saved profile with published drive criteria. Eligibility is calculated separately from skill overlap.</p><label className="mt-4 block text-xs font-semibold text-slate-600">Target opportunity<select value={targetDriveId} onChange={(event) => setTargetDriveId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal">{drives.map((drive) => <option key={drive.id} value={drive.id}>{drive.companyName} · {drive.role}</option>)}</select></label>{targetDrive && <><div className={`mt-4 rounded-xl p-4 text-sm ${eligibilityReasons.length ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}><p className="font-bold">Eligibility · {eligibilityReasons.length ? "Not eligible on listed criteria" : "Meets listed academic criteria"}</p>{eligibilityReasons.map((reason) => <p key={reason} className="mt-1 text-xs">{reason}</p>)}</div><div className="mt-4"><p className="text-xs font-semibold text-slate-800">Listed skills compared with your profile</p><div className="mt-3 flex flex-wrap gap-2">{targetDrive.requiredSkills.map((skill) => { const matches = skillMatches.includes(skill); return <span key={skill} className={`rounded-full border px-2.5 py-1 text-[10px] ${matches ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{matches ? "✓ " : "· "}{skill}</span>; })}</div><p className="mt-3 text-[10px] text-slate-400">{skillMatches.length} of {targetDrive.requiredSkills.length} skill labels overlap your listed skills. This is a simple keyword comparison, not an AI recommendation.</p></div></>}</div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Resume keyword review</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">Checks whether role terms appear in your resume draft. It cannot assess ATS formatting or the quality of your experience.</p>{targetDrive && <><p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">Role: <b>{targetDrive.companyName} · {targetDrive.role}</b></p><div className="mt-3 space-y-2">{resumeKeywords.map((item) => <div key={item.skill} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs"><span>{item.skill}</span><span className={item.present ? "font-semibold text-emerald-700" : "text-amber-700"}>{item.present ? "Found in draft" : "Not found"}</span></div>)}</div><Link href="/portfolio" className="mt-4 inline-block text-xs font-semibold text-red-700">Edit resume draft →</Link></>}</div></section>}

        {area === "Role match & resume review" && <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Drive skill demand</h3></div><p className="mt-1 text-xs text-slate-500">Counts how many published drives list each skill. Bars show drive frequency, not skill proficiency.</p><div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">{skillDemand.map((item) => <div key={item.skill}><div className="flex justify-between gap-2 text-xs"><span className="truncate text-slate-700">{item.skill}</span><span className={item.hasSkill ? "font-semibold text-emerald-700" : "text-slate-400"}>{item.hasSkill ? "In your profile" : "Not in profile"}</span></div><div className="mt-1.5 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-red-500" style={{ width: `${item.drives / Math.max(drives.length, 1) * 100}%` }}/></div><p className="mt-1 text-[10px] text-slate-400">Listed by {item.drives} published {item.drives === 1 ? "drive" : "drives"}</p></div>)}</div></section>}

        {area === "Assessments" && <StudentAssessmentCenter student={student} />}



        {area === "Career coach" && <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Career practice assistant</h3></div>
            <p className="mt-1 text-xs text-slate-500">Quick guidance based on published placement drives, with optional AI coaching alongside it.</p>
            <div className="mt-5 rounded-xl bg-slate-50 p-4"><label htmlFor="coach-prompt" className="text-xs font-semibold text-slate-700">What are you preparing for?</label><textarea id="coach-prompt" value={coachPrompt} onChange={(event) => setCoachPrompt(event.target.value)} rows={3} placeholder="e.g. What should I prepare for this role?" className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"/><button onClick={askCoach} disabled={!coachPrompt.trim()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><Send className="h-3.5 w-3.5"/>Get quick guidance</button></div>
            {coachAnswer && <div aria-live="polite" className="mt-4 rounded-xl border border-red-100 bg-red-50/70 p-4 text-sm leading-6 text-red-950">{coachAnswer}</div>}
            <div className="mt-4"><h4 className="text-xs font-bold text-slate-800">Try a prompt</h4>{["What should I prepare for a software engineering role?", "Give me a 7-day DSA plan", "How can I improve my resume?"].map((item) => <button key={item} onClick={() => setCoachPrompt(item)} className="mt-2 flex w-full items-center gap-2 rounded-lg border border-slate-200 p-3 text-left text-xs text-slate-600 hover:bg-slate-50"><Sparkles className="h-3.5 w-3.5 shrink-0 text-red-500"/>{item}</button>)}</div>
          </div>
          <AICareerPanel mode="coach" profile={`${student.branch}, year ${student.year}, skills: ${student.skills.join(", ")}`}/>
        </section>}


        {area === "Alumni & experiences" && <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Alumni network</h3></div><label className="relative mt-4 block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company or topic" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs"/></label><div className="mt-4 space-y-3">{alumni.filter((person) => `${person.company} ${person.topics} ${person.branch}`.toLowerCase().includes(search.toLowerCase())).map((person) => <div key={person.name} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-xs font-bold text-red-700">{person.name.split(" ").map((part) => part[0]).join("")}</div><div><p className="text-sm font-semibold text-slate-900">{person.name}</p><p className="text-xs text-slate-500">{person.role} · {person.company}</p></div><button onClick={() => setData((current) => ({ ...current, mentorshipRequests: current.mentorshipRequests.includes(person.name) ? current.mentorshipRequests.filter((name) => name !== person.name) : [...current.mentorshipRequests, person.name] }))} className="ml-auto rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">{data.mentorshipRequests.includes(person.name) ? "Interest saved" : "Save interest"}</button></div><p className="mt-3 text-xs text-slate-500">Can share: {person.topics}</p></div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500"/><h3 className="font-bold text-slate-900">Interview experience library</h3></div><p className="mt-1 text-xs text-slate-500">Share only non-sensitive, consented information. Submissions remain local in this demo.</p><form onSubmit={addExperience} className="mt-4 grid gap-3 sm:grid-cols-2"><input aria-label="Company" placeholder="Company" value={experience.company} onChange={(e) => setExperience({ ...experience, company: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"/><input aria-label="Role" placeholder="Role" value={experience.role} onChange={(e) => setExperience({ ...experience, role: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"/><input aria-label="Round" placeholder="Round, e.g. coding screen" value={experience.round} onChange={(e) => setExperience({ ...experience, round: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"/><input aria-label="Topics" placeholder="Topics covered" value={experience.topics} onChange={(e) => setExperience({ ...experience, topics: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"/><button className="rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white sm:col-span-2">Add experience</button></form><div className="mt-4 space-y-2">{data.experiences.map((item, index) => <div key={`${item.company}-${index}`} className="rounded-lg bg-slate-50 p-3 text-xs"><b>{item.company}</b> · {item.role} · {item.round}<p className="mt-1 text-slate-500">{item.topics}</p></div>)}{data.experiences.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No experiences shared from this browser yet.</p>}</div></div></section>}

        {area === "Events & cohorts" && <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Events and hiring challenges</h3></div><p className="mt-2 text-xs text-slate-500">{campusEvents?.length ? `${campusEvents.length} campus event${campusEvents.length === 1 ? "" : "s"} published.` : "New company talks and campus events will appear here."}</p><div className="mt-4 space-y-3">{(campusEvents ?? []).slice(0, 3).map((event) => <div key={event.id} className="rounded-xl border border-slate-100 p-4"><p className="text-sm font-semibold text-slate-900">{event.title}</p><p className="mt-1 text-xs text-slate-500">{event.event_type}{event.starts_at ? ` · ${new Date(event.starts_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p></div>)}</div><Link href="/events" className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white">Open Events</Link></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Award className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Preparation cohorts</h3></div>{cohorts.length ? <div className="mt-4 space-y-3">{cohorts.map((cohort) => <div key={cohort.id} className="rounded-xl border border-slate-100 p-4"><h4 className="text-sm font-semibold text-slate-900">{cohort.name}</h4><p className="mt-2 text-xs text-slate-500">{cohort.pace}</p></div>)}</div> : <p className="mt-2 text-xs text-slate-500">No preparation cohorts are currently available.</p>}</div></section>}

        {area === "Documents & privacy" && <StudentDocuments/>}
        {!ready && <p className="sr-only" aria-live="polite">Loading saved career workspace</p>}
      </div>
    </div>
  );
}
