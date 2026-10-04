"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudentHeader } from "@/components/student/StudentHeader";
import { useStudentProfile } from "@/lib/studentState";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { Download, FileText, Maximize2 } from "lucide-react";

type PortfolioData = { publicPortfolio: boolean; savedResume: { headline: string; summary: string; project: string }; privacy: Record<string, boolean> };
type ResumeExtraction = { summary: string; skills: string[]; projects: string[]; pagesRead: number };
type SavedExtraction = { fileKey: string; result: ResumeExtraction } | { fileKey: string; error: string };
const initialPortfolio: PortfolioData = { publicPortfolio: false, savedResume: { headline: "", summary: "", project: "" }, privacy: { email: false, resume: false, projects: true } };

export default function StudentPortfolioPage() {
  const [student] = useStudentProfile();
  const [portfolio, setPortfolio, portfolioReady] = useLocalStorageState<PortfolioData>(`placement-helper:student-workspace:records-v2:${student.id || student.rollNumber}`, initialPortfolio);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [zoomed, setZoomed] = useState(false);
  const [extraction, setExtraction] = useState<SavedExtraction | null>(null);
  const isPdf = student.resumeFileName?.toLowerCase().endsWith(".pdf") ?? false;
  const resumeKey = `${student.resumeFileName || ""}:${student.resumeUpdatedAt || ""}`;
  const matchingExtraction = extraction?.fileKey === resumeKey ? extraction : null;
  const extracting = Boolean(isPdf && student.resumeFileName && !matchingExtraction);

  useEffect(() => {
    if (!student.resumeFileName) return;
    const controller = new AbortController();
    let objectUrl = "";
    fetch("/api/student/profile/resume", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 404 ? "Your uploaded resume is no longer available." : "Could not load your saved resume.");
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl); setPreviewError("");
    }).catch((error: Error) => { if (error.name !== "AbortError") setPreviewError(error.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [student.resumeFileName, student.resumeUpdatedAt]);

  useEffect(() => {
    if (!isPdf || !student.resumeFileName) return;
    const controller = new AbortController();
    fetch("/api/student/profile/resume/extract", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not read resume text.");
      setExtraction({ fileKey: resumeKey, result: body.data as ResumeExtraction });
    }).catch((error: Error) => {
      if (error.name !== "AbortError") setExtraction({ fileKey: resumeKey, error: error.message });
    });
    return () => controller.abort();
  }, [isPdf, resumeKey, student.resumeFileName]);

  function downloadResume() {
    if (!previewUrl) return;
    const link = document.createElement("a"); link.href = previewUrl; link.download = student.resumeFileName || "resume"; link.click();
  }

  function saveResumeField(field: keyof PortfolioData["savedResume"], value: string) {
    setPortfolio((current) => ({ ...current, savedResume: { ...current.savedResume, [field]: value } }));
  }

  function printPortfolio() {
    window.print();
  }

  const extracted = matchingExtraction && "result" in matchingExtraction ? matchingExtraction.result : undefined;
  const displaySkills = extracted ? extracted.skills : extracting ? [] : student.skills;

  return <div>
    <StudentHeader title="Portfolio preview" subtitle="Preview your profile and saved resume"/>
    <main className="mx-auto max-w-[1440px] p-4 sm:p-6">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 print:border-0 print:shadow-none">
        <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="mb-4 h-16 w-16 text-xl"/>
        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Student portfolio</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{student.name}</h1>
        <p className="mt-1 text-slate-600">{portfolio.savedResume.headline || `${student.branch} student`}</p>
        {portfolio.privacy.email && <p className="mt-2 text-xs text-slate-500">{student.email}</p>}
        <section className="mt-7 border-t border-slate-200 pt-5">
          <h2 className="text-xs font-bold uppercase text-slate-700">Resume summary</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{portfolio.savedResume.summary || extracted?.summary || (extracting ? "Reading your uploaded resume…" : "Add a short introduction in the resume builder below.")}</p>
          <h2 className="mt-5 text-xs font-bold uppercase text-slate-700">Skills{extracted ? " · from resume" : ""}</h2>
          <div className="mt-3 flex flex-wrap gap-2">{displaySkills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{skill}</span>)}
            {extracting && <span className="text-xs text-slate-400">Extracting skills from your PDF…</span>}
            {extracted && extracted.skills.length === 0 && <span className="text-xs text-slate-500">No skills section was found in this resume PDF.</span>}
            {matchingExtraction && "error" in matchingExtraction && <span className="text-xs text-amber-700">Couldn’t extract resume skills: {matchingExtraction.error}</span>}
            {!student.resumeFileName && student.skills.length === 0 && <span className="text-xs text-slate-400">Add skills in your profile.</span>}
          </div>
        </section>
        <section className="mt-7 border-t border-slate-200 pt-5"><h2 className="text-xs font-bold uppercase text-slate-700">Projects{extracted ? " · from resume" : ""}</h2>
          {portfolio.savedResume.project ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{portfolio.savedResume.project}</p>
            : extracted?.projects.length ? <ul className="mt-3 space-y-2">{extracted.projects.map((project, index) => <li key={`${index}-${project}`} className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{project}</li>)}</ul>
              : extracted ? <p className="mt-2 text-sm text-slate-500">No projects section was found in this resume PDF.</p>
                : extracting ? <p className="mt-2 text-sm text-slate-400">Finding projects in your resume…</p>
                  : matchingExtraction && "error" in matchingExtraction ? <p className="mt-2 text-sm text-amber-700">{matchingExtraction.error}</p>
                    : <p className="mt-2 text-sm text-slate-500">Add a featured project in the resume builder below or upload a PDF resume.</p>}
        </section>
        <section className="mt-7 border-t border-slate-200 pt-5 print:hidden" aria-labelledby="resume-builder-title">
          <div className="flex items-start justify-between gap-3">
            <div><h2 id="resume-builder-title" className="text-base font-semibold text-slate-950">Resume builder</h2><p className="mt-1 text-xs leading-5 text-slate-500">Edit your portfolio introduction and featured project. Changes save automatically on this device.</p></div>
            <button type="button" onClick={printPortfolio} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50" disabled={!portfolioReady}><Download size={14}/>Print / Save PDF</button>
          </div>
          <fieldset disabled={!portfolioReady} className="mt-4 space-y-3 disabled:opacity-60">
            <label className="block text-xs font-semibold text-slate-600">Professional headline<input value={portfolio.savedResume.headline} onChange={(event) => saveResumeField("headline", event.target.value)} placeholder={`${student.branch} student`} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"/></label>
            <label className="block text-xs font-semibold text-slate-600">Resume summary<textarea value={portfolio.savedResume.summary} onChange={(event) => saveResumeField("summary", event.target.value)} rows={4} placeholder="Write a brief, specific summary of your strengths and goals" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"/></label>
            <label className="block text-xs font-semibold text-slate-600">Featured project<textarea value={portfolio.savedResume.project} onChange={(event) => saveResumeField("project", event.target.value)} rows={3} placeholder="Project, your contribution, technologies, and outcome" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"/></label>
          </fieldset>
          <p className="mt-3 text-[10px] text-slate-400">This portfolio is private to your account. Printing lets you save the current preview as a PDF.</p>
        </section>
      </article>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold tracking-tight text-slate-950">Uploaded resume</h2><p className="mt-1 text-xs text-slate-500">Loaded securely from your Supabase profile.</p></div>
          {previewUrl && <button type="button" onClick={downloadResume} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Download size={14}/>Download</button>}
        </div>
        {!student.resumeFileName ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5"><FileText className="h-5 w-5 text-slate-400"/><div><p className="text-sm font-medium text-slate-700">No resume uploaded yet</p><Link href="/profile" className="mt-1 inline-block text-xs font-semibold text-red-700 hover:underline">Upload a resume in your profile →</Link></div></div>
          : previewError ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{previewError}</p>
          : !previewUrl ? <div role="status" className="mt-5 h-[430px] animate-pulse rounded-xl bg-slate-100" aria-label="Loading resume preview"/>
          : isPdf ? <div role="button" tabIndex={0} aria-label="Open enlarged resume preview" onClick={() => setZoomed(true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setZoomed(true); } }} className="group relative mt-5 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left focus:outline-none focus:ring-2 focus:ring-teal-600">
            <div className="pointer-events-none mx-auto h-[450px] max-w-[640px] overflow-hidden bg-white shadow-sm transition duration-300 ease-out group-hover:scale-[1.035] group-focus:scale-[1.035]"><iframe src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} title="Uploaded resume preview" className="pointer-events-none h-full w-full border-0"/></div>
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-slate-950/65 to-transparent px-4 pb-4 pt-12 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"><Maximize2 size={14}/>Hover or select to enlarge</span>
          </div>
          : <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5"><div className="flex min-w-0 items-center gap-3"><FileText className="h-8 w-8 shrink-0 text-red-700"/><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{student.resumeFileName}</p><p className="mt-1 text-xs text-slate-500">Use Download to open this document in your viewer.</p></div></div><button onClick={downloadResume} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-medium text-white hover:bg-slate-800"><Download size={14}/>Download</button></div>}
      </section>
      </div>
      <Link href="/workspace" className="inline-block text-xs font-semibold text-red-700 hover:underline print:hidden">Back to Career Workspace →</Link>
    </main>
    {zoomed && previewUrl && <div role="dialog" aria-modal="true" aria-label="Enlarged resume preview" onClick={() => setZoomed(false)} onKeyDown={(event) => { if (event.key === "Escape") setZoomed(false); }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"><div onClick={(event) => event.stopPropagation()} className="relative h-full max-h-[1000px] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex h-12 items-center justify-between border-b border-slate-200 px-4"><p className="truncate text-sm font-medium text-slate-800">{student.resumeFileName}</p><button onClick={() => setZoomed(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Close</button></div><iframe src={`${previewUrl}#toolbar=1&navpanes=0&view=FitH`} title="Enlarged uploaded resume preview" className="h-[calc(100%-3rem)] w-full border-0"/></div></div>}
  </div>;
}
