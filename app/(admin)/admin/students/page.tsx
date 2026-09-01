"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { students as initialStudents } from "@/lib/data/students";
import { applications } from "@/lib/data/applications";
import { Student, Branch, PlacementStatus } from "@/lib/types";
import { Search, Filter, Mail, Phone, FileText, ChevronRight, UserCheck, UserX, Clock, Award } from "lucide-react";
import Link from "next/link";

export default function AdminStudentsDirectoryPage() {
  const [studentsList, setStudentsList] = useState<Student[]>(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = studentsList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === "All" || s.branch === branchFilter;
    const matchesStatus = statusFilter === "All" || s.placementStatus === statusFilter;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  const totalPlaced = studentsList.filter((s) => s.placementStatus === "Placed").length;
  const totalUnplaced = studentsList.filter((s) => s.placementStatus === "Unplaced").length;
  const totalInProcess = studentsList.filter((s) => s.placementStatus === "In Process").length;

  return (
    <div>
      <AdminHeader
        title="Student Directory"
        subtitle="Searchable roster of all registered campus placement eligible students"
      />

      <div className="p-6 space-y-6">
        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Total Registered</span>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{studentsList.length}</p>
          </div>
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 shadow-sm">
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" /> Placed
            </span>
            <p className="text-2xl font-bold text-emerald-800 mt-0.5">{totalPlaced}</p>
          </div>
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 shadow-sm">
            <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> In Process
            </span>
            <p className="text-2xl font-bold text-blue-800 mt-0.5">{totalInProcess}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
              <UserX className="w-3.5 h-3.5" /> Unplaced
            </span>
            <p className="text-2xl font-bold text-slate-700 mt-0.5">{totalUnplaced}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, roll number (e.g. 21CSE102), or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="All">All Branches</option>
                {["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="All">All Placement Statuses</option>
                <option value="Placed">Placed</option>
                <option value="In Process">In Process</option>
                <option value="Unplaced">Unplaced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3.5">Student</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Roll No.</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Branch & Sec</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">CGPA</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Applications</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Status</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((student) => {
                  const studentApps = applications.filter((a) => a.studentId === student.id);
                  const shortlistedCount = studentApps.filter((a) => ["Shortlisted", "Assessment", "Interview", "Selected", "Placed"].includes(a.status)).length;
                  const offersCount = studentApps.filter((a) => ["Selected", "Placed"].includes(a.status)).length;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                            {student.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{student.name}</p>
                            <p className="text-xs text-slate-400">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-xs font-mono font-semibold text-slate-700">{student.rollNumber}</td>
                      <td className="px-3 py-4 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{student.branch}</span> • Sec {student.section}
                      </td>
                      <td className="px-3 py-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${student.cgpa >= 8.5 ? "bg-emerald-50 text-emerald-700" : student.cgpa >= 7.0 ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-700"}`}>
                          {student.cgpa}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">{studentApps.length}</span> apps
                        {shortlistedCount > 0 && <span className="text-amber-600 ml-1.5">• {shortlistedCount} shortlists</span>}
                        {offersCount > 0 && <span className="text-emerald-600 ml-1.5 font-bold">• {offersCount} offer</span>}
                      </td>
                      <td className="px-3 py-4"><StatusBadge status={student.placementStatus} /></td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View Journey <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
