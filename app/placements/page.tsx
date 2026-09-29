"use client";

import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { applications } from "@/lib/data/applications";
import { companies, drives } from "@/lib/data/companies";
import { students } from "@/lib/data/students";
import { Building2, GraduationCap, TrendingUp } from "lucide-react";

const defaultSettings = { publicPlacementProfile: false, collegeName: "National Institute of Technology & Engineering", academicYear: "2025-2026", activeCampus: "Main Campus" };

export default function PublicPlacementsPage() {
  const [settings] = useLocalStorageState("placement-helper:settings", defaultSettings);
  const placed = new Set(applications.filter((application) => application.status === "Placed").map((application) => application.studentId));
  const samplePackages = applications.filter((application) => application.status === "Placed").map((application) => drives.find((drive) => drive.companyId === application.companyId)?.packageLPA).filter((value): value is number => typeof value === "number");
  const average = samplePackages.length ? (samplePackages.reduce((sum, value) => sum + value, 0) / samplePackages.length).toFixed(1) : "—";
  const highest = samplePackages.length ? Math.max(...samplePackages) : 0;
  const placementRate = students.length ? Math.round(placed.size / students.length * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="rounded-lg bg-slate-900 p-2 text-white"><GraduationCap className="h-4 w-4"/></span>{settings.collegeName}</Link><Link href="/admin/settings" className="text-xs font-semibold text-indigo-700">Placement office preview</Link></div></header>
      <div className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:py-14">
        {!settings.publicPlacementProfile && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><b>Public page is disabled.</b> This preview is visible only in the demo. Enable it in placement settings to show the sample public profile state.</div>}
        <section className="rounded-3xl bg-slate-950 p-8 text-white sm:p-12"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Campus placements · {settings.academicYear} · {settings.activeCampus}</p><h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Career outcomes built on student potential.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Explore a snapshot of campus placement outcomes, recruiting partners, and opportunities at {settings.collegeName}.</p></section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          { label: "Students placed", value: `${placed.size} / ${students.length}`, icon: GraduationCap },
          { label: "Placement rate", value: `${placementRate}%`, icon: TrendingUp },
          { label: "Average package", value: average === "—" ? average : `₹${average} LPA`, icon: Building2 },
          { label: "Highest package", value: highest ? `₹${highest} LPA` : "—", icon: Building2 },
        ].map((metric) => <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5"><metric.icon className="h-4 w-4 text-indigo-600"/><p className="mt-4 text-2xl font-bold text-slate-950">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.label}</p></article>)}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-slate-950">Recruiting partners</h2><p className="mt-1 text-xs text-slate-500">Companies in the local placement sample</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{companies.map((company) => <div key={company.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: company.logoColor }}>{company.name.slice(0, 2).toUpperCase()}</span><div><p className="text-sm font-semibold text-slate-800">{company.name}</p><p className="text-[10px] text-slate-500">{company.industry}</p></div></div>)}</div></section>
        <p className="text-center text-[10px] text-slate-400">Figures are computed from seeded sample records and are not verified placement outcomes. Do not publish this demo as official institutional reporting.</p>
      </div>
    </main>
  );
}
