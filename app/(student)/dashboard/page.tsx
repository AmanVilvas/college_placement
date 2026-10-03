"use client";

import { StudentHeader } from "@/components/student/StudentHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { useApiResource } from "@/lib/useApi";
import {
  Building2, FileText, Star, Video, Award,
  ArrowRight, Clock, Sparkles, CheckCircle2, RefreshCw,
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
  const { applications: myApplications } = useStudentApplications();
  const [student] = useStudentProfile();

  // Fetch live drives from API; fall back gracefully
  const { data: apiDrives, loading: drivesLoading, refetch } = useApiResource<ApiDrive[]>(
    "drives",
    {
      select: "id,company_id,role_title,package_lpa,stipend_monthly,application_deadline,drive_date,status,openings,eligibility,companies(name,metadata)",
      status: "eq.Open",
      limit: "100",
    },
    { fallback: [] }
  );

  const upcomingDrives = (apiDrives ?? [])
    .filter((d) => d.status === "Open" || d.status === "Closing Soon")
    .sort((a, b) => {
      const aD = a.application_deadline ? new Date(a.application_deadline).getTime() : 0;
      const bD = b.application_deadline ? new Date(b.application_deadline).getTime() : 0;
      return aD - bD;
    })
    .slice(0, 4);

  const totalCompanies = new Set((apiDrives ?? []).map((d) => d.company_id)).size;
  const totalApplications = myApplications.length;
  const shortlisted = myApplications.filter((a) => a.status === "Shortlisted").length;
  const interviews = myApplications.filter((a) => a.status === "Interview").length;
  const offers = myApplications.filter((a) => a.status === "Selected" || a.status === "Placed").length;

  return (
    <div>
      <StudentHeader
        title="Student Workspace"
        subtitle={`Placement Season 2026 · Welcome back, ${student.name.split(" ")[0]}`}
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Welcome Card */}
        <div className="card-clean p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Recruitment Season Active
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {drivesLoading
                ? "Loading available drives…"
                : `${upcomingDrives.length} drive${upcomingDrives.length !== 1 ? "s" : ""} currently accepting applications`}
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Apply through the official links and confirm your participation here to stay eligible.
            </p>
          </div>

          <Link
            href="/drives"
            className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            Explore Opportunities <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Available Drives"
            value={drivesLoading ? "—" : totalCompanies}
            subtitle="Campus partners"
            icon={Building2}
          />
          <StatsCard
            title="Applied"
            value={totalApplications}
            subtitle="Confirmed apps"
            icon={FileText}
          />
          <StatsCard
            title="Shortlists"
            value={shortlisted}
            subtitle="Rounds cleared"
            icon={Star}
          />
          <StatsCard
            title="Interviews"
            value={interviews}
            subtitle="Scheduled"
            icon={Video}
          />
          <StatsCard
            title="Offers"
            value={offers}
            subtitle="Received"
            icon={Award}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Drives - LIVE from API */}
          <div className="card-clean p-5 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Active Placement Drives</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={refetch}
                  disabled={drivesLoading}
                  className="p-1 text-slate-400 hover:text-indigo-500 transition-colors rounded"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${drivesLoading ? "animate-spin" : ""}`} />
                </button>
                <Link href="/drives" className="text-xs font-semibold text-indigo-600 hover:underline">
                  View all →
                </Link>
              </div>
            </div>

            {drivesLoading ? (
              <div className="text-center py-8 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading drives…</p>
              </div>
            ) : upcomingDrives.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No active drives right now</p>
                <p className="text-xs mt-1">Check back later or contact your placement office.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDrives.map((drive) => {
                  const daysLeft = getDaysUntilDeadline(drive.application_deadline ?? "");
                  return (
                    <Link
                      key={drive.id}
                      href={`/companies/${drive.id}`}
                      className="p-3 rounded-xl border border-slate-100 hover:border-slate-300/80 bg-slate-50/50 hover:bg-white flex items-center justify-between gap-3 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyLogo
                          name={drive.companies?.name ?? "?"}
                          logoColor={drive.companies?.metadata?.logoColor ?? "#6366f1"}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {drive.companies?.name ?? "Unknown Company"}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{drive.role_title}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-slate-900">
                          {formatPackage(drive.package_lpa, drive.stipend_monthly)}
                        </p>
                        <p className={`text-[10px] font-semibold ${daysLeft <= 3 ? "text-rose-600" : "text-slate-400"}`}>
                          {daysLeft > 0 ? `${daysLeft}d left` : "Closing"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Applications Status */}
          <div className="card-clean p-5 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">My Registered Applications</h3>
              <Link href="/applications" className="text-xs font-semibold text-indigo-600 hover:underline">
                Track status →
              </Link>
            </div>

            {myApplications.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No applications yet</p>
                <Link href="/drives" className="text-xs text-indigo-600 font-semibold hover:underline mt-1 block">
                  Browse open drives →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myApplications.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyLogo name={app.companyName} logoColor="#4f46e5" size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{app.companyName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{app.driveName}</p>
                      </div>
                    </div>

                    <StatusBadge status={app.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick tools */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "My Profile", href: "/profile", icon: Sparkles, color: "from-indigo-50 to-indigo-100/50" },
            { label: "Applications", href: "/applications", icon: CheckCircle2, color: "from-emerald-50 to-emerald-100/50" },
            { label: "All Drives", href: "/drives", icon: Building2, color: "from-violet-50 to-violet-100/50" },
            { label: "Resources", href: "/workspace", icon: Award, color: "from-amber-50 to-amber-100/50" },
          ].map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`card-clean p-4 bg-gradient-to-br ${tool.color} flex items-center gap-3 group hover:scale-[1.02] transition-transform`}
            >
              <tool.icon className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
              <span className="text-xs font-semibold text-slate-700">{tool.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
