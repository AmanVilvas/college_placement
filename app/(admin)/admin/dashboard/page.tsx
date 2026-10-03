"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { useApiResource } from "@/lib/useApi";
import {
  Users, UserCheck, UserX, Building2, CalendarDays,
  AlertCircle, ArrowRight, Activity, RefreshCw, Wifi, WifiOff,
} from "lucide-react";
import { formatPackage, getDaysUntilDeadline } from "@/lib/utils";
import Link from "next/link";

interface ApiDrive {
  id: string;
  company_id: string;
  role_title: string;
  package_lpa?: number;
  stipend_monthly?: number;
  application_deadline?: string;
  status: string;
  companies?: { name: string; metadata?: { logoColor?: string } };
}

interface ApiCompany {
  id: string;
}

interface ApiStudentProfile {
  id: string;
}

interface ApiApplication {
  id: string;
  status: string;
  student_profiles?: { full_name?: string; profiles?: { full_name: string } };
  drives?: { role_title: string; companies?: { name: string } };
}

export default function AdminDashboardPage() {
  const { data: companyData, loading: companyLoading } = useApiResource<ApiCompany[]>(
    "companies", { select: "id", archived: "eq.false", limit: "5000" }, { fallback: [] }
  );

  const { data: studentData, loading: studLoading } = useApiResource<ApiStudentProfile[]>(
    "student_profiles", { select: "id", limit: "5000" }, { fallback: [] }
  );

  const { data: driveData, loading: driveLoading, refetch: refetchDrives } = useApiResource<ApiDrive[]>(
    "drives",
    { select: "id,company_id,role_title,package_lpa,stipend_monthly,application_deadline,status,companies(name,metadata)", limit: "200" },
    { fallback: [] }
  );

  const { data: appData, loading: appLoading } = useApiResource<ApiApplication[]>(
    "applications",
    { select: "id,status,student_profiles(full_name,profiles(full_name)),drives(role_title,companies(name))", limit: "200" },
    { fallback: [] }
  );

  const isLive = !studLoading && !driveLoading && !appLoading &&
    ((studentData && studentData.length > 0) || (driveData && driveData.length > 0));

  const totalStudents = studentData?.length ?? 0;
  const totalCompanies = companyData?.length ?? 0;
  const totalDrives = driveData?.length ?? 0;
  const activeDrives = (driveData ?? []).filter((d) => d.status === "Open" || d.status === "Closing Soon");
  const totalApplications = appData?.length ?? 0;
  const pendingApps = (appData ?? []).filter((a) => a.status === "Applied").length;

  // Compute placed: drives that are Completed + students who got offers
  const selectedApps = (appData ?? []).filter((a) => a.status === "Selected" || a.status === "Placed" || a.status === "Offer Received");

  const recentApps = (appData ?? []).slice(0, 6);

  return (
    <div>
      <AdminHeader
        title="Placement Cell Overview"
        subtitle="Real-time campus placement statistics & operations"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Live data indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected to Supabase (Live 24/7)
            </div>
            <span className="text-slate-500 text-xs hidden sm:inline">
              · {totalStudents} live student record{totalStudents !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={refetchDrives}
            disabled={driveLoading}
            className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${driveLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Action callout when there are pending applications */}
        {pendingApps > 0 && (
          <div className="card-clean p-4 bg-white border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 flex-shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {pendingApps} application{pendingApps !== 1 ? "s" : ""} pending review
                </p>
                <p className="text-[11px] text-slate-500">
                  Students have applied and are awaiting status updates.
                </p>
              </div>
            </div>

            <Link
              href="/admin/applications"
              className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 self-start sm:self-auto"
            >
              Review Applications <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Students"
            value={studLoading ? "—" : totalStudents}
            subtitle="Imported + registered"
            icon={Users}
          />
          <StatsCard
            title="Selected / Placed"
            value={appLoading ? "—" : selectedApps.length}
            subtitle={totalStudents > 0 ? `${Math.round((selectedApps.length / totalStudents) * 100)}% placement rate` : "—"}
            icon={UserCheck}
          />
          <StatsCard
            title="In Process"
            value={appLoading ? "—" : (appData ?? []).filter((a) => ["Shortlisted", "Interview", "Test"].includes(a.status)).length}
            subtitle="Active in pipeline"
            icon={Activity}
          />
          <StatsCard
            title="Unplaced"
            value={studLoading || appLoading ? "—" : Math.max(0, totalStudents - selectedApps.length)}
            subtitle="Needs focus"
            icon={UserX}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            title="Partner Companies"
            value={companyLoading ? "—" : totalCompanies}
            subtitle="Recruiting partners"
            icon={Building2}
          />
          <StatsCard
            title="Active Drives"
            value={driveLoading ? "—" : activeDrives.length}
            subtitle="Open opportunities"
            icon={CalendarDays}
          />
          <StatsCard
            title="Total Applications"
            value={appLoading ? "—" : totalApplications}
            subtitle="Across all drives"
            icon={AlertCircle}
          />
        </div>

        {/* Drives & Recent Applications */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Drives */}
          <div className="card-clean p-5 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Active Placement Drives</h3>
              <Link href="/admin/drives" className="text-xs font-semibold text-indigo-600 hover:underline">
                Manage drives →
              </Link>
            </div>

            {driveLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading drives…
              </div>
            ) : activeDrives.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No active drives yet</p>
                <Link href="/admin/drives" className="text-xs text-indigo-600 font-semibold hover:underline mt-1 block">
                  Add a drive →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeDrives.slice(0, 5).map((drive) => {
                  const daysLeft = getDaysUntilDeadline(drive.application_deadline ?? "");
                  return (
                    <Link
                      key={drive.id}
                      href={`/admin/companies/${drive.company_id}`}
                      className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300/80 bg-slate-50/50 hover:bg-white flex items-center justify-between gap-3 transition-all group"
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
                        <p className="text-xs font-semibold text-slate-800">
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

          {/* Recent Applications */}
          <div className="card-clean p-5 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Recent Candidate Activity</h3>
              <Link href="/admin/applications" className="text-xs font-semibold text-indigo-600 hover:underline">
                View all →
              </Link>
            </div>

            {appLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading applications…
              </div>
            ) : recentApps.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No applications yet</p>
                <p className="text-xs mt-1">Import student data to get started</p>
                <Link href="/admin/students" className="text-xs text-indigo-600 font-semibold hover:underline mt-1 block">
                  Import students →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {app.student_profiles?.full_name || app.student_profiles?.profiles?.full_name || "Unknown Student"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {app.drives?.companies?.name ?? "Unknown"} • {app.drives?.role_title ?? ""}
                      </p>
                    </div>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick action card for empty state */}
        {!studLoading && totalStudents === 0 && (
          <div className="card-clean p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 text-center space-y-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl mx-auto flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-900">Start by importing students</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Upload your student data from Excel or CSV — the entire placement system will populate with real data visible to all students.
            </p>
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Import Students <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
