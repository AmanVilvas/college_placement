"use client";

import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { useState, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StudentImportDialog } from "@/components/admin/StudentImportDialog";
import { EditStudentDetailsModal, StudentToEdit } from "@/components/admin/EditStudentDetailsModal";
import { useApiResource } from "@/lib/useApi";
import Link from "next/link";
import {
  Search, UserCheck, UserX, Clock, Upload, RefreshCw, AlertCircle,
  AlertTriangle, Pencil, Filter
} from "lucide-react";

/* ---------- Types returned by /api/student_profiles ---------- */
interface ApiStudentProfile {
  id: string;
  user_id?: string;
  roll_number: string;
  full_name?: string;
  email?: string;
  phone?: string;
  department: string;
  section?: string;
  // PostgreSQL numeric values may arrive as strings through the direct DB API.
  cgpa?: number | string | null;
  backlogs: number | null;
  graduation_year?: number;
  profile_data?: {
    imported_name?: string;
    email?: string;
    phone?: string;
    has_problem_with_details?: boolean;
    detail_problems?: string[];
    [key: string]: unknown;
  };
  profiles?: { full_name: string; email: string };
}

interface ApiStudentApplication { student_id: string; status: string; }

/* Normalise API row → display shape */
function normalise(s: ApiStudentProfile, applications: ApiStudentApplication[] = []): StudentToEdit & {
  userId: string;
  avatarUrl?: string;
  placementStatus: "Unplaced" | "Placed" | "In Process";
  applications: ApiStudentApplication[];
} {
  const email = s.email || s.profiles?.email || s.profile_data?.email || "";
  const name = s.full_name || s.profiles?.full_name || s.profile_data?.imported_name || "";
  const phone = s.phone || (s.profile_data?.phone as string) || "";
  const parsedCgpa = Number(s.cgpa ?? 0);

  const isTempRoll = s.roll_number.startsWith("TEMP-") || s.roll_number.startsWith("ROLL-");
  const isMissingEmail = !email || !email.includes("@");
  const isTempName = !name || name.startsWith("Student #") || name === "Unknown Student";
  const missingBacklogs = Boolean(s.profile_data?.detail_problems?.some((problem) => problem.toLowerCase().startsWith("backlogs:")));

  const hasProblem = Boolean(
    s.profile_data?.has_problem_with_details ||
    isTempRoll ||
    isMissingEmail ||
    isTempName
  );

  const fallbackProblems: string[] = [];
  if (isTempRoll) fallbackProblems.push("Roll number is an auto-assigned temporary ID");
  if (isMissingEmail) fallbackProblems.push("Email is missing or invalid");
  if (isTempName) fallbackProblems.push("Name is missing or placeholder");

  return {
    id: s.id,
    userId: s.user_id || s.id,
    avatarUrl: typeof s.profile_data?.avatarUrl === "string" ? s.profile_data.avatarUrl : undefined,
    name: name || "Unknown Student",
    email: email || "—",
    phone: phone || "—",
    rollNumber: s.roll_number,
    branch: s.department || "NA",
    section: s.section || "NA",
    cgpa: Number.isFinite(parsedCgpa) ? parsedCgpa : 0,
    backlogs: missingBacklogs ? null : s.backlogs ?? 0,
    graduationYear: s.graduation_year,
    placementStatus: applications.some((application) => ["Selected", "Placed"].includes(application.status))
      ? "Placed" as const : applications.length ? "In Process" as const : "Unplaced" as const,
    applications,
    hasProblemWithDetails: hasProblem,
    detailProblems: s.profile_data?.detail_problems && s.profile_data.detail_problems.length > 0
      ? s.profile_data.detail_problems
      : s.profile_data?.has_problem_with_details
        ? [...fallbackProblems, "Some imported student details are missing; fill the fields marked NA."]
        : fallbackProblems,
    rawProfileData: s.profile_data || {},
  };
}

