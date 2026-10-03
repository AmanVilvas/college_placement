"use client";

import { FormEvent, useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useApiResource } from "@/lib/useApi";
import { CheckCircle2, Mail, MessageCircle, Megaphone, Send, TriangleAlert, Users } from "lucide-react";

type ApiApplication = {
  id: string; status: string; student_profiles?: { full_name?: string; roll_number?: string; department?: string };
  drives?: { role_title?: string; companies?: { name?: string } };
};
type Result = { audience: number; emailSent: number; whatsappSent: number; failures: { recipient: string; channel: string; error: string }[] };
type Dispatch = { title: string; category: string; sentAt: string; result: Result };

export default function AdminNotificationsPage() {
  const { data: applications } = useApiResource<ApiApplication[]>("applications", {
    select: "id,status,student_profiles(full_name,roll_number,department),drives(role_title,companies(name))", order: "updated_at.desc", limit: "1000",
  }, { fallback: [] });
  const shortlisted = useMemo(() => (applications || []).filter((item) => item.status.toLowerCase() === "shortlisted"), [applications]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Company announcement");
  const [companyName, setCompanyName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState(true);
  const [shortlistId, setShortlistId] = useState("");
  const [roundDetails, setRoundDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Dispatch[]>([]);

  async function dispatch(payload: Record<string, unknown>, label: string, kind: string) {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
    void dispatch({ action: "broadcast", title, message, category, companyName, department: department || undefined, channels: { email, whatsapp: false } }, title, category);
  }

  return <div>
    <AdminHeader title="Campus Broadcasts" subtitle="Email students about company drives, placement news, and industry talks; notify shortlisted candidates directly." />
    <div className="space-y-6 p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><Users className="h-5 w-5 text-indigo-600"/><div><p className="text-xs text-slate-500">Campus audience</p><p className="text-lg font-bold text-slate-900">All registered students</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><Mail className="h-5 w-5 text-indigo-600"/><div><p className="text-xs text-slate-500">Broadcast channel</p><p className="text-lg font-bold text-slate-900">Email</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><MessageCircle className="h-5 w-5 text-emerald-600"/><div><p className="text-xs text-slate-500">Shortlist alert</p><p className="text-lg font-bold text-slate-900">Email + WhatsApp</p></div></div>
      </div>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}
      {result && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4"/>Dispatch completed</div><p className="mt-1">Audience {result.audience} · Email sent {result.emailSent} · WhatsApp sent {result.whatsappSent} · Failed {result.failures.length}</p>{result.failures.length > 0 && <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs">{result.failures.slice(0, 10).map((failure, index) => <li key={`${failure.recipient}-${index}`}>{failure.recipient} ({failure.channel}): {failure.error}</li>)}</ul>}</div>}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><Megaphone className="h-4 w-4 text-indigo-600"/><h2 className="font-bold text-slate-900">Send campus broadcast</h2></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Email every student in your campus, or filter the audience by department. Use this for new company drives, placement announcements, industry talks, and other campus notices.</p>
          <form onSubmit={sendBroadcast} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Message type<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option>Company announcement</option><option>Industry talk</option><option>Placement update</option><option>General notice</option></select></label>
              <label className="text-xs font-semibold text-slate-700">Audience<select value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="">All campus students</option>{["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">Company or host name <span className="font-normal text-slate-400">(optional)</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={120} placeholder="e.g. Acme Technologies or Alumni Network" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="block text-xs font-semibold text-slate-700">Email subject<input required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New placement drive: Software Engineer" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="block text-xs font-semibold text-slate-700">Announcement details<textarea required minLength={5} maxLength={5000} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share eligibility, schedule, venue, registration link, or talk details…" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
            <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} className="mt-0.5 accent-indigo-600"/><span><b>Email recipients individually</b><span className="block mt-0.5">Each student receives a private email. No student address is exposed to others.</span></span></label>
            <button disabled={busy || !email} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Send className="h-3.5 w-3.5"/>{busy ? "Sending…" : "Send broadcast email"}</button>
            <p className="text-[11px] leading-4 text-slate-400">Email delivery requires Resend credentials in the server environment. WhatsApp is reserved for shortlisted student alerts, which use your approved Meta message template.</p>
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
