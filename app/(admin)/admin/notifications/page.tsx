"use client";

import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { FormEvent, useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useApiResource } from "@/lib/useApi";
import { CheckCircle2, Mail, MessageCircle, Megaphone, Send, TriangleAlert, Users } from "lucide-react";

type ApiApplication = {
  id: string; status: string; student_profiles?: { full_name?: string; roll_number?: string; department?: string };
  drives?: { role_title?: string; companies?: { name?: string } };
};
type ApiStudent = { id: string; full_name: string; roll_number: string; department?: string; email?: string | null; phone?: string | null; cgpa?: number | null; tenth_percent?: number | null; twelfth_percent?: number | null };
type ApiDrive = { id: string; role_title: string; companies?: { name?: string } };
const EMPTY_STUDENTS: ApiStudent[] = [];
type Result = { audience: number; emailSent: number; whatsappSent: number; failures: { recipient: string; channel: string; error: string }[] };
type Dispatch = { title: string; category: string; sentAt: string; result: Result };

export default function AdminNotificationsPage() {
  const { data: driveRows } = useApiResource<ApiDrive[]>("drives", { select: "id,role_title,companies(name)", limit: "2000" }, { fallback: [] });
  const { data: applications } = useApiResource<ApiApplication[]>("applications", {
    select: "id,status,student_profiles(full_name,roll_number,department),drives(role_title,companies(name))", order: "updated_at.desc", limit: "1000",
  }, { fallback: [] });
  const shortlisted = useMemo(() => (applications || []).filter((item) => item.status.toLowerCase() === "shortlisted"), [applications]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Company announcement");
  const [companyName, setCompanyName] = useState("");
  const [department, setDepartment] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [driveId, setDriveId] = useState("");
  const [marks, setMarks] = useState({ minCgpa: "", maxCgpa: "", minTenth: "", maxTenth: "", minTwelfth: "", maxTwelfth: "" });
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [audienceMode, setAudienceMode] = useState<"all" | "selected">("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [email, setEmail] = useState(false);
  const [shortlistId, setShortlistId] = useState("");
  const [roundDetails, setRoundDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Dispatch[]>([]);
  const audienceParams = { department, audienceFilter, ...(audienceFilter !== "all" && driveId ? { driveId } : {}), ...marks };
  const { data: studentRows, loading: studentsLoading, error: audienceError } = useApiResource<ApiStudent[]>("notifications/audience", audienceParams,
    { enabled: audienceFilter !== "eligible" || Boolean(driveId), fallback: [] });
  const students = audienceFilter === "eligible" && !driveId ? EMPTY_STUDENTS : studentRows ?? EMPTY_STUDENTS;
  const selectedRecipients = selectedStudentIds.filter((id) => students.some((student) => student.id === id));
  const visibleStudents = useMemo(() => students.filter((student) => {
    const term = studentSearch.trim().toLowerCase();
    return (!department || student.department === department)
      && (!term || `${student.full_name} ${student.roll_number} ${student.department ?? ""}`.toLowerCase().includes(term));
  }), [students, studentSearch, department]);
  const allVisibleSelected = visibleStudents.length > 0 && visibleStudents.every((student) => selectedStudentIds.includes(student.id));

  async function dispatch(payload: Record<string, unknown>, label: string, kind: string) {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json", "x-placement-admin-preview": "1" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Could not send notifications (${response.status}).`);
      const sent = data.data as Result;
      setResult(sent);
      setHistory((current) => [{ title: label, category: kind, sentAt: new Date().toISOString(), result: sent }, ...current].slice(0, 8));
      if (payload.action === "broadcast") { setTitle(""); setMessage(""); }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Notification dispatch failed.");
    } finally { setBusy(false); }
  }

  function sendBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parseCopies = (value: string) => [...new Set(value.split(/[\s,;]+/).map((address) => address.trim()).filter(Boolean))];
    const copies = { cc: email ? parseCopies(cc) : [], bcc: email ? parseCopies(bcc) : [] };
    if ([...copies.cc, ...copies.bcc].some((address) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) { setError("Enter valid CC and BCC email addresses separated by commas."); return; }
    if (copies.cc.length > 20 || copies.bcc.length > 20) { setError("Use up to 20 addresses in each CC or BCC field."); return; }
    void dispatch({ action: "broadcast", title, message, category, companyName,
      ...Object.fromEntries(Object.entries(audienceParams).filter(([, value]) => value !== "")),
      ...(audienceMode === "selected" ? { studentIds: selectedRecipients } : {}), ...copies,
      channels: { email, whatsapp: false } }, title, category);
  }

  function toggleVisibleStudents(checked: boolean) {
    const visibleIds = new Set(visibleStudents.map((student) => student.id));
    setSelectedStudentIds((current) => checked
      ? Array.from(new Set([...current, ...visibleIds]))
      : current.filter((id) => !visibleIds.has(id)));
  }

  return <div>
    <AdminHeader title="Campus Broadcasts" subtitle="Email students about company drives, placement news, and industry talks; notify shortlisted candidates directly." />
    <div className="space-y-6 p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><Users className="h-5 w-5 text-red-600"/><div><p className="text-xs text-slate-500">Campus audience</p><p className="text-lg font-bold text-slate-900">All registered students</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><Mail className="h-5 w-5 text-red-600"/><div><p className="text-xs text-slate-500">Broadcast channel</p><p className="text-lg font-bold text-slate-900">In-app + optional email</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><MessageCircle className="h-5 w-5 text-emerald-600"/><div><p className="text-xs text-slate-500">Shortlist alert</p><p className="text-lg font-bold text-slate-900">Email + WhatsApp</p></div></div>
      </div>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}
      {result && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4"/>Dispatch completed</div><p className="mt-1">Audience {result.audience} · Email sent {result.emailSent} · WhatsApp sent {result.whatsappSent} · Failed {result.failures.length}</p>{result.failures.length > 0 && <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs">{result.failures.slice(0, 10).map((failure, index) => <li key={`${failure.recipient}-${index}`}>{failure.recipient} ({failure.channel}): {failure.error}</li>)}</ul>}</div>}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><Megaphone className="h-4 w-4 text-red-600"/><h2 className="font-bold text-slate-900">Send campus broadcast</h2></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Create an in-app notification for each matching student and optionally email their saved addresses. Combine audience and marks filters, or select individual students from the matching list.</p>
          <form onSubmit={sendBroadcast} className="mt-4 space-y-4">
            <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-xs font-semibold text-slate-800">Broadcast filters</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Student group<select value={audienceFilter} onChange={(event) => { setAudienceFilter(event.target.value); setDriveId(""); }} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="all">All students</option><option value="eligible">Eligible students</option><option value="shortlisted">Shortlisted students</option></select></label>
                {audienceFilter !== "all" && <label className="text-xs font-semibold text-slate-700">Company / role {audienceFilter === "eligible" ? "(required)" : "(optional)"}<select required={audienceFilter === "eligible"} value={driveId} onChange={(event) => setDriveId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="">{audienceFilter === "eligible" ? "Choose a placement drive" : "All shortlisted applications"}</option>{(driveRows ?? []).map((drive) => <option key={drive.id} value={drive.id}>{drive.companies?.name || "Company"} · {drive.role_title}</option>)}</select></label>}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {([{ label: "CGPA", min: "minCgpa", max: "maxCgpa", limit: 10 }, { label: "10th marks (%)", min: "minTenth", max: "maxTenth", limit: 100 }, { label: "12th marks (%)", min: "minTwelfth", max: "maxTwelfth", limit: 100 }] as const).map((range) => <div key={range.label}><p className="text-xs font-semibold text-slate-700">{range.label}</p><div className="mt-1.5 grid grid-cols-2 gap-2"><input aria-label={`Minimum ${range.label}`} type="number" min={0} max={range.limit} step="0.01" placeholder="Min" value={marks[range.min]} onChange={(event) => setMarks((current) => ({ ...current, [range.min]: event.target.value }))} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-xs"/><input aria-label={`Maximum ${range.label}`} type="number" min={marks[range.min] || 0} max={range.limit} step="0.01" placeholder="Max" value={marks[range.max]} onChange={(event) => setMarks((current) => ({ ...current, [range.max]: event.target.value }))} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-xs"/></div></div>)}
              </div>
              <p className="text-[11px] text-slate-500">Leave marks blank for no restriction. Students with missing marks are excluded when a marks filter is set.</p>
              {audienceError && <p role="alert" className="text-xs text-rose-700">Could not load matching students: {audienceError}</p>}
              <p role="status" className="text-xs font-semibold text-slate-700">{audienceFilter === "eligible" && !driveId ? "Choose a drive to preview eligible students." : studentsLoading ? "Finding matching students…" : `${students.length} matching students`}</p>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Message type<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option>Company announcement</option><option>Industry talk</option><option>Placement update</option><option>General notice</option></select></label>
              <label className="text-xs font-semibold text-slate-700">Audience<select value={audienceMode} onChange={(event) => { setAudienceMode(event.target.value as "all" | "selected"); setDepartment(""); }} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="all">All matching students / department</option><option value="selected">Specific matching students</option></select></label>
            </div>
            {audienceMode === "all" ? <label className="block text-xs font-semibold text-slate-700">Department<select value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="">All campus students</option>{["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : <section className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-800">Select recipients <span className="font-normal text-slate-500">({selectedStudentIds.length} selected)</span></p><button type="button" onClick={() => toggleVisibleStudents(!allVisibleSelected)} className="text-[11px] font-semibold text-red-700">{allVisibleSelected ? "Clear visible" : "Select visible"}</button></div>
              <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search name, roll number, or department" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
              {studentsLoading ? <DataSkeleton label="Loading student list…" className="mt-4" /> : <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-2">{visibleStudents.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2 py-2 text-xs hover:bg-red-50"><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} className="accent-red-600"/><span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{student.full_name} <span className="font-normal text-slate-500">· {student.roll_number} · {student.department}</span></span><span className="hidden max-w-48 truncate text-[10px] text-slate-400 md:inline">{student.email || student.phone || "No contact"}</span></label>)}{visibleStudents.length === 0 && <p className="p-3 text-center text-xs text-slate-500">No students match this search.</p>}</div>}
            </section>}
            <label className="block text-xs font-semibold text-slate-700">Company or host name <span className="font-normal text-slate-400">(optional)</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={120} placeholder="e.g. Acme Technologies or Alumni Network" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="block text-xs font-semibold text-slate-700">Email subject<input required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New placement drive: Software Engineer" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="block text-xs font-semibold text-slate-700">Announcement details<textarea required minLength={5} maxLength={5000} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share eligibility, schedule, venue, registration link, or talk details…" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} className="mt-0.5 accent-red-600"/><span><b>Also send an email to each selected student</b><span className="block mt-0.5">This sends an external message to the saved address. In-app notifications are always recorded.</span></span></label>
            {email && <fieldset className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-xs font-semibold text-slate-800">Email copies (optional)</legend><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">CC<input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="tpo@college.edu, staff@college.edu" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal"/></label><label className="text-xs font-semibold text-slate-700">BCC<input value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder="office@college.edu" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal"/></label></div><p className="mt-2 text-[11px] leading-4 text-slate-500">Separate addresses with commas. Up to 20 per field. CC and BCC receive a copy of each student email. CC is visible to recipients; BCC is hidden.</p></fieldset>}
            <button disabled={busy || studentsLoading || Boolean(audienceError) || students.length === 0 || (audienceFilter === "eligible" && !driveId) || (audienceMode === "selected" && selectedRecipients.length === 0)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"><Send className="h-3.5 w-3.5"/>{busy ? "Sending…" : `${email ? "Notify and email" : "Notify"} ${audienceMode === "selected" ? selectedRecipients.length : students.length} matching students`}</button>
            <p className="text-[11px] leading-4 text-slate-400">Email delivery requires Resend credentials and sends to real stored addresses. WhatsApp is reserved for shortlisted student alerts, which use your approved Meta message template.</p>
          </form>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><MessageCircle className="h-4 w-4 text-emerald-600"/><h2 className="font-bold text-slate-900">Shortlist alert</h2></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Send a private email and WhatsApp message to one student after their application is marked Shortlisted. WhatsApp delivery requires a Meta approved template and the student’s number.</p>
            <form onSubmit={(event) => { event.preventDefault(); const app = shortlisted.find((item) => item.id === shortlistId); void dispatch({ action: "shortlist", applicationId: shortlistId, roundDetails }, `${app?.student_profiles?.full_name || "Student"} · ${app?.drives?.companies?.name || "Drive"}`, "Shortlist"); }} className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Shortlisted student<select required value={shortlistId} onChange={(event) => setShortlistId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="">Choose a shortlisted application</option>{shortlisted.map((item) => <option key={item.id} value={item.id}>{item.student_profiles?.full_name || "Student"}{item.student_profiles?.roll_number ? ` · ${item.student_profiles.roll_number}` : ""} · {item.drives?.companies?.name || "Company"} ({item.drives?.role_title || "Role"})</option>)}</select></label>
              {shortlisted.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">No shortlisted applications are available. Mark the application Shortlisted first.</p>}
              <label className="block text-xs font-semibold text-slate-700">Next steps <span className="font-normal text-slate-400">(optional)</span><textarea value={roundDetails} onChange={(event) => setRoundDetails(event.target.value)} maxLength={2000} rows={3} placeholder="Technical interview on 12 October at 10 AM, Placement Cell…" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
              <button disabled={busy || shortlisted.length === 0} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><Send className="h-3.5 w-3.5"/>{busy ? "Sending…" : "Notify shortlisted student"}</button>
            </form>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Recent dispatches</h2><p className="mt-1 text-xs text-slate-500">Results from this page session.</p><div className="mt-4 space-y-3">{history.map((item, index) => <article key={`${item.sentAt}-${index}`} className="rounded-lg border border-slate-100 p-3"><div className="flex justify-between gap-3"><b className="text-xs text-slate-800">{item.title}</b><span className="shrink-0 text-[10px] text-slate-400">{new Date(item.sentAt).toLocaleTimeString()}</span></div><p className="mt-1 text-[10px] text-slate-500">{item.category} · audience {item.result.audience} · email {item.result.emailSent} · WhatsApp {item.result.whatsappSent} · failed {item.result.failures.length}</p></article>)}{history.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">Dispatch results will appear here after sending.</p>}</div></section>
        </div>
      </div>
    </div>
  </div>;
}
