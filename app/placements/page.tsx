"use client";

import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useApiResource } from "@/lib/useApi";
import { Building2, GraduationCap, TrendingUp } from "lucide-react";
import { UniversityLogo } from "@/components/shared/UniversityLogo";
import { CompanyLogo } from "@/components/shared/CompanyLogo";

const defaultSettings = { publicPlacementProfile: false, collegeName: "", academicYear: "", activeCampus: "" };

export default function PublicPlacementsPage() {
  const [settings] = useLocalStorageState("placement-helper:public-settings:records-v2", defaultSettings);
  const { data: students } = useApiResource<Array<{ id: string }>>("student_profiles", { select: "id", limit: "5000" }, { fallback: [] });
  const { data: applications } = useApiResource<Array<{ student_id: string; drive_id: string; status: string }>>("applications", { select: "id,student_id,drive_id,status", limit: "5000" }, { fallback: [] });
  const { data: drives } = useApiResource<Array<{ id: string; package_lpa?: number | string | null; stipend_monthly?: number | string | null }>>("drives", { select: "id,package_lpa,stipend_monthly", limit: "2000" }, { fallback: [] });
  const { data: companies } = useApiResource<Array<{ id: string; name: string; industry?: string; logo_url?: string; metadata?: { logoColor?: string } }>>("companies", { archived: "eq.false", select: "id,name,industry,logo_url,metadata", limit: "1000" }, { fallback: [] });

  const studentRows = students ?? [];
  const applicationRows = applications ?? [];
  const driveRows = drives ?? [];
  const placedStudentIds = new Set(applicationRows.filter((application) => ["Selected", "Placed", "Offer Received"].includes(application.status)).map((application) => application.student_id));
  const packages = applicationRows.filter((application) => ["Selected", "Placed", "Offer Received"].includes(application.status)).flatMap((application) => {
    const packageLpa = driveRows.find((drive) => drive.id === application.drive_id)?.package_lpa;
    const parsed = Number(packageLpa);
    return packageLpa != null && Number.isFinite(parsed) && parsed > 0 ? [parsed] : [];
  });
  const average = packages.length ? (packages.reduce((total, value) => total + value, 0) / packages.length).toFixed(1) : "—";
  const highest = packages.length ? Math.max(...packages) : 0;
  const placementRate = studentRows.length ? Math.round(placedStudentIds.size / studentRows.length * 100) : 0;

  return <main className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600"><UniversityLogo className="h-10 sm:h-12"/></Link><Link href="/admin/settings" className="text-xs font-semibold text-red-700">Placement office</Link></div></header>
    <div className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:py-14">
      {!settings.publicPlacementProfile ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><b>Public outcomes are unpublished.</b><p className="mt-1">The placement office must enable the public page before campus data is shown here.</p></div> : <>
        <section className="rounded-3xl bg-slate-950 p-8 text-white sm:p-12"><p className="text-xs font-semibold uppercase tracking-wider text-red-200">Campus placements{settings.academicYear ? ` · ${settings.academicYear}` : ""}{settings.activeCampus ? ` · ${settings.activeCampus}` : ""}</p><h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Placement outcomes</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Verified placement and recruiting records for {settings.collegeName || "this campus"}.</p></section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          { label: "Students placed", value: `${placedStudentIds.size} / ${studentRows.length}`, icon: GraduationCap },
          { label: "Placement rate", value: `${placementRate}%`, icon: TrendingUp },
          { label: "Average package", value: average === "—" ? average : `₹${average} LPA`, icon: Building2 },
          { label: "Highest package", value: highest ? `₹${highest} LPA` : "—", icon: Building2 },
        ].map((metric) => <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5"><metric.icon className="h-4 w-4 text-red-600"/><p className="mt-4 text-2xl font-bold text-slate-950">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.label}</p></article>)}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-slate-950">Recruiting partners</h2><p className="mt-1 text-xs text-slate-500">Companies published by the placement office</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(companies ?? []).map((company) => <div key={company.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><CompanyLogo name={company.name} logoColor={company.metadata?.logoColor ?? "#b91c1c"} logoUrl={company.logo_url} size="sm" /><div><p className="text-sm font-semibold text-slate-800">{company.name}</p><p className="text-[10px] text-slate-500">{company.industry}</p></div></div>)}</div></section>
      </>}
    </div>
  </main>;
}
