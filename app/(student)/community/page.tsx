"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentHeader } from "@/components/student/StudentHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { CompanyGroupChat } from "@/components/community/CompanyGroupChat";
import { useApiResource } from "@/lib/useApi";
import type { CommunityCompany } from "@/lib/companyCommunityTypes";
import { ArrowUpRight, Building2, RefreshCw, Users } from "lucide-react";

export default function StudentCommunityPage() {
  const { data, loading, error, refetch } = useApiResource<CommunityCompany[]>("community", {}, { fallback: [] });
  const companies = useMemo(() => data ?? [], [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = companies.find((company) => company.id === selectedId) ?? companies[0];

  useEffect(() => {
    const selectionTimer = window.setTimeout(() => {
      const companyId = new URLSearchParams(window.location.search).get("companyId");
      if (companyId) setSelectedId(companyId);
    }, 0);
    const refreshGroups = () => { void refetch(); };
    window.addEventListener("focus", refreshGroups);
    return () => { window.clearTimeout(selectionTimer); window.removeEventListener("focus", refreshGroups); };
  }, [refetch]);

  return <div className="flex min-h-full flex-col">
    <StudentHeader title="Community" subtitle="Company group chats, placement updates, files, and polls" />
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-5 p-4 sm:p-7">
      <section className="flex items-center gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
        <div className="rounded-xl bg-white/10 p-3"><Users className="h-6 w-6 text-indigo-200"/></div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">Placement communities</p>
          <h1 className="mt-1 text-xl font-bold">Your company groups</h1><p className="mt-1 text-xs text-slate-300">Company updates for your campus, with drive-specific posts shown according to eligibility.</p>
          </div>
          </section>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Could not load your company communities: {error}</p>
      }
      <button type="button" onClick={() => void refetch()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>Refresh groups</button>
      {loading &&
      <div className="h-72 animate-pulse rounded-2xl bg-white"/>}
      {!loading && !error && companies.length === 0 && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Building2 className="mx-auto h-10 w-10 text-slate-300"/><h2 className="mt-3 font-semibold text-slate-800">No company groups yet</h2><p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">Companies appear here when the placement office registers them for your campus.</p></section>}
      {!loading && selected && <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <h2 className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Campus groups · {companies.length}</h2>
          {companies.map((company) => <button key={company.id} onClick={() => setSelectedId(company.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selected.id === company.id ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"}`}><CompanyLogo name={company.name} logoColor={company.metadata?.logoColor ?? "#334155"} logoUrl={company.logo_url ?? undefined} size="sm"/><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900">{company.name}</span><span className="block truncate text-[10px] text-slate-500">{company.drives.map((drive) => drive.role_title).join(", ")}</span></span><span className="rounded-full bg-white px-2 py-0.5 text-[9px] text-slate-500">{company.drives.length}</span></button>)}
          {selected.description && <div className="mt-3 border-t border-slate-100 px-2 pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">About {selected.name}</p><p className="mt-1.5 text-[11px] leading-5 text-slate-600">{selected.description}</p>{selected.website && <a href={selected.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline">Company website <ArrowUpRight className="h-3 w-3"/></a>}</div>}
          <p className="px-2 pt-2 text-[10px] leading-4 text-slate-400">General company updates are visible to campus students. Drive-specific posts follow your eligibility.</p>
        </aside>
        <div className="min-w-0"><CompanyGroupChat key={selected.id} company={selected} isStaff={false}/></div>
      </div>}
    </div>
  </div>;
}
