"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { apiMutate, useApiResource } from "@/lib/useApi";
import { CalendarDays, ExternalLink, Plus, Video } from "lucide-react";

type CampusEvent = {
  id: string;
  title: string;
  event_type: string;
  description?: string | null;
  meeting_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

const emptyForm = { title: "", event_type: "Company session", description: "", meeting_url: "", starts_at: "", ends_at: "" };
function dateLabel(value?: string | null) {
  if (!value) return "Time to be announced";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminEventsPage() {
  const { data, loading, error, refetch } = useApiResource<CampusEvent[]>("events", {}, { fallback: [] });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setMessageError(false);
    try {
      await apiMutate("POST", "events", { ...form, starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString() });
      await refetch(); setForm(emptyForm); setMessage("Event published. Students can now find it in Events in their sidebar.");
    } catch (cause) {
      setMessageError(true); setMessage(cause instanceof Error ? cause.message : "Could not publish the event.");
    } finally { setSaving(false); }
  }

  const upcoming = (data ?? []).filter((event) => !event.starts_at || new Date(event.starts_at).getTime() >= Date.now());
  const past = (data ?? []).filter((event) => event.starts_at && new Date(event.starts_at).getTime() < Date.now());

  return <div>
    <AdminHeader title="Events" subtitle="Publish company sessions, guest lectures, workshops, and campus events" />
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-7">
      {message && <p role={messageError ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${messageError ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Could not load events: {error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Plus className="h-5 w-5 text-red-600"/><h2 className="text-base font-bold text-slate-900">Create an event</h2></div>
        <p className="mt-1 text-xs text-slate-500">Published events appear in the Events tab for students in this campus.</p>
        <form onSubmit={createEvent} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Event title<input required minLength={3} maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Example: Celebal Technologies — CST lecture" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
          <label className="text-xs font-semibold text-slate-700">Event type<select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">{["Company session", "Guest lecture", "Workshop", "Webinar", "Campus event", "Other"].map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-700">Google Meet or event link<input type="url" value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://meet.google.com/..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
          <label className="text-xs font-semibold text-slate-700">Starts<input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
          <label className="text-xs font-semibold text-slate-700">Ends<input required type="datetime-local" min={form.starts_at || undefined} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Details<textarea rows={3} maxLength={4000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Agenda, audience, preparation, or joining instructions" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
          <div className="sm:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"><CalendarDays className="h-4 w-4"/>{saving ? "Publishing…" : "Publish event to students"}</button></div>
        </form>
      </section>

      <section className="space-y-3">
        <div><h2 className="text-base font-bold text-slate-900">Upcoming events</h2><p className="text-xs text-slate-500">Visible to students from the Events sidebar item.</p></div>
        {loading && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading events…</p>}
        {!loading && upcoming.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center text-sm text-slate-500">No upcoming events have been published.</p>}
        <div className="grid gap-3 md:grid-cols-2">{upcoming.map((event) => <article key={event.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><Video className="mt-0.5 h-5 w-5 text-red-600"/><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-red-700">{event.event_type}</p><h3 className="mt-1 font-semibold text-slate-900">{event.title}</h3><p className="mt-1 text-xs text-slate-500">{dateLabel(event.starts_at)}{event.ends_at ? ` – ${dateLabel(event.ends_at)}` : ""}</p>{event.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{event.description}</p>}{event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 underline">Open meeting link <ExternalLink className="h-3 w-3"/></a>}</div></div></article>)}</div>
      </section>
      {past.length > 0 && <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Past events ({past.length})</summary><div className="mt-3 space-y-2">{past.map((event) => <p key={event.id} className="text-xs text-slate-500">{dateLabel(event.starts_at)} · {event.title}</p>)}</div></details>}
    </div>
  </div>;
}
