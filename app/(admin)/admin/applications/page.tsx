"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { applications as initialApplications } from "@/lib/data/applications";
import { drives } from "@/lib/data/companies";
import { Application, ApplicationStatus, Branch } from "@/lib/types";
import { formatDate, APPLICATION_JOURNEY } from "@/lib/utils";
import { Search, Filter, CheckCircle2, Download, FileSpreadsheet, Eye, Edit3 } from "lucide-react";
import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

export default function AdminApplicationsPage() {
  const [stageOverrides, setStageOverrides] = useLocalStorageState<Record<string, ApplicationStatus>>("placement-helper:application-stages", {});
  const applicationsList: Application[] = initialApplications.map((application) => ({ ...application, status: stageOverrides[application.id] ?? application.status }));
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");

  const companiesList = ["All", ...Array.from(new Set(initialApplications.map((a) => a.companyName)))];
  const branchesList = ["All", "CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"];

  const filtered = applicationsList.filter((app) => {
    const matchesSearch =
      app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.studentRollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = companyFilter === "All" || app.companyName === companyFilter;
    const matchesStatus = statusFilter === "All" || app.status === statusFilter;
    const matchesBranch = branchFilter === "All" || app.studentBranch === branchFilter;
    return matchesSearch && matchesCompany && matchesStatus && matchesBranch;
  });

  const handleStatusChange = (appId: string, newStatus: ApplicationStatus) => {
    setStageOverrides((current) => ({ ...current, [appId]: newStatus }));
  };

  const handleExportCSV = () => {
    const headers = ["Student Name", "Roll No", "Branch", "Section", "Company", "Role", "Status", "Confirmed At", "Ref ID"];
    const rows = filtered.map((a) => [
      a.studentName,
      a.studentRollNumber,
      a.studentBranch,
      a.studentSection,
      a.companyName,
      a.driveName,
      a.status,
      a.confirmedAt || "N/A",
      a.confirmationData?.applicationReferenceId || "N/A",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `placement_applications_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <AdminHeader
        title="Application Records"
        subtitle="Consolidated roster of all company drive applications and student confirmation receipts"
        action={{
          label: "Export to CSV / Excel",
          onClick: handleExportCSV,
        }}
      />

      <div className="p-6 space-y-6">
        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate name, roll number, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {companiesList.map((c) => (
                  <option key={c} value={c}>{c === "All" ? "All Companies" : c}</option>
                ))}
              </select>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {branchesList.map((b) => (
                  <option key={b} value={b}>{b === "All" ? "All Branches" : b}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                {APPLICATION_JOURNEY.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="Not Responded">Not Responded</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-500">
            <span>Showing <strong>{filtered.length}</strong> applications</span>
            <button
              onClick={handleExportCSV}
              className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download Spreadsheet
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3.5">Candidate</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Roll No.</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Company & Role</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Confirmation</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Stage</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3.5">Update Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-900">{app.studentName}</p>
                      <p className="text-xs text-slate-400">{app.studentBranch} • Sec {app.studentSection}</p>
                    </td>
                    <td className="px-3 py-4 text-xs font-mono font-semibold text-slate-700">{app.studentRollNumber}</td>
                    <td className="px-3 py-4">
                      <p className="text-sm font-semibold text-slate-800">{app.companyName}</p>
                      <p className="text-xs text-slate-500">{app.driveName}</p>
                    </td>
                    <td className="px-3 py-4">
                      {app.confirmedAt ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" /> Confirmed
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(app.confirmedAt)}</p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Not Confirmed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                        >
                          {APPLICATION_JOURNEY.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          <option value="Not Responded">Not Responded</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <Link
                          href={`/admin/students/${app.studentId}`}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Student Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
