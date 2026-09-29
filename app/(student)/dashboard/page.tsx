"use client";

import { StudentHeader } from "@/components/student/StudentHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import {
  Building2, FileText, Star, Video, Award, TrendingUp,
  ArrowRight, Clock, Bell, Sparkles, CheckCircle2,
} from "lucide-react";
import { drives as seededDrives } from "@/lib/data/companies";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useStudentApplications, useStudentProfile } from "@/lib/studentState";
import { formatDate, formatPackage, getDaysUntilDeadline } from "@/lib/utils";
import Link from "next/link";

export default function StudentDashboardPage() {
  const { applications: myApplications } = useStudentApplications();
  const [student] = useStudentProfile();
  const [drives] = useLocalStorageState("placement-helper:drives", seededDrives);
  const totalCompanies = new Set(drives.map((drive) => drive.companyId)).size;
  const totalApplications = myApplications.length;
  const shortlisted = myApplications.filter((a) => a.status === "Shortlisted").length;
  const interviews = myApplications.filter((a) => a.status === "Interview").length;
  const offers = myApplications.filter((a) => a.status === "Selected" || a.status === "Placed").length;

  const upcomingDrives = drives
    .filter((d) => d.status === "Open" || d.status === "Closing Soon")
    .sort((a, b) => new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime())
    .slice(0, 4);

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
              {upcomingDrives.length} drives currently accepting applications
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Make sure to complete external applications and confirm your participation here to stay eligible.
            </p>
          </div>

          <Link
            href="/companies"
            className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            Explore Opportunities <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Minimalist Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Available Drives"
            value={totalCompanies}
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
          {/* Active Drives */}
          <div className="card-clean p-5 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Active Placement Drives</h3>
              <Link href="/companies" className="text-xs font-semibold text-indigo-600 hover:underline">
                View all ({drives.length}) →
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingDrives.map((drive) => {
                const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);
                return (
                  <Link
                    key={drive.id}
                    href={`/companies/${drive.id}`}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-300/80 bg-slate-50/50 hover:bg-white flex items-center justify-between gap-3 transition-all group"
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
                      <p className="text-xs font-bold text-slate-900">{formatPackage(drive.packageLPA, drive.stipendMonthly)}</p>
                      <p className={`text-[10px] font-semibold ${daysLeft <= 3 ? "text-rose-600" : "text-slate-400"}`}>
                        {daysLeft > 0 ? `${daysLeft}d left` : "Closed"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* My Applications Status */}
          <div className="card-clean p-5 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">My Registered Applications</h3>
              <Link href="/applications" className="text-xs font-semibold text-indigo-600 hover:underline">
                Track status →
              </Link>
            </div>

            <div className="space-y-3">
              {myApplications.map((app) => (
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
          </div>
        </div>
      </div>
    </div>
  );
}
