"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import {
  Users, UserCheck, UserX, Building2, CalendarDays,
  AlertCircle, Bell, ArrowRight, TrendingUp, Activity,
} from "lucide-react";
import { students, getStudentStats } from "@/lib/data/students";
import { drives } from "@/lib/data/companies";
import { applications, getFollowUpRequired } from "@/lib/data/applications";
import { formatPackage, formatDate, getDaysUntilDeadline } from "@/lib/utils";
import Link from "next/link";

export default function AdminDashboardPage() {
  const stats = getStudentStats();
  const activeDrives = drives.filter((d) => d.status === "Open" || d.status === "Closing Soon");
  const followUps = getFollowUpRequired();
  const pendingConfirmations = applications.filter((a) => a.status === "Not Responded");
  const recentApps = applications.slice(-5).reverse();

  return (
    <div>
      <AdminHeader
        title="Placement Cell Overview"
        subtitle="Batch 2026 Recruitment Statistics & Operations"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Urgent Action Callout */}
        {followUps.length > 0 && (
          <div className="card-clean p-4 bg-white border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 flex-shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {followUps.length} candidates pending confirmation or round progression
                </p>
                <p className="text-[11px] text-slate-500">
                  Students have not confirmed external applications or need status updates.
                </p>
              </div>
            </div>

            <Link
              href="/admin/followups"
              className="text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 self-start sm:self-auto"
            >
              Open Follow-up Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Clean KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Registered"
            value={stats.total}
            subtitle="Final year batch"
            icon={Users}
          />
          <StatsCard
            title="Placed Candidates"
            value={stats.placed}
            subtitle={`${Math.round((stats.placed / stats.total) * 100)}% placement rate`}
            icon={UserCheck}
            trend={{ value: 12, label: "vs 2025" }}
          />
          <StatsCard
            title="In Process"
            value={stats.inProcess}
            subtitle="Active interviews"
            icon={Activity}
          />
          <StatsCard
            title="Unplaced"
            value={stats.unplaced}
            subtitle="Needs focus"
            icon={UserX}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            title="Partner Organizations"
            value={drives.length}
            subtitle="Recruiting partners"
            icon={Building2}
          />
          <StatsCard
            title="Active Drives"
            value={activeDrives.length}
            subtitle="Open opportunities"
            icon={CalendarDays}
          />
          <StatsCard
            title="Unconfirmed Receipts"
            value={pendingConfirmations.length}
            subtitle="Pending follow-up"
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

            <div className="space-y-3">
              {activeDrives.map((drive) => {
                const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);
                const driveApps = applications.filter((a) => a.driveId === drive.id);
                const confirmed = driveApps.filter((a) => a.status === "Confirmed").length;

                return (
                  <Link
                    key={drive.id}
                    href={`/admin/companies/${drive.companyId}`}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300/80 bg-slate-50/50 hover:bg-white flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyLogo name={drive.companyName} logoColor={drive.companyLogoColor} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {drive.companyName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{drive.role}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-slate-800">{confirmed} Confirmed</p>
                      <p className={`text-[10px] font-semibold ${daysLeft <= 3 ? "text-rose-600" : "text-slate-400"}`}>
                        {daysLeft > 0 ? `${daysLeft}d left` : "Closed"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Candidate Actions */}
          <div className="card-clean p-5 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Recent Candidate Activity</h3>
              <Link href="/admin/applications" className="text-xs font-semibold text-indigo-600 hover:underline">
                View all logs →
              </Link>
            </div>

            <div className="space-y-3">
              {recentApps.map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{app.studentName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{app.companyName} • {app.driveName}</p>
                  </div>
                  <StatusBadge status={app.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
