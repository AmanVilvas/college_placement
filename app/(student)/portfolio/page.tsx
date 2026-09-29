"use client";

import Link from "next/link";
import { StudentHeader } from "@/components/student/StudentHeader";
import { useStudentProfile } from "@/lib/studentState";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

type PortfolioData = { publicPortfolio: boolean; savedResume: { headline: string; summary: string; project: string }; privacy: Record<string, boolean> };
const initialPortfolio: PortfolioData = { publicPortfolio: false, savedResume: { headline: "", summary: "", project: "" }, privacy: { email: false, resume: false, projects: true } };

export default function StudentPortfolioPage() {
  const [student] = useStudentProfile();
  const [portfolio] = useLocalStorageState<PortfolioData>("placement-helper:student-workspace", initialPortfolio);

  return <div>
    <StudentHeader title="Portfolio preview" subtitle="Preview the profile saved in this browser"/>
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      {!portfolio.publicPortfolio && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Preview is private.</b> Turn on local preview in the Career Workspace to show your selected sections here. This does not publish a public internet link.</div>}
      <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Student portfolio</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{student.name}</h1>
        <p className="mt-1 text-slate-600">{portfolio.savedResume.headline || `${student.branch} student`}</p>
        {portfolio.privacy.email && <p className="mt-2 text-xs text-slate-500">{student.email}</p>}
        {portfolio.privacy.resume && <section className="mt-7 border-t border-slate-200 pt-5"><h2 className="text-xs font-bold uppercase text-slate-700">Profile</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{portfolio.savedResume.summary || "No profile summary added yet."}</p><h2 className="mt-5 text-xs font-bold uppercase text-slate-700">Skills</h2><div className="mt-3 flex flex-wrap gap-2">{student.skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{skill}</span>)}</div></section>}
        {portfolio.privacy.projects && <section className="mt-7 border-t border-slate-200 pt-5"><h2 className="text-xs font-bold uppercase text-slate-700">Featured project</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{portfolio.savedResume.project || "No featured project added yet."}</p></section>}
        <p className="mt-8 border-t border-slate-100 pt-4 text-[10px] text-slate-400">This is a same-browser preview. It is not published or visible to recruiters.</p>
      </article>
      <Link href="/workspace" className="inline-block text-xs font-semibold text-indigo-700 hover:underline">Back to Career Workspace →</Link>
    </main>
  </div>;
}
