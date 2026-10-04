"use client";

import { useEffect, useState } from "react";
import { StudentHeader } from "@/components/student/StudentHeader";
import { useApiResource } from "@/lib/useApi";
import { CalendarDays, ExternalLink, MapPin, Video } from "lucide-react";

type CampusEvent = {
  id: string;
  title: string;
  event_type: string;
  custom_event_type?: string | null;
  event_mode?: string;
  location?: string | null;
  description?: string | null;
  meeting_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

function dateLabel(value?: string | null) {
  if (!value) return "Time to be announced";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function StudentEventsPage() {
  const { data, loading, error } = useApiResource<CampusEvent[]>("events", {}, { fallback: [] });
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const events = (data ?? []).filter((event) => !event.starts_at || now === null || new Date(event.starts_at).getTime() >= now);

  return <div>
    <StudentHeader title="Events" subtitle="Upcoming company sessions, lectures, workshops, and campus events" />
    <div className="mx-auto max-w-6xl space-y-5 p-5 sm:p-7">
      <div className="rounded-2xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-red-300"/><div><p className="text-xs font-semibold uppercase tracking-widest text-red-200">Campus calendar</p><h1 className="mt-1 text-2xl font-bold">Upcoming events</h1></div></div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Join company talks and placement events using the details shared by your placement office.</p>
      </div>

      {loading && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading upcoming events…</p>}
      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Could not load events: {error}</p>}
      {!loading && !error && events.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><CalendarDays className="mx-auto h-9 w-9 text-slate-300"/><h2 className="mt-3 font-semibold text-slate-800">No upcoming events yet</h2><p className="mt-1 text-sm text-slate-500">New events from your placement office will appear here.</p></div>}

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">{event.event_type === "Other" ? event.custom_event_type || "Other" : event.event_type} · {event.event_mode || "In person"}</span><h2 className="mt-3 text-lg font-bold text-slate-900">{event.title}</h2></div><Video className="h-5 w-5 shrink-0 text-slate-400"/></div>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600"><CalendarDays className="h-4 w-4 text-red-600"/>{dateLabel(event.starts_at)}</p>
          {event.ends_at && <p className="mt-1 text-xs text-slate-500">Ends {dateLabel(event.ends_at)}</p>}
          {event.location && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600"><MapPin className="h-4 w-4 text-red-600"/>{event.location}</p>}
          {event.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{event.description}</p>}
          {event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"><ExternalLink className="h-4 w-4"/>Join event</a>}
        </article>)}
      </div>
    </div>
  </div>;
}
