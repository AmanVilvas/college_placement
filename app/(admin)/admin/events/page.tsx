"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { apiMutate, useApiResource } from "@/lib/useApi";
import { CalendarDays, ExternalLink, MapPin, Plus, Users, Video } from "lucide-react";

type CampusEvent = { id: string; title: string; event_type: string; custom_event_type?: string | null; event_mode?: string; location?: string | null; audience?: Audience; description?: string | null; meeting_url?: string | null; starts_at?: string | null; ends_at?: string | null };
type StudentOption = { id: string; full_name: string; roll_number: string; department: string };
type AudienceOptions = { students: StudentOption[]; branches: string[] };
type Audience = { kind: "campus" } | { kind: "branch"; branches: string[] } | { kind: "applied" } | { kind: "placed" } | { kind: "students"; studentIds: string[] };
const emptyForm = { title: "", event_type: "Company session", custom_event_type: "", event_mode: "In person", location: "", description: "", meeting_url: "", starts_at: "", ends_at: "" };
function dateLabel(value?: string | null) { return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Time to be announced"; }
function audienceLabel(audience?: Audience) {
  if (!audience || audience.kind === "campus") return "All campus students";
  if (audience.kind === "branch") return `Branches: ${audience.branches.join(", ")}`;
  if (audience.kind === "applied") return "Students who have applied";
  if (audience.kind === "placed") return "Placed students";
  return `${audience.studentIds.length} selected student${audience.studentIds.length === 1 ? "" : "s"}`;
}

export default function AdminEventsPage() {
  const { data, loading, error, refetch } = useApiResource<CampusEvent[]>("events", {}, { fallback: [] });
  const { data: audienceOptions } = useApiResource<AudienceOptions>("events/audience-options", {}, { fallback: { students: [], branches: [] } });
  const students = audienceOptions?.students ?? [];
  const branches = audienceOptions?.branches ?? [];
  const [form, setForm] = useState(emptyForm);
  const [audienceKind, setAudienceKind] = useState<Audience["kind"]>("campus");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setMessageError(false);
    try {
      const audience: Audience = audienceKind === "branch" ? { kind: "branch", branches: selectedBranches } : audienceKind === "students" ? { kind: "students", studentIds: selectedStudents } : { kind: audienceKind } as Audience;
      await apiMutate("POST", "events", { ...form, starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString(), audience });
      await refetch(); setForm(emptyForm); setAudienceKind("campus"); setSelectedBranches([]); setSelectedStudents([]); setMessage("Event published to the selected student group.");
    } catch (cause) { setMessageError(true); setMessage(cause instanceof Error ? cause.message : "Could not publish the event."); }
    finally { setSaving(false); }
  }

  const upcoming = (data ?? []).filter((event) => !event.starts_at || new Date(event.starts_at).getTime() >= Date.now());
  const past = (data ?? []).filter((event) => event.starts_at && new Date(event.starts_at).getTime() < Date.now());
  const field = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal";
  return <div>
    <AdminHeader title="Events" subtitle="Publish company sessions, guest lectures, workshops, and campus events" />
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-7">
      {message && <p role={messageError ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${messageError ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Could not load events: {error}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Plus className="h-5 w-5 text-red-600"/><h2 className="text-base font-bold text-slate-900">Create an event</h2></div>
        <p className="mt-1 text-xs text-slate-500">Choose who should see this event. Students outside the selected group will not see it.</p>
        <form onSubmit={createEvent} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Event name<input required minLength={3} maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Example: Celebal Technologies — CST lecture" className={field}/></label>
          <label className="text-xs font-semibold text-slate-700">Event type<select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className={field}>{["Company session", "Guest lecture", "Workshop", "Webinar", "Campus event", "Other"].map((type) => <option key={type}>{type}</option>)}</select></label>
          {form.event_type === "Other" && <label className="text-xs font-semibold text-slate-700">Name this event type<input required maxLength={80} value={form.custom_event_type} onChange={(e) => setForm({ ...form, custom_event_type: e.target.value })} placeholder="e.g. Hiring assessment" className={field}/></label>}
          <label className="text-xs font-semibold text-slate-700">Event format<select value={form.event_mode} onChange={(e) => setForm({ ...form, event_mode: e.target.value })} className={field}>{["In person", "Remote", "Hybrid"].map((mode) => <option key={mode}>{mode}</option>)}</select></label>
          {form.event_mode !== "Remote" && <label className="text-xs font-semibold text-slate-700">College location<input required maxLength={300} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Block 3, Seminar Hall" className={field}/></label>}
          {form.event_mode !== "In person" && <label className="text-xs font-semibold text-slate-700">Google Meet or event link<input required type="url" value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://meet.google.com/..." className={field}/></label>}
          <label className="text-xs font-semibold text-slate-700">Start date and time<input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={field}/></label>
          <label className="text-xs font-semibold text-slate-700">End date and time<input required type="datetime-local" min={form.starts_at || undefined} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={field}/></label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Details<textarea rows={3} maxLength={4000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Agenda, preparation, or joining instructions" className={field}/></label>
          <fieldset className="rounded-xl border border-slate-200 p-4 sm:col-span-2"><legend className="px-1 text-xs font-bold text-slate-800">Who can see this event?</legend>
            <label className="flex items-start gap-2 py-1.5 text-xs text-slate-700"><input type="radio" name="audience" checked={audienceKind === "campus"} onChange={() => setAudienceKind("campus")}/>All students in this campus</label>
            <label className="flex items-start gap-2 py-1.5 text-xs text-slate-700"><input type="radio" name="audience" checked={audienceKind === "branch"} onChange={() => setAudienceKind("branch")}/>Selected branch(es)</label>
            {audienceKind === "branch" && <div className="ml-6 grid gap-2 py-2 sm:grid-cols-3">{branches.length ? branches.map((branch) => <label key={branch} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedBranches.includes(branch)} onChange={(e) => setSelectedBranches(e.target.checked ? [...selectedBranches, branch] : selectedBranches.filter((b) => b !== branch))}/>{branch}</label>) : <span className="text-xs text-slate-500">No student branches found.</span>}</div>}
            <label className="flex items-start gap-2 py-1.5 text-xs text-slate-700"><input type="radio" name="audience" checked={audienceKind === "applied"} onChange={() => setAudienceKind("applied")}/>Students who have applied to a placement drive</label>
            <label className="flex items-start gap-2 py-1.5 text-xs text-slate-700"><input type="radio" name="audience" checked={audienceKind === "placed"} onChange={() => setAudienceKind("placed")}/>Placed students</label>
            <label className="flex items-start gap-2 py-1.5 text-xs text-slate-700"><input type="radio" name="audience" checked={audienceKind === "students"} onChange={() => setAudienceKind("students")}/><Users className="h-4 w-4"/>Choose a student group</label>
            {audienceKind === "students" && <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-100 p-2">{students.length ? students.map((student) => <label key={student.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-slate-50"><input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={(e) => setSelectedStudents(e.target.checked ? [...selectedStudents, student.id] : selectedStudents.filter((id) => id !== student.id))}/><span className="font-medium">{student.full_name || "Unnamed student"}</span><span className="text-slate-500">{student.roll_number} · {student.department}</span></label>) : <p className="p-2 text-xs text-slate-500">No students available to select.</p>}</div>}
          </fieldset>
          <div className="sm:col-span-2"><button disabled={saving || (audienceKind === "branch" && selectedBranches.length === 0) || (audienceKind === "students" && selectedStudents.length === 0)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"><CalendarDays className="h-4 w-4"/>{saving ? "Publishing…" : "Publish event"}</button></div>
        </form>
      </section>

      <section className="space-y-3"><div><h2 className="text-base font-bold text-slate-900">Upcoming events</h2><p className="text-xs text-slate-500">Events show only to the audience selected above.</p></div>
        {loading && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading events…</p>}
        {!loading && upcoming.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center text-sm text-slate-500">No upcoming events have been published.</p>}
        <div className="grid gap-3 md:grid-cols-2">{upcoming.map((event) => <article key={event.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><Video className="mt-0.5 h-5 w-5 text-red-600"/><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-red-700">{event.event_type === "Other" ? event.custom_event_type : event.event_type} · {event.event_mode || "In person"}</p><h3 className="mt-1 font-semibold text-slate-900">{event.title}</h3><p className="mt-1 text-xs text-slate-500">{dateLabel(event.starts_at)}{event.ends_at ? ` – ${dateLabel(event.ends_at)}` : ""}</p>{event.location && <p className="mt-2 flex items-center gap-1 text-xs text-slate-600"><MapPin className="h-3 w-3"/>{event.location}</p>}<p className="mt-2 text-xs font-medium text-indigo-700">{audienceLabel(event.audience)}</p>{event.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{event.description}</p>}{event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 underline">Open meeting link <ExternalLink className="h-3 w-3"/></a>}</div></div></article>)}</div>
      </section>
      {past.length > 0 && <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Past events ({past.length})</summary><div className="mt-3 space-y-2">{past.map((event) => <p key={event.id} className="text-xs text-slate-500">{dateLabel(event.starts_at)} · {event.title}</p>)}</div></details>}
    </div>
  </div>;
}
