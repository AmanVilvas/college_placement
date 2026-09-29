"use client";

import { useState } from "react";
import Link from "next/link";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getInitials } from "@/lib/utils";
import { useStudentApplications, useStudentProfile } from "@/lib/studentState";
import { downloadLocalFile, removeLocalFile, saveLocalFile } from "@/lib/localFiles";
import type { Branch, Section, Year } from "@/lib/types";
import { Mail, Phone, FileText, GraduationCap, Award, Edit3, Download, Trash2, LoaderCircle } from "lucide-react";

const branches: Branch[] = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"];
const sections: Section[] = ["A", "B", "C", "D"];
const years: Year[] = ["1", "2", "3", "4"];

export default function ProfilePage() {
  const [student, setStudent] = useStudentProfile();
  const { applications: myApps } = useStudentApplications();
  const [editing, setEditing] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: student.name, phone: student.phone, branch: student.branch, section: student.section, year: student.year, cgpa: String(student.cgpa), tenthPercent: String(student.tenthPercent), twelfthPercent: String(student.twelfthPercent), backlogs: String(student.backlogs), skills: student.skills.join(", ") });
  const shortlisted = myApps.filter((application) => ["Shortlisted", "Assessment", "Interview", "Selected", "Placed"].includes(application.status)).length;
  const interviews = myApps.filter((application) => ["Interview", "Selected", "Placed"].includes(application.status)).length;
  const offers = myApps.filter((application) => ["Selected", "Placed"].includes(application.status)).length;

  function openEditor() {
    setForm({ name: student.name, phone: student.phone, branch: student.branch, section: student.section, year: student.year, cgpa: String(student.cgpa), tenthPercent: String(student.tenthPercent), twelfthPercent: String(student.twelfthPercent), backlogs: String(student.backlogs), skills: student.skills.join(", ") });
    setMessage("");
    setEditing(true);
  }
  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const cgpa = Number(form.cgpa); const tenthPercent = Number(form.tenthPercent); const twelfthPercent = Number(form.twelfthPercent); const backlogs = Number(form.backlogs);
    if (!form.name.trim() || !/^\+?[0-9 ()-]{10,18}$/.test(form.phone.trim()) || form.phone.replace(/\D/g, "").length < 10 || !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10 || !Number.isFinite(tenthPercent) || tenthPercent < 0 || tenthPercent > 100 || !Number.isFinite(twelfthPercent) || twelfthPercent < 0 || twelfthPercent > 100 || !Number.isInteger(backlogs) || backlogs < 0) {
      setMessage("Check your name, phone, CGPA (0–10), marks (0–100), and non-negative backlog count.");
      return;
    }
    setStudent((current) => ({ ...current, name: form.name.trim(), phone: form.phone.trim(), branch: form.branch, section: form.section, year: form.year, cgpa, tenthPercent, twelfthPercent, backlogs, skills: [...new Set(form.skills.split(",").map((skill) => skill.trim()).filter(Boolean))] }));
    setEditing(false);
    setMessage("Profile saved on this device.");
  }
  async function uploadResume(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(file.name)) {
      setMessage("Choose a PDF or DOC/DOCX file smaller than 5 MB.");
      return;
    }
    setSavingFile(true); setMessage("");
    try {
      await saveLocalFile("student-resume:s1", file);
      setStudent((current) => ({ ...current, resumeFileName: file.name }));
      setMessage("Resume saved in this browser's private local storage.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this file."); }
    finally { setSavingFile(false); }
  }
  async function deleteResume() {
    try { await removeLocalFile("student-resume:s1"); } catch { /* The file may already be missing. */ }
    setStudent((current) => ({ ...current, resumeFileName: undefined }));
    setMessage("Resume removed from this browser.");
  }

  return <div>
    <StudentHeader title="My Profile" subtitle="Keep the details used for opportunity eligibility up to date" />
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-700" />
        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4 flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-indigo-400 to-purple-500 text-2xl font-bold text-white shadow-md">{getInitials(student.name)}</div>
            <div className="pb-2"><h2 className="text-xl font-bold text-slate-900">{student.name}</h2><p className="text-sm text-slate-500">{student.branch} · Section {student.section} · {student.rollNumber}</p></div>
            <button onClick={openEditor} className="ml-auto inline-flex items-center gap-1.5 pb-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"><Edit3 className="h-3.5 w-3.5"/>Edit profile</button>
          </div>
          <StatusBadge status={student.placementStatus} />
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400"/><span className="truncate">{student.email}</span></div><div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400"/>{student.phone}</div></div>
          <div className="mt-4 grid grid-cols-4 gap-3 rounded-xl bg-slate-50 p-4">{[{ label: "Applications", value: myApps.length }, { label: "Shortlisted", value: shortlisted }, { label: "Interviews", value: interviews }, { label: "Offers", value: offers }].map((stat) => <div key={stat.label} className="text-center"><p className="text-xl font-bold text-slate-900">{stat.value}</p><p className="text-[10px] text-slate-500">{stat.label}</p></div>)}</div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-indigo-600"/><h3 className="font-semibold text-slate-900">Academic details</h3></div><div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">{[{ label: "CGPA", value: student.cgpa }, { label: "Backlogs", value: student.backlogs }, { label: "10th %", value: `${student.tenthPercent}%` }, { label: "12th %", value: `${student.twelfthPercent}%` }, { label: "Branch", value: student.branch }, { label: "Section", value: `Section ${student.section}` }].map((item) => <div key={item.label}><span className="text-slate-500">{item.label}</span><p className="text-lg font-bold text-slate-900">{item.value}</p></div>)}</div></section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Award className="h-4 w-4 text-indigo-600"/><h3 className="font-semibold text-slate-900">Skills</h3></div><div className="flex flex-wrap gap-2">{student.skills.map((skill) => <span key={skill} className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">{skill}</span>)}{student.skills.length === 0 && <p className="text-xs text-slate-500">Add your skills using Edit profile.</p>}</div></section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-600"/><h3 className="font-semibold text-slate-900">Resume</h3></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">{savingFile ? <LoaderCircle className="h-3.5 w-3.5 animate-spin"/> : <Edit3 className="h-3.5 w-3.5"/>}{student.resumeFileName ? "Replace resume" : "Upload resume"}<input type="file" accept=".pdf,.doc,.docx" className="sr-only" disabled={savingFile} onChange={(event) => { void uploadResume(event.target.files?.[0]); event.target.value = ""; }}/></label></div>
        {student.resumeFileName ? <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><FileText className="h-8 w-8 text-indigo-500"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-700">{student.resumeFileName}</p><p className="text-xs text-slate-400">Stored only in this browser</p></div><button onClick={() => void downloadLocalFile("student-resume:s1").catch((error: Error) => setMessage(error.message))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600"><Download className="h-3.5 w-3.5"/>Download</button><button aria-label="Remove resume" onClick={() => void deleteResume()} className="rounded-lg border border-slate-200 bg-white p-2 text-rose-600"><Trash2 className="h-3.5 w-3.5"/></button></div> : <p className="text-xs text-slate-500">Upload a PDF or DOC/DOCX (up to 5 MB). It stays in your browser and is not uploaded to the placement office.</p>}
      </section>
      {message && <p aria-live="polite" className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">{message}</p>}
      <div className="flex flex-wrap gap-3 text-xs"><Link href="/applications" className="font-semibold text-indigo-700 hover:underline">Track applications →</Link><Link href="/workspace" className="font-semibold text-indigo-700 hover:underline">Open career workspace →</Link></div>
    </div>

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"><form onSubmit={saveProfile} className="my-auto max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div><h2 className="text-lg font-bold text-slate-900">Edit student profile</h2><p className="mt-1 text-xs text-slate-500">Changes are saved in this browser and used by drive eligibility guidance.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-slate-600">Branch<select value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value as Branch })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm">{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Section<select value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value as Section })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm">{sections.map((section) => <option key={section}>{section}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Year<select value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value as Year })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">CGPA<input type="number" min="0" max="10" step="0.01" value={form.cgpa} onChange={(event) => setForm({ ...form, cgpa: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-slate-600">10th percentage<input type="number" min="0" max="100" step="0.1" value={form.tenthPercent} onChange={(event) => setForm({ ...form, tenthPercent: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label><label className="text-xs font-semibold text-slate-600">12th percentage<input type="number" min="0" max="100" step="0.1" value={form.twelfthPercent} onChange={(event) => setForm({ ...form, twelfthPercent: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-slate-600">Active backlogs<input type="number" min="0" step="1" value={form.backlogs} onChange={(event) => setForm({ ...form, backlogs: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Skills (comma separated)<input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label></div>
      <p className="text-[10px] text-amber-800">Academic profile edits here are a local demo. They do not change official college records or final drive eligibility.</p>{message && <p role="alert" className="text-xs text-rose-700">{message}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button><button className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white">Save profile</button></div></form></div>}
  </div>;
}
