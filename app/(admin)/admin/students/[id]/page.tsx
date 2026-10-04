"use client";

import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { useState } from "react";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { AdminStudentDocuments } from "@/components/admin/AdminStudentDocuments";
import { Application, ApplicationStatus, PlacementStatus } from "@/lib/types";
import { formatDate, APPLICATION_JOURNEY } from "@/lib/utils";
import { apiMutate, useApiResource } from "@/lib/useApi";
import {
  ArrowLeft, Mail, Phone, CheckCircle2, Edit3, Check, X
} from "lucide-react";
import Link from "next/link";

export default function AdminStudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const { data: studentRows, loading: studentLoading } = useApiResource<Array<{
    id: string; user_id?: string; roll_number: string; full_name?: string; email?: string;
    phone?: string; department: string; section?: string; cgpa?: number; backlogs?: number;
    year_of_study?: number; graduation_year?: number; tenth_percent?: number; twelfth_percent?: number;
    skills?: string[]; profile_data?: Record<string, unknown>;
  }>>("student_profiles", { id: `eq.${studentId}`, select: "id,user_id,roll_number,full_name,email,phone,department,section,cgpa,backlogs,year_of_study,graduation_year,tenth_percent,twelfth_percent,skills,profile_data", limit: "1" }, { fallback: [] });
  const { data: applicationRows, refetch: refetchApplications } = useApiResource<Array<{
    id: string; student_id: string; drive_id: string; status: string; confirmation_data?: Application["confirmationData"];
    applied_at?: string; updated_at?: string; student_profiles?: { full_name?: string; roll_number?: string; department?: string; section?: string };
    drives?: { role_title?: string; company_id?: string; companies?: { name?: string; logo_url?: string; metadata?: { logoColor?: string } } };
  }>>("applications", { select: "id,student_id,drive_id,status,confirmation_data,applied_at,updated_at,student_profiles(full_name,roll_number,department,section),drives(role_title,company_id,companies(name,logo_url,metadata))", limit: "1000" }, { fallback: [] });
  const studentRow = studentRows?.[0];
  const student = studentRow ? {
    id: studentRow.id,
    name: studentRow.full_name || "",
    avatarUrl: typeof studentRow.profile_data?.avatarUrl === "string" ? studentRow.profile_data.avatarUrl : undefined,
    rollNumber: studentRow.roll_number,
    branch: studentRow.department,
    section: studentRow.section || "",
    email: studentRow.email || "",
    phone: studentRow.phone || "",
    cgpa: Number(studentRow.cgpa ?? 0),
    backlogs: studentRow.backlogs ?? 0,
    tenthPercent: Number(studentRow.tenth_percent ?? 0),
    twelfthPercent: Number(studentRow.twelfth_percent ?? 0),
    graduationYear: studentRow.graduation_year,
  } : undefined;
  const studentApps: Application[] = (applicationRows ?? []).filter((row) => row.student_id === studentId).map((row) => ({
    id: row.id, studentId: row.student_id, studentName: row.confirmation_data?.fullName || row.student_profiles?.full_name || student?.name || "",
    studentRollNumber: row.confirmation_data?.rollNumber || row.student_profiles?.roll_number || student?.rollNumber || "",
    studentBranch: (row.confirmation_data?.specialization || row.student_profiles?.department || student?.branch || "") as Application["studentBranch"],
    studentSection: row.confirmation_data?.section || row.student_profiles?.section || student?.section || "",
    driveId: row.drive_id, driveName: row.drives?.role_title || "", companyId: row.drives?.company_id || "",
    companyName: row.drives?.companies?.name || "Company", companyLogoUrl: row.drives?.companies?.logo_url, status: row.status as ApplicationStatus,
    appliedAt: row.applied_at, confirmedAt: row.confirmation_data?.confirmedAt || row.updated_at,
    confirmationData: row.confirmation_data, followUpCount: 0, updatedAt: row.updated_at || row.applied_at || "",
  }));
  const placementStatus: PlacementStatus = studentApps.some((application) => ["Selected", "Placed"].includes(application.status))
    ? "Placed" : studentApps.length ? "In Process" : "Unplaced";
  const appliedCount = studentApps.filter((application) => application.status === "Applied").length;
  const confirmedCount = studentApps.filter((application) => application.status === "Confirmed").length;
  const placedCount = studentApps.filter((application) => application.status === "Placed").length;
  const selectedCount = studentApps.filter((application) => application.status === "Selected").length;
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>("Applied");
  const [statusMessage, setStatusMessage] = useState("");

  if (!student && studentLoading) return <DataSkeleton label="Loading student…" className="p-8" count={4} />;
  if (!student) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Student not found</p>
        <Link href="/admin/students" className="text-red-600 font-semibold text-sm mt-2 inline-block">
          ← Back to Students
        </Link>
      </div>
    );
  }

  const handleUpdateAppStatus = async (appId: string, newStatus: ApplicationStatus) => {
    setStatusMessage("");
    try {
      await apiMutate("PATCH", `applications/${appId}`, { status: newStatus });
      await refetchApplications();
      setEditingAppId(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save application status.");
    }
  };

  return (
    <div>
      <AdminHeader
        title={student.name}
        subtitle={`${student.branch} • Sec ${student.section} • Roll No: ${student.rollNumber}`}
      />

      <div className="p-6 space-y-6">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Directory
        </Link>

        {/* Student Profile Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="h-16 w-16 text-xl"/>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">{student.name}</h1>
                  <StatusBadge status={placementStatus} />
                </div>
              <p className="text-xs text-slate-500 font-mono">Roll: {student.rollNumber} • Graduation year {student.graduationYear ?? "not set"}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" />{student.email}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{student.phone}</span>
                </div>
              </div>
            </div>

            {/* Overall status is derived from persisted application records. */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Overall Placement Status
              </span>
              <p className="text-xs font-semibold text-slate-800">{placementStatus}</p>
              <p className="text-[11px] text-slate-400">Calculated from selected or placed applications.</p>
            </div>
          </div>

          {/* Academic & Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400">Current CGPA:</span>
              <p className="text-base font-bold text-slate-800">{student.cgpa} / 10.0</p>
            </div>
            <div>
              <span className="text-slate-400">Active Backlogs:</span>
              <p className={`text-base font-bold ${student.backlogs > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                {student.backlogs}
              </p>
            </div>
            <div>
              <span className="text-slate-400">10th / 12th Marks:</span>
              <p className="text-base font-bold text-slate-800">{student.tenthPercent}% / {student.twelfthPercent}%</p>
            </div>
            <div>
              <span className="text-slate-400">Total Applications:</span>
              <p className="text-base font-bold text-red-600">{studentApps.length}</p>
            </div>
            <div>
              <span className="text-slate-400">Applied:</span>
              <p className="text-base font-bold text-sky-700">{appliedCount}</p>
            </div>
            <div>
              <span className="text-slate-400">Confirmed:</span>
              <p className="text-base font-bold text-teal-700">{confirmedCount}</p>
            </div>
            <div>
              <span className="text-slate-400">Selected / Placed:</span>
              <p className="text-base font-bold text-emerald-700">{selectedCount} / {placedCount}</p>
            </div>
          </div>
        </div>

        <AdminStudentDocuments studentId={studentId}/>

        {statusMessage && <p role="status" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900">{statusMessage}</p>}

        {/* Applications & Placement Journey Tracking Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Placement Journey & Applications</h2>
              <p className="text-xs text-slate-500">Track candidate progression from confirmation to final placement</p>
            </div>
          </div>

          {studentApps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
              No placement drive registrations yet for this student.
            </div>
          ) : (
            <div className="space-y-4">
              {studentApps.map((app) => {
                const currentStepIdx = APPLICATION_JOURNEY.indexOf(app.status);
                const isEditing = editingAppId === app.id;

                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CompanyLogo
                          name={app.companyName}
                          logoColor="#b91c1c"
                          logoUrl={app.companyLogoUrl}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{app.companyName}</h3>
                            <span className="text-xs text-slate-400">• {app.driveName}</span>
                            <StatusBadge status={app.status} />
                          </div>
                          {app.confirmedAt && (
                            <p className="text-xs text-teal-700 font-medium mt-0.5">
                              ✓ Confirmed on platform {formatDate(app.confirmedAt)}
                              {app.confirmationData?.applicationReferenceId && (
                                <span className="ml-1 text-slate-500 font-mono">
                                  (Ref: {app.confirmationData.applicationReferenceId})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Manual Status Editor */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 bg-red-50 p-1.5 rounded-xl border border-red-200">
                            <select
                              value={selectedStatus}
                              onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus)}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
                            >
                              {APPLICATION_JOURNEY.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              <option value="Rejected">Rejected</option>
                            </select>
                            <button
                              onClick={() => handleUpdateAppStatus(app.id, selectedStatus)}
                              className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                              title="Save Status"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingAppId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200 rounded-md transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingAppId(app.id);
                              setSelectedStatus(app.status);
                            }}
                            className="text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Update Status
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Complete Interactive Journey Tracker */}
                    <div className="bg-slate-50/70 p-4 rounded-xl overflow-x-auto">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Placement Pipeline Step:
                      </p>
                      <div className="flex items-center gap-0 min-w-max">
                        {APPLICATION_JOURNEY.map((step, idx, arr) => {
                          const isDone = currentStepIdx > idx;
                          const isCurrent = currentStepIdx === idx;

                          return (
                            <div key={step} className="flex items-center">
                              <button
                                onClick={() => handleUpdateAppStatus(app.id, step)}
                                className="group flex flex-col items-center"
                                title={`Click to advance student status to: ${step}`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                    isDone
                                      ? "bg-emerald-500 text-white"
                                      : isCurrent
                                      ? "bg-red-600 text-white ring-4 ring-red-100"
                                      : "bg-slate-200 text-slate-500 group-hover:bg-red-200"
                                  }`}
                                >
                                  {isDone ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <span className="text-[10px] font-bold">{idx + 1}</span>
                                  )}
                                </div>
                                <span
                                  className={`text-[10px] mt-1.5 w-16 text-center transition-colors ${
                                    isCurrent
                                      ? "font-bold text-red-700"
                                      : isDone
                                      ? "font-semibold text-emerald-700"
                                      : "text-slate-400 group-hover:text-red-600"
                                  }`}
                                >
                                  {step}
                                </span>
                              </button>

                              {idx < arr.length - 1 && (
                                <div
                                  className={`w-8 h-0.5 mb-5 mx-0.5 ${
                                    isDone ? "bg-emerald-400" : "bg-slate-200"
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Confirmation Form Details (if available) */}
                    {app.confirmationData && (
                      <div className="bg-teal-50/50 border border-teal-100/80 rounded-xl p-3 text-xs space-y-1 text-teal-900">
                        <span className="font-bold flex items-center gap-1 text-teal-950">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Student Confirmation Submission Details
                        </span>
                        <div className="grid sm:grid-cols-3 gap-2 text-slate-600 pt-1">
                          <div>Resume: {app.confirmationData.resumeUrl ? <a href={app.confirmationData.resumeUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-red-700 underline">Open Google Drive link</a> : <strong className="text-slate-800">Not provided</strong>}</div>
                          <div>Email: <strong className="text-slate-800">{app.confirmationData.collegeEmail}</strong></div>
                          <div>Phone: <strong className="text-slate-800">{app.confirmationData.phone}</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
