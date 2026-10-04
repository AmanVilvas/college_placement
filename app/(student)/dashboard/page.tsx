"use client";

import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { useApiResource } from "@/lib/useApi";
import {
  ArrowRight, ArrowUpRight, Award, BriefcaseBusiness, CalendarDays,
  FileCheck2, RefreshCw, UserRound, Video,
} from "lucide-react";
import { useStudentApplications, useStudentProfile } from "@/lib/studentState";
import { formatPackage, getDaysUntilDeadline } from "@/lib/utils";
import Link from "next/link";

interface ApiDrive {
  id: string;
  company_id: string;
  role_title: string;
  package_lpa?: number;
  stipend_monthly?: number;
  application_deadline?: string;
  drive_date?: string;
  status: string;
  openings: number;
  eligibility?: {
    branches?: string[];
    minCGPA?: number;
    maxBacklogs?: number;
  };
  companies?: { name: string; logo_url?: string; metadata?: { logoColor?: string } };
}

export default function StudentDashboardPage() {
  const { applications } = useStudentApplications();
  const [student] = useStudentProfile();
  const { data: apiDrives, loading: drivesLoading, refetch } = useApiResource<ApiDrive[]>(
    "drives",
    {
      select: "id,company_id,role_title,package_lpa,stipend_monthly,application_deadline,drive_date,status,openings,eligibility,companies(name,logo_url,metadata)",
      status: "eq.Open",
      limit: "100",
    },
    { fallback: [] }
  );

  const activeDrives = (apiDrives ?? [])
    .filter((drive) => drive.status === "Open" || drive.status === "Closing Soon")
    .sort((a, b) => {
      const aDeadline = a.application_deadline ? new Date(a.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bDeadline = b.application_deadline ? new Date(b.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aDeadline - bDeadline;
    });
  const shortlisted = applications.filter((application) => application.status === "Shortlisted").length;
  const interviews = applications.filter((application) => application.status === "Interview").length;
  const offers = applications.filter((application) => application.status === "Selected" || application.status === "Placed").length;
  const firstName = student.name.trim().split(/\s+/)[0] || "there";

  const metrics = [
    { label: "Open drives", value: drivesLoading ? "—" : activeDrives.length, detail: "Accepting applications", Icon: BriefcaseBusiness },
    { label: "Applications", value: applications.length, detail: "In your pipeline", Icon: FileCheck2 },
    { label: "Shortlisted", value: shortlisted, detail: "Moved to next round", Icon: Award },
    { label: "Interviews", value: interviews, detail: "In progress", Icon: Video },
    { label: "Offers", value: offers, detail: "Received", Icon: UserRound },
  ];

  return (
    <div>
      <StudentHeader title="Dashboard" subtitle={`Welcome back, ${firstName} · Placement season 2026`} />

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 sm:px-7">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Your placement workspace</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-[1.75rem]">Good to see you, {firstName}.</h2>
            <p className="mt-1.5 text-sm text-slate-500">Keep your applications moving and find the next opportunity.</p>
          </div>
          <Link href="/drives" className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:self-auto">
            Explore drives <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section aria-label="Placement summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-200/80 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map(({ label, value, detail, Icon }, index) => (
            <div key={label} className={`flex min-h-[108px] flex-col justify-between bg-white p-4 sm:p-5 ${index === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">{label}</span>
                <Icon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <span className="text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">{value}</span>
                <span className="hidden text-[10px] leading-4 text-slate-400 xl:inline">{detail}</span>
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="activity-heading">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h3 id="activity-heading" className="text-base font-semibold tracking-tight text-slate-950">My placement activity</h3>
              <p className="mt-1 text-xs text-slate-500">Open opportunities and your application progress.</p>
            </div>
            <Link href="/applications" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600 transition hover:text-red-700">All applications <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <section aria-labelledby="drives-heading" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                <div>
                  <h4 id="drives-heading" className="text-sm font-semibold text-slate-900">Open drives</h4>
                  <p className="mt-0.5 text-xs text-slate-500">Companies currently recruiting on campus</p>
                </div>
                <button type="button" onClick={refetch} disabled={drivesLoading} aria-label="Refresh open drives" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
                  <RefreshCw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>

              {drivesLoading ? (
                <DataSkeleton label="Loading open drives" variant="rows" count={3} />
              ) : activeDrives.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">No open drives right now</p>
                  <p className="mt-1 text-xs text-slate-500">New opportunities will appear here when they are available.</p>
                </div>
              ) : (
                <div>
                  <div className="hidden grid-cols-[minmax(0,1fr)_minmax(120px,0.55fr)_minmax(90px,0.4fr)] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:grid">
                    <span>Company &amp; role</span><span>Package</span><span>Deadline</span>
                  </div>
                  {activeDrives.slice(0, 5).map((drive) => {
                    const daysLeft = getDaysUntilDeadline(drive.application_deadline ?? "");
                    return (
                      <Link key={drive.id} href={`/companies/${drive.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.55fr)_minmax(90px,0.4fr)] sm:gap-4 sm:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <CompanyLogo name={drive.companies?.name ?? "Company"} logoColor={drive.companies?.metadata?.logoColor ?? "#b91c1c"} logoUrl={drive.companies?.logo_url} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800 group-hover:text-red-700">{drive.companies?.name ?? "Unknown company"}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{drive.role_title}</p>
                          </div>
                        </div>
                        <span className="text-right text-xs font-medium text-slate-700 sm:text-left">{formatPackage(drive.package_lpa, drive.stipend_monthly)}</span>
                        <span className={`hidden text-xs sm:block ${daysLeft <= 3 ? "font-medium text-red-700" : "text-slate-500"}`}>{daysLeft > 0 ? `${daysLeft} days left` : "Closing"}</span>
                        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-red-700 sm:hidden" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              )}
              <Link href="/drives" className="flex items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-red-700">
                Browse all drives <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </section>

            <section aria-labelledby="applications-heading" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                <div>
                  <h4 id="applications-heading" className="text-sm font-semibold text-slate-900">Recent applications</h4>
                  <p className="mt-0.5 text-xs text-slate-500">The latest updates to your progress</p>
                </div>
                <Link href="/applications" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="View all applications"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
              </div>

              {applications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">Your applications will show here</p>
                  <p className="mt-1 text-xs text-slate-500">Browse an open drive to get started.</p>
                  <Link href="/drives" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800">Browse drives <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
                </div>
              ) : (
                <div>
                  {applications.slice(0, 5).map((application) => (
                    <Link key={application.id} href={`/companies/${application.driveId}`} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 transition-colors last:border-0 hover:bg-slate-50/70 sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <CompanyLogo name={application.companyName} logoColor="#b91c1c" size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{application.companyName}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{application.driveName}</p>
                        </div>
                      </div>
                      <StatusBadge status={application.status} size="sm" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>

        <section aria-label="Quick links" className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/profile", title: "Your profile", description: "Keep your details up to date", Icon: UserRound },
            { href: "/workspace", title: "Career workspace", description: "Build skills and prepare", Icon: BriefcaseBusiness },
            { href: "/portfolio", title: "Portfolio preview", description: "Review your professional profile", Icon: CalendarDays },
          ].map(({ href, title, description, Icon }) => (
            <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 transition hover:border-red-200 hover:bg-red-50/30">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-red-50 group-hover:text-red-700"><Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span></span>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-red-700" aria-hidden="true" />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