export default function AdminStudentsDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [problemFilter, setProblemFilter] = useState<"all" | "problem">("all");
  const [importOpen, setImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentToEdit | null>(null);

  // The student directory contains only records returned by the database.
  const { data: apiData, loading, error, refetch } = useApiResource<ApiStudentProfile[]>(
    "student_profiles",
    {
      select: "id,user_id,roll_number,full_name,email,phone,department,section,cgpa,backlogs,graduation_year,profile_data,profiles(full_name,email)",
      limit: "1000",
    },
    { fallback: [] }
  );

  const { data: applicationData } = useApiResource<ApiStudentApplication[]>("applications", {
    select: "id,student_id,status", limit: "10000",
  }, { fallback: [] });

  const displayStudents = (apiData ?? []).map((student) => normalise(student,
    (applicationData ?? []).filter((application) => application.student_id === student.id)));

  const problemCount = displayStudents.filter((s) => s.hasProblemWithDetails).length;

  const filtered = displayStudents.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q);
    const matchesBranch = branchFilter === "All" || s.branch === branchFilter;
    const matchesProblem = problemFilter === "all" || s.hasProblemWithDetails;
    return matchesSearch && matchesBranch && matchesProblem;
  });

  const totalPlaced = displayStudents.filter((s) => s.placementStatus === "Placed").length;
  const totalInProcess = displayStudents.filter((s) => s.placementStatus === "In Process").length;
  const totalUnplaced = displayStudents.filter((s) => s.placementStatus === "Unplaced").length;

  const handleImportSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div>
      <AdminHeader
        title="Student Directory"
        subtitle="Searchable roster of all registered campus placement eligible students"
        action={{
          label: "Import from Excel / CSV",
          icon: <Upload className="w-4 h-4" />,
          onClick: () => setImportOpen(true),
        }}
      />

      <div className="p-6 space-y-6">
        {/* Notice banner if some students have problem with details */}
        {problemCount > 0 && (
          <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  {problemCount} student record{problemCount !== 1 ? "s have" : " has"} problem with details
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  These students were imported safely without forceful blocking. You can write or edit their details anytime by clicking &quot;Edit Details&quot; on their row.
                </p>
              </div>
            </div>
            <button
              onClick={() => setProblemFilter(problemFilter === "problem" ? "all" : "problem")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                problemFilter === "problem"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
              }`}
            >
              {problemFilter === "problem" ? "Show All Students" : `View Problem Records (${problemCount})`}
            </button>
          </div>
        )}

        {/* Live Supabase status pill */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Connected to Supabase (Live Database 24/7)
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={refetch} className="ml-auto flex items-center gap-1.5 text-xs font-semibold hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Total Registered</span>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {loading ? "—" : displayStudents.length}
            </p>
          </div>
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 shadow-sm">
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" /> Placed
            </span>
            <p className="text-2xl font-bold text-emerald-800 mt-0.5">{loading ? "—" : totalPlaced}</p>
          </div>
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 shadow-sm">
            <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> In Process
            </span>
            <p className="text-2xl font-bold text-blue-800 mt-0.5">{loading ? "—" : totalInProcess}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
              <UserX className="w-3.5 h-3.5" /> Unplaced
            </span>
            <p className="text-2xl font-bold text-slate-700 mt-0.5">{loading ? "—" : totalUnplaced}</p>
          </div>
        </div>

        {/* Search, Filter Tabs and Dropdowns */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setProblemFilter("all")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                problemFilter === "all"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Students ({displayStudents.length})
            </button>
            <button
              onClick={() => setProblemFilter("problem")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                problemFilter === "problem"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              This has problem with details ({problemCount})
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, roll number, or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="All">All Branches</option>
                {["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA", "General"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <button
                onClick={refetch}
                disabled={loading}
                title="Refresh"
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <DataSkeleton label="Loading students…" variant="rows" count={6} />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <UserX className="w-10 h-10 mb-3" />
                <p className="font-medium">No students found</p>
                {problemFilter === "problem" ? (
                  <p className="text-xs text-slate-400 mt-1">
                    Great news! There are no students with problematic details.
                  </p>
                ) : (
                  !loading && (
                    <p className="text-sm mt-1">
                      Import students using the{" "}
                      <button onClick={() => setImportOpen(true)} className="text-red-600 font-semibold hover:underline">
                        Import button
                      </button>{" "}
                      above.
                    </p>
                  )
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3.5">Student</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Roll No.</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Branch &amp; Sec</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Marks / CGPA</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Backlogs</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3.5">Status</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((student) => {
                    const hasProblem = student.hasProblemWithDetails;

                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${
                          hasProblem ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                              <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="h-full w-full text-xs"/>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{student.name}</p>
                              <p className="text-xs text-slate-400">{student.email}</p>
                              {hasProblem && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md">
                                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                                    This has problem with details
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-xs font-mono font-semibold text-slate-700">
                          {student.rollNumber}
                        </td>
                        <td className="px-3 py-4 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">{student.branch}</span>
                          {student.section && student.section !== "—" && student.section !== "NA" && <> • Sec {student.section}</>}
                        </td>
                        <td className="px-3 py-4">
                          {(() => {
                            // Supabase/Postgres numeric values can still arrive as strings
                            // in cached client data, even after normalising the API response.
                            const parsed = Number(student.cgpa ?? 0);
                            const val = Number.isFinite(parsed) ? parsed : 0;
                            return (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                val >= 8.5 ? "bg-emerald-50 text-emerald-700"
                                : val >= 7.0 ? "bg-red-50 text-red-700"
                                : val > 0 ? "bg-slate-100 text-slate-700"
                                : "text-slate-400"
                              }`}>
                                {val > 0 ? val.toFixed(2) : "NA"}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-4 text-xs text-slate-600">
                          <span className={`font-semibold ${(student.backlogs ?? 0) > 0 ? "text-red-600" : "text-slate-500"}`}>
                            {student.backlogs ?? "NA"}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge status={student.placementStatus} />
                          <p className="text-[10px] text-slate-400 mt-1">
                            {student.applications.length} applications · {student.applications.filter((application) => application.status === "Confirmed").length} confirmed · {student.applications.filter((application) => application.status === "Placed").length} placed
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link href={`/admin/students/${student.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                              View profile
                            </Link>
                            <button
                              onClick={() => setEditingStudent(student)}
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                hasProblem
                                  ? "bg-amber-200 text-amber-900 hover:bg-amber-300 shadow-sm"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              {hasProblem ? "Fix Details" : "Edit"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <StudentImportDialog
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Edit Student Details Modal */}
      <EditStudentDetailsModal
        student={editingStudent}
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        onSuccess={() => {
          refetch();
          setEditingStudent(null);
        }}
      />
    </div>
  );
}
