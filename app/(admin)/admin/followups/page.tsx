"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { apiMutate, useApiResource } from "@/lib/useApi";
import { formatDate, getDaysUntilDeadline } from "@/lib/utils";
import {
  AlertCircle, Filter, MessageSquare, Eye, Phone,
  Clock, CheckCircle, ChevronDown, Check, UserX, Loader2, Building2,
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
  company_id?: string;
  company_name: string;
  application_id: string | null;
  status: string;
  follow_up_count: number;
}

function groupFollowUps(candidates: ApiFollowUp[]) {
  const companies = new Map<string, { id: string; name: string; candidates: ApiFollowUp[]; roles: Map<string, { name: string; candidates: ApiFollowUp[] }> }>();
  for (const candidate of candidates) {
    const companyId = candidate.company_id || candidate.company_name;
    let company = companies.get(companyId);
    if (!company) {
      company = { id: companyId, name: candidate.company_name, candidates: [], roles: new Map() };
      companies.set(companyId, company);
    }
    company.candidates.push(candidate);
    const roleName = candidate.drive_name.trim() || "Placement drive";
    const roleKey = roleName.toLowerCase();
    let role = company.roles.get(roleKey);
    if (!role) {
      role = { name: roleName, candidates: [] };
      company.roles.set(roleKey, role);
    }
    role.candidates.push(candidate);
  }
  return Array.from(companies.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function FollowUpsPage() {
  const { data: rows, loading, error, refetch } = useApiResource<ApiFollowUp[]>("followups", {}, { fallback: [] });
  const [filters, setFilters] = useState<FilterState>({
    company: "", branch: "", section: "", status: "",
  });
  const [pendingFollowUpId, setPendingFollowUpId] = useState<string | null>(null);
  const [pendingCallId, setPendingCallId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [sendingBulk, setSendingBulk] = useState(false);

  const followUpApps = rows ?? [];

  const filtered = followUpApps.filter((app) => {
    if (filters.company && app.company_name !== filters.company) return false;
    if (filters.branch && app.student_branch !== filters.branch) return false;
    if (filters.section && app.student_section !== filters.section) return false;
    if (filters.status && app.status !== filters.status) return false;
    return true;
  });

  const companies = Array.from(new Set(followUpApps.map((a) => a.company_name)));
  const branches = Array.from(new Set(followUpApps.map((application) => application.student_branch).filter(Boolean)));
  const sections = ["A", "B", "C", "D"];

  async function sendBulkReminders(candidates: ApiFollowUp[]) {
    if (sendingBulk) return;
    const pending = candidates.filter((candidate) => ["Eligible", "Interested", "Applied", "Not Responded"].includes(candidate.status));
    const groups = new Map<string, Set<string>>();
    pending.forEach((candidate) => {
      const students = groups.get(candidate.drive_id) ?? new Set<string>();
      students.add(candidate.student_id); groups.set(candidate.drive_id, students);
    });
    setSendingBulk(true); setActionMessage("");
    let sent = 0, failed = 0, audience = 0;
    try {
      for (const [driveId, studentSet] of groups) {
        const students = [...studentSet];
        for (let offset = 0; offset < students.length; offset += 500) {
          const result = await apiMutate<{ audience: number; delivery: { emailSent: number; failures: { error: string }[] } }>("POST", "followups", {
            driveId, studentIds: students.slice(offset, offset + 500), channels: { email: true, whatsapp: false },
          });
          audience += result.audience; sent += result.delivery.emailSent; failed += result.delivery.failures.length;
          setActionMessage(`Bulk reminders: ${sent} emails accepted, ${failed} failed, ${audience} students processed.${result.delivery.failures[0] ? ` Error: ${result.delivery.failures[0].error}` : ""}`);
        }
      }
      await refetch();
    } catch (error) {
      setActionMessage(`Bulk reminders stopped after ${sent} emails accepted and ${failed} failed. ${error instanceof Error ? error.message : "Could not send reminders."}`);
    } finally { setSendingBulk(false); }
  }

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
  const companyGroups = groupFollowUps(filtered);

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

        {/* Company queues with role subgroups */}
        <div className="card-clean overflow-hidden bg-white">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{loading ? "Loading follow-up queue…" : <><strong>{filtered.length}</strong> follow-ups across <strong>{companyGroups.length}</strong> companies</>}</span>
            <span className="text-[11px]">Urgency order within each role</span>
          </div>

          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading company follow-ups…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-800">All caught up!</p>
              <p className="text-xs text-slate-400 mt-0.5">No students require follow-up with the selected criteria.</p>
            </div>
          ) : (
            <div className="space-y-4 bg-slate-50/50 p-4">
              {companyGroups.map((company) => (
                <details key={company.id} open className="group/company overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-500">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 shrink-0 text-slate-500" />
                      <div><h2 className="text-sm font-bold text-slate-900">{company.name}</h2><p className="mt-0.5 text-xs text-slate-500">{new Set(company.candidates.map((candidate) => candidate.student_id)).size} students · {company.candidates.length} follow-ups · {company.roles.size} {company.roles.size === 1 ? "role" : "roles"}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{company.candidates.filter((candidate) => candidate.status === "Not Responded").length} not responded</span>
                      <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open/company:rotate-180" />
                    </div>
                  </summary>
                  <div className="space-y-3 border-t border-slate-100 p-3">
                    <button type="button" disabled={sendingBulk || Boolean(pendingFollowUpId) || !company.candidates.some((candidate) => ["Eligible", "Interested", "Applied", "Not Responded"].includes(candidate.status))} onClick={() => void sendBulkReminders(company.candidates)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{sendingBulk ? "Sending reminders…" : "Email eligible students awaiting confirmation"}</button>
                    {Array.from(company.roles.entries()).map(([roleKey, role]) => (
                      <details key={roleKey} open className="group/role overflow-hidden rounded-lg border border-slate-100">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 focus-visible:outline-2 focus-visible:outline-indigo-500">
                          <div><h3 className="text-xs font-bold text-slate-800">{role.name}</h3><p className="mt-0.5 text-[11px] text-slate-500">{role.candidates.length} follow-ups{new Set(role.candidates.map((candidate) => candidate.drive_id)).size > 1 && ` · ${new Set(role.candidates.map((candidate) => candidate.drive_id)).size} drives`}</p></div>
                          <div className="flex flex-wrap items-center gap-2">
                            {ALL_STATUSES.map((status) => {
                              const count = role.candidates.filter((candidate) => candidate.status === status).length;
                              return count > 0 ? <span key={status} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">{status}: <b>{count}</b></span> : null;
                            })}
                            <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open/role:rotate-180" />
                          </div>
                        </summary>
                        <div className="border-t border-slate-100 px-4 py-2">
                          <button type="button" disabled={sendingBulk || Boolean(pendingFollowUpId) || !role.candidates.some((candidate) => ["Eligible", "Interested", "Applied", "Not Responded"].includes(candidate.status))} onClick={() => void sendBulkReminders(role.candidates)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Email pending students for this role</button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50/70 border-b border-slate-100">
                                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Student</th>
                                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Roll No.</th>
                                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Status</th>
                                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Deadline</th>
                                <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">Attempts</th>
                                <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {role.candidates.map((app) => {
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
                                          disabled={isSending || isCalling || sendingBulk}
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
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
