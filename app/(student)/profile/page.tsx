"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { EditableStudentProfile, useStudentApplications, useStudentProfile } from "@/lib/studentState";
import { LockKeyhole, FileText, Upload, Download, Trash2, Check, ArrowUpRight, Camera } from "lucide-react";

const inputClass = "mt-2 w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:ring-3 focus:ring-teal-50 disabled:bg-slate-50 disabled:text-slate-500";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
function fields(student: EditableStudentProfile) {
  return { email: student.email || "", phone: student.phone || "", department: student.branch || "", year_of_study: String(student.year || "1"), graduation_year: String(student.graduationYear || ""), cgpa: String(student.cgpa ?? ""), tenth_percent: String(student.tenthPercent ?? ""), twelfth_percent: String(student.twelfthPercent ?? ""), backlogs: String(student.backlogs ?? 0), skills: (student.skills || []).join(", ") };
}

export default function ProfilePage() {
  const [student, setStudent] = useStudentProfile();
  const { applications } = useStudentApplications();
  const [form, setForm] = useState(() => fields(student));
  const [saved, setSaved] = useState(form);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/student/profile", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load your profile.");
      setStudent(body.data); setForm(fields(body.data)); setSaved(fields(body.data)); setLoadError(""); setLoading(false);
    }).catch((error: Error) => { if (error.name !== "AbortError") { setLoadError(error.message); setLoading(false); } });
    return () => controller.abort();
  }, [setStudent, retry]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      const payload = { ...form, year_of_study: Number(form.year_of_study), graduation_year: form.graduation_year ? Number(form.graduation_year) : null, cgpa: Number(form.cgpa), tenth_percent: Number(form.tenth_percent), twelfth_percent: Number(form.twelfth_percent), backlogs: Number(form.backlogs), skills: [...new Set(form.skills.split(",").map((skill) => skill.trim()).filter(Boolean))] };
      const response = await fetch("/api/student/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error === "Invalid request" ? "Please check your email, phone number and academic values." : body.error || "Could not save your profile.");
      setStudent(body.data); setForm(fields(body.data)); setSaved(fields(body.data));
      setNotice({ text: "Your profile has been saved." });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not save your profile.", error: true }); }
    finally { setSaving(false); }
  }

  async function changeResume(file?: File, remove = false) {
    if (!remove && !file) return;
    if (file && (!file.size || file.size > 5 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(file.name))) {
      setNotice({ text: "Choose a non-empty PDF, DOC or DOCX up to 5 MB.", error: true }); return;
    }
    setFileBusy(true); setNotice(null);
    try {
      const data = new FormData(); if (file) data.set("file", file);
      const response = await fetch("/api/student/profile/resume", { method: remove ? "DELETE" : "POST", body: remove ? undefined : data });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not update your resume.");
      setStudent((current) => ({ ...current, ...body.data }));
      setNotice({ text: remove ? "Resume removed." : "Resume uploaded and saved to your profile." });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "Could not update your resume.", error: true }); }
    finally { setFileBusy(false); }
  }

  async function changePhoto(file?: File, remove = false) {
    if (!remove && !file) return;
    if (file && (!file.size || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setNotice({ text: "Choose a JPG, PNG or WebP photo up to 5 MB.", error: true }); return;
    }
    setPhotoBusy(true); setNotice(null);
    try {
      const data = new FormData(); if (file) data.set("file", file);
      const response = await fetch("/api/student/profile/photo", { method: remove ? "DELETE" : "POST", body: remove ? undefined : data });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not update your photo.");
      setStudent((current) => ({ ...current, avatarUrl: body.data.avatarUrl }));
      setNotice({ text: remove ? "Profile photo removed." : "Profile photo updated throughout the app." });
    } catch (error) { setNotice({ text: (error as Error).message, error: true }); }
    finally { setPhotoBusy(false); }
  }

  async function downloadResume() {
    setFileBusy(true);
    try {
      const response = await fetch("/api/student/profile/resume");
      if (!response.ok) throw new Error("Could not download your resume. Please try again.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = student.resumeFileName || "resume"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setNotice({ text: (error as Error).message, error: true }); }
    finally { setFileBusy(false); }
  }

  const field = (key: keyof typeof form, label: string, type = "text", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => <label className="block text-xs font-medium text-slate-500">{label}<input {...extra} type={type} value={form[key]} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className={inputClass}/></label>;
  const section = "grid gap-5 border-t border-slate-100 py-7 sm:grid-cols-[170px_1fr] sm:gap-8";

  return <div className="min-h-full bg-[#edf4f3]">
    <StudentHeader title="My profile" subtitle="Your details, all in one place"/>
    <div className="mx-auto max-w-[940px] px-4 py-7 sm:px-8 sm:py-10">
      {loading ? <div aria-label="Loading profile" role="status" className="overflow-hidden rounded-[28px] border-4 border-white bg-white p-2"><div className="h-40 animate-pulse rounded-2xl bg-teal-100/60"/><div className="space-y-8 p-7">{[1,2,3,4].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100"/>)}</div></div>
      : loadError ? <div role="alert" className="rounded-2xl bg-white p-8 text-sm"><p>{loadError}</p><button className={`${buttonClass} mt-4`} onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Try again</button></div>
      : <article className="overflow-hidden rounded-[28px] border-[5px] border-white bg-white shadow-[0_20px_70px_-35px_rgba(39,79,76,0.3)]">
        <div className="relative h-36 overflow-hidden rounded-t-[22px] rounded-b-[24px] bg-[linear-gradient(120deg,#a1c1c2_0%,#c3dedd_55%,#e0efec_100%)] sm:h-40"><div className="absolute -right-10 -top-24 h-72 w-72 rounded-full border-[35px] border-white/10"/><div className="absolute -bottom-24 left-16 h-48 w-48 rounded-full bg-white/15 blur-2xl"/></div>
        <div className="px-5 pb-3 sm:px-9">
          <div className="relative -mt-10 flex items-end justify-between gap-3"><StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="h-20 w-20 border-[5px] border-white bg-[#e0eae5] text-2xl text-[#46645c]"/><Link href="/applications" className={`${buttonClass} mb-1 bg-white`}>My applications<ArrowUpRight size={14}/></Link></div>
          <div className="mt-4"><div className="flex items-center gap-2"><h2 className="text-[25px] font-semibold tracking-[-0.045em] text-slate-950">{student.name}</h2><span className="rounded-full bg-teal-50 p-1 text-teal-600" title="Student profile"><Check size={12} strokeWidth={3}/></span></div><p className="mt-1 text-xs text-slate-400">{student.email || "Add your contact email below"}</p></div>
          <div className="grid grid-cols-2 gap-5 py-7 sm:grid-cols-4">{[{label:"Department",value:student.branch},{label:"Graduating",value:student.graduationYear || "—"},{label:"Applications",value:applications.length},{label:"CGPA",value:student.cgpa ?? "—"}].map((stat) => <div key={stat.label}><p className="text-xs text-slate-400">{stat.label}</p><p className="mt-2 text-sm font-medium text-slate-900">{stat.value}</p></div>)}</div>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <label className={buttonClass + " cursor-pointer focus-within:ring-2 focus-within:ring-teal-500"}><Camera size={14}/>{photoBusy ? "Updating photo…" : student.avatarUrl ? "Change photo" : "Upload photo"}<input type="file" aria-label="Upload profile photo" accept="image/jpeg,image/png,image/webp" disabled={photoBusy || saving} className="sr-only" onChange={(event) => { void changePhoto(event.target.files?.[0]); event.target.value = ""; }}/></label>
            {student.avatarUrl && <button type="button" className={buttonClass} disabled={photoBusy || saving} onClick={() => void changePhoto(undefined, true)}>Remove photo</button>}
            <span className="text-xs text-slate-400">JPG, PNG or WebP · Up to 5 MB</span>
          </div>
          {notice && <p role={notice.error ? "alert" : "status"} className={"mb-5 rounded-xl px-4 py-3 text-xs " + (notice.error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800")}>{notice.text}</p>}
          <form onSubmit={save}>
            <section className={section}><div><h3 className="text-sm font-medium tracking-tight text-slate-900">Student identity</h3><p className="mt-2 text-xs leading-5 text-slate-400">Managed by the placement cell.</p></div><div className="grid gap-4 sm:grid-cols-2">{[{label:"Full name",value:student.name},{label:"Roll number",value:student.rollNumber},{label:"Section",value:student.section}].map((item) => <label key={item.label} className={`block text-xs font-medium text-slate-500 ${item.label === "Full name" ? "sm:col-span-2" : ""}`}><span className="flex items-center gap-1.5">{item.label}<LockKeyhole size={11}/></span><input readOnly aria-readonly="true" value={item.value || ""} className={`${inputClass} bg-slate-50/70! text-slate-500!`}/></label>)}</div></section>
            <section className={section}><div><h3 className="text-sm font-medium tracking-tight text-slate-900">Contact details</h3><p className="mt-2 text-xs leading-5 text-slate-400">Where we can reach you.<br/>Your sign-in stays the same.</p></div><div className="grid gap-4">{field("email","Email address","email",{required:true,autoComplete:"email",maxLength:254})}{field("phone","Phone number","tel",{required:true,autoComplete:"tel",maxLength:18,pattern:"[+0-9 ()\\-]{10,18}"})}</div></section>
            <section className={section}><div><h3 className="text-sm font-medium tracking-tight text-slate-900">Academic details</h3><p className="mt-2 text-xs leading-5 text-slate-400">Keep your latest academic record up to date.</p></div><div className="grid grid-cols-2 gap-4">{field("department","Department","text",{required:true,maxLength:80})}{field("year_of_study","Year of study","number",{required:true,min:1,max:6,step:1})}{field("graduation_year","Graduation year","number",{min:2000,max:2100,step:1})}{field("cgpa","CGPA / 10","number",{required:true,min:0,max:10,step:"0.01"})}{field("tenth_percent","Class 10 / %","number",{required:true,min:0,max:100,step:"0.01"})}{field("twelfth_percent","Class 12 / %","number",{required:true,min:0,max:100,step:"0.01"})}{field("backlogs","Active backlogs","number",{required:true,min:0,max:100,step:1})}</div></section>
            <section className={section}><div><h3 className="text-sm font-medium tracking-tight text-slate-900">Skills</h3><p className="mt-2 text-xs leading-5 text-slate-400">A little about what you do best.</p></div><div>{field("skills","Separate skills with commas","text",{placeholder:"e.g. Python, UI design, SQL",maxLength:4000})}</div></section>
            <section className={section}><div><h3 className="text-sm font-medium tracking-tight text-slate-900">Resume</h3><p className="mt-2 text-xs leading-5 text-slate-400">PDF, DOC or DOCX.<br/>Maximum file size: 5 MB.</p></div><div className="min-w-0"><div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-5"><FileText size={23} strokeWidth={1.4} className="mb-3 text-teal-700"/><p className="break-all text-sm font-medium text-slate-700">{student.resumeFileName || "Add your latest resume"}</p><p className="mt-1 text-xs text-slate-400">{student.resumeFileName ? `${Math.max(1, Math.round((student.resumeSize || 0) / 1024))} KB · Saved to your profile` : "Available whenever you sign in."}</p><div className="mt-4 flex flex-wrap items-center gap-2"><label className={`${buttonClass} relative cursor-pointer bg-white focus-within:ring-2 focus-within:ring-teal-500 ${fileBusy ? "pointer-events-none opacity-50" : ""}`}><Upload size={13}/>{fileBusy ? "Please wait…" : student.resumeFileName ? "Replace file" : "Upload resume"}<input aria-label="Upload resume" type="file" accept=".pdf,.doc,.docx" className="sr-only" disabled={fileBusy || saving} onChange={(event) => { void changeResume(event.target.files?.[0]); event.target.value = ""; }}/></label>{student.resumeFileName && <><button type="button" className={buttonClass} disabled={fileBusy || saving} onClick={() => void downloadResume()} aria-label="Download resume"><Download size={14}/></button><button type="button" className={`${buttonClass} text-red-600`} disabled={fileBusy || saving} onClick={() => void changeResume(undefined,true)} aria-label="Remove resume"><Trash2 size={14}/></button></>}</div></div></div></section>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 py-5"><p className="mr-auto text-xs text-slate-400">{dirty ? "You have unsaved changes" : "Your profile is up to date"}</p><button type="button" disabled={!dirty || saving} className={buttonClass} onClick={() => { setForm(saved); setNotice(null); }}>Cancel</button><button type="submit" disabled={!dirty || saving || fileBusy || photoBusy} className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : "Save changes"}</button></div>
          </form>
        </div>
      </article>}
    </div>
  </div>;
}
