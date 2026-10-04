"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { apiMutate, useApiResource } from "@/lib/useApi";
import { formatDate, getDaysUntilDeadline } from "@/lib/utils";
import {
  AlertCircle, Filter, MessageSquare, Eye, Phone,
  Clock, CheckCircle, XCircle, ChevronDown, Check, UserX, Loader2,
} from "lucide-react";
import Link from "next/link";

type FilterState = {
  company: string;
  branch: string;
  section: string;
  status: string;
};

const ALL_STATUSES = ["Not Responded", "Applied", "Shortlisted", "Assessment", "Interview"];

interface ApiFollowUp {
  student_id: string;
  student_name: string;
  student_roll_number: string;
  student_branch: string;
  student_section: string;
  student_phone?: string | null;
  drive_id: string;
  drive_name: string;
  application_deadline: string | null;
  company_name: string;
  application_id: string | null;
  status: string;
  follow_up_count: number;
}

export default function FollowUpsPage() {
  const { data: rows, loading, error, refetch } = useApiResource<ApiFollowUp[]>("followups", {}, { fallback: [] });
  const [filters, setFilters] = useState<FilterState>({
    company: "", branch: "", section: "", status: "",
  });
  const [pendingFollowUpId, setPendingFollowUpId] = useState<string | null>(null);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const followUpApps = rows ?? [];

  const filtered = followUpApps.filter((app) => {
    if (filters.company && !app.company_name.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.branch && app.student_branch !== filters.branch) return false;
    if (filters.section && app.student_section !== filters.section) return false;
    if (filters.status && app.status !== filters.status) return false;
    return true;
  });

  const companies = Array.from(new Set(followUpApps.map((a) => a.company_name)));
  const branches = Array.from(new Set(followUpApps.map((application) => application.student_branch).filter(Boolean)));
  const sections = ["A", "B", "C", "D"];

  const handleMarkFollowUp = async (candidate: ApiFollowUp) => {
    const actionId = `${candidate.drive_id}:${candidate.student_id}`;
    setPendingFollowUpId(actionId);
    setActionMessage("");
    try {
      const result = await apiMutate<{ id: string; inAppNotificationCreated: boolean; delivery: { emailSent: number; whatsappSent: number; failures: { channel: string; error: string }[] } }>("POST", "followups", {
        driveId: candidate.drive_id, studentId: candidate.student_id, channels: { email: true, whatsapp: false },
      });
      const failures = result.delivery.failures.map((failure) => `${failure.channel}: ${failure.error}`).join("; ");
      setActionMessage(failures
        ? `In-app reminder ${result.inAppNotificationCreated ? "created" : "not created"}. Email accepted by provider: ${result.delivery.emailSent}. ${failures}`
        : `In-app reminder created for ${candidate.student_name}. Email accepted by provider: ${result.delivery.emailSent}; WhatsApp sent: ${result.delivery.whatsappSent}.`);
      refetch();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not record the follow-up.");
    } finally {
      setPendingFollowUpId(null);
    }
  };

  const handleCall = async (candidate: ApiFollowUp) => {
    if (!candidate.student_phone) {
      setActionMessage(`${candidate.student_name} has no phone number on their student profile.`);
      return;
    }
    if (!window.confirm(`Start an automated placement follow-up call to ${candidate.student_name} about ${candidate.company_name} — ${candidate.drive_name}?`)) return;
    const actionId = `${candidate.drive_id}:${candidate.student_id}`;
    setPendingCallId(actionId); setActionMessage("");
    try {
      const result = await apiMutate<{ accepted: boolean; studentName: string }>("POST", "calls", { driveId: candidate.drive_id, studentId: candidate.student_id });
      setActionMessage(result.accepted ? `OmniDim accepted the call request for ${result.studentName}.` : "OmniDim did not accept the call request.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not start the call.");
    } finally { setPendingCallId(null); }
  };

  const notResponded = filtered.filter((a) => a.status === "Not Responded").length;
  const externallyApplied = filtered.filter((a) => a.status === "Applied").length;
  const shortlisted = filtered.filter((a) => a.status === "Shortlisted").length;
  const assessment = filtered.filter((a) => a.status === "Assessment").length;

  return (
    <div>
      <AdminHeader
        title="Follow-up Command Center"
        subtitle="Track candidates requiring placement cell action or registration verification"
      />

      <div className="p-6 space-y-6">
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Could not load follow-up records: {error}</p>}
        {actionMessage && <p role="status" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{actionMessage}</p>}
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Applied, not confirmed</span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{externallyApplied}</p>
              <span className="text-[11px] text-sky-700 font-medium">Verify portal confirmation</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600"><Check className="w-5 h-5" /></div>
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
              <span className="text-[11px] text-red-600 font-medium">Online Tests Scheduled</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
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
            <span>{loading ? "Loading follow-up queue…" : <>Showing <strong>{filtered.length}</strong> eligible students requiring follow-up</>}</span>
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
                    const daysLeft = app.application_deadline ? getDaysUntilDeadline(app.application_deadline) : 0;
                    const actionId = `${app.drive_id}:${app.student_id}`;
                    const isSending = pendingFollowUpId === actionId;
                    const isCalling = pendingCallId === actionId;

                    return (
                      <tr
                        key={actionId}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{app.student_name}</p>
                          <p className="text-[11px] text-slate-400">{app.student_branch} • Sec {app.student_section}</p>
                          <Link href={`/admin/students/${app.student_id}`} className="mt-1 inline-block text-[10px] font-semibold text-red-700 hover:underline">View call history</Link>
                        </td>
                        <td className="px-3 py-3.5 font-mono text-slate-600 font-medium">{app.student_roll_number}</td>
                        <td className="px-3 py-3.5">
                          <p className="font-semibold text-slate-800">{app.company_name}</p>
                          <p className="text-[11px] text-slate-400">{app.drive_name}</p>
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusBadge status={app.status} size="sm" />
                        </td>
                        <td className="px-3 py-3.5">
                          {app.application_deadline && (
                            <div>
                              <p className="text-slate-700 font-medium">{formatDate(app.application_deadline)}</p>
                              <p className={`text-[10px] font-semibold ${daysLeft <= 3 ? "text-rose-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-400"}`}>
                                {daysLeft > 0 ? `${daysLeft}d left` : "Passed"}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-slate-600 font-medium">
                          {app.follow_up_count}x
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => void handleMarkFollowUp(app)}
                              disabled={isSending || isCalling}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                            >
                              {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                              {isSending ? "Sending…" : "Send reminder"}
                            </button>
                            <button
                              onClick={() => void handleCall(app)}
                              disabled={isSending || isCalling || !app.student_phone}
                              title={app.student_phone ? "Start an OmniDim call for this student and drive" : "Add a phone number to the student profile first"}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >{isCalling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}{isCalling ? "Calling…" : "Call"}</button>
                            <Link
                              href={`/admin/students/${app.student_id}`}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Student"
                            ><Eye className="w-4 h-4" /></Link>
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
