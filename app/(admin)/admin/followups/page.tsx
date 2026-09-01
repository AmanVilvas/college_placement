"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { applications } from "@/lib/data/applications";
import { students } from "@/lib/data/students";
import { drives } from "@/lib/data/companies";
import { formatDate, getDaysUntilDeadline } from "@/lib/utils";
import {
  AlertCircle, Filter, MessageSquare, Eye, RefreshCw,
  Clock, CheckCircle, XCircle, ChevronDown, Check, UserX,
} from "lucide-react";
import Link from "next/link";

type FilterState = {
  company: string;
  branch: string;
  section: string;
  status: string;
};

const ALL_STATUSES = ["Not Responded", "Shortlisted", "Assessment", "Interview"];

export default function FollowUpsPage() {
  const [filters, setFilters] = useState<FilterState>({
    company: "", branch: "", section: "", status: "",
  });
  const [markedFollowUp, setMarkedFollowUp] = useState<Set<string>>(new Set());

  // Get all apps that need follow-up
  const followUpApps = applications.filter(
    (a) => a.status === "Not Responded" || a.status === "Shortlisted" || a.status === "Assessment"
  );

  const filtered = followUpApps.filter((app) => {
    if (filters.company && !app.companyName.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.branch && app.studentBranch !== filters.branch) return false;
    if (filters.section && app.studentSection !== filters.section) return false;
    if (filters.status && app.status !== filters.status) return false;
    return true;
  });

  const companies = Array.from(new Set(applications.map((a) => a.companyName)));
  const branches = Array.from(new Set(students.map((s) => s.branch)));
  const sections = ["A", "B", "C", "D"];

  const handleMarkFollowUp = (appId: string) => {
    setMarkedFollowUp((prev) => new Set([...prev, appId]));
  };

  const notResponded = filtered.filter((a) => a.status === "Not Responded").length;
  const shortlisted = filtered.filter((a) => a.status === "Shortlisted").length;
  const assessment = filtered.filter((a) => a.status === "Assessment").length;

  return (
    <div>
      <AdminHeader
        title="Follow-up Command Center"
        subtitle="Track candidates requiring placement cell action or registration verification"
      />

      <div className="p-6 space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-clean p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Not Confirmed
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{notResponded}</p>
              <span className="text-[11px] text-rose-600 font-medium">Action Required</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          <div className="card-clean p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Shortlisted
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{shortlisted}</p>
              <span className="text-[11px] text-amber-600 font-medium">Ready for Next Round</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="card-clean p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Assessment Stage
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{assessment}</p>
              <span className="text-[11px] text-indigo-600 font-medium">Online Tests Scheduled</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="card-clean p-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter Candidate Queue</span>
            </div>
            {(filters.company || filters.branch || filters.section || filters.status) && (
              <button
                onClick={() => setFilters({ company: "", branch: "", section: "", status: "" })}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <select
                value={filters.company}
                onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white"
              >
                <option value="">All Companies</option>
                {companies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <select
                value={filters.branch}
                onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white"
              >
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <select
                value={filters.section}
                onChange={(e) => setFilters((f) => ({ ...f, section: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white"
              >
                <option value="">All Sections</option>
                {sections.map((s) => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>

            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white"
              >
                <option value="">All Statuses</option>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Clean Data Table */}
        <div className="card-clean overflow-hidden bg-white">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing <strong>{filtered.length}</strong> candidates requiring follow-up</span>
            <span className="text-[11px]">Sorted by urgency</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-800">All caught up!</p>
              <p className="text-xs text-slate-400 mt-0.5">No students require follow-up with the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Student</th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Roll No.</th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Company & Role</th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Status</th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Deadline</th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Attempts</th>
                    <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map((app) => {
                    const drive = drives.find((d) => d.id === app.driveId);
                    const daysLeft = drive ? getDaysUntilDeadline(drive.applicationDeadline) : 0;
                    const isFollowedUp = markedFollowUp.has(app.id);

                    return (
                      <tr
                        key={app.id}
                        className={`hover:bg-slate-50/70 transition-colors ${isFollowedUp ? "opacity-50" : ""}`}
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{app.studentName}</p>
                          <p className="text-[11px] text-slate-400">{app.studentBranch} • Sec {app.studentSection}</p>
                        </td>
                        <td className="px-3 py-3.5 font-mono text-slate-600 font-medium">{app.studentRollNumber}</td>
                        <td className="px-3 py-3.5">
                          <p className="font-semibold text-slate-800">{app.companyName}</p>
                          <p className="text-[11px] text-slate-400">{app.driveName}</p>
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusBadge status={app.status} size="sm" />
                        </td>
                        <td className="px-3 py-3.5">
                          {drive && (
                            <div>
                              <p className="text-slate-700 font-medium">{formatDate(drive.applicationDeadline)}</p>
                              <p className={`text-[10px] font-semibold ${daysLeft <= 3 ? "text-rose-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-400"}`}>
                                {daysLeft > 0 ? `${daysLeft}d left` : "Passed"}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-slate-600 font-medium">
                          {app.followUpCount}x
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isFollowedUp ? (
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Followed up
                              </span>
                            ) : (
                              <>
                                {app.status === "Not Responded" && (
                                  <button
                                    onClick={() => handleMarkFollowUp(app.id)}
                                    className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                  >
                                    <MessageSquare className="w-3 h-3" /> Remind
                                  </button>
                                )}
                                {app.status === "Shortlisted" && (
                                  <button
                                    onClick={() => handleMarkFollowUp(app.id)}
                                    className="px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <RefreshCw className="w-3 h-3" /> Update Round
                                  </button>
                                )}
                                <Link
                                  href={`/admin/students/${app.studentId}`}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="View Student"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
