"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { StudentHeader } from "@/components/student/StudentHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmParticipationDialog } from "@/components/shared/ConfirmParticipationDialog";
import type { ConfirmationFormData } from "@/components/shared/ConfirmParticipationDialog";
import { drives } from "@/lib/data/companies";
import { notifications as seededNotifications } from "@/lib/data/notifications";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useStudentApplications, useStudentProfile } from "@/lib/studentState";
import { getDriveEligibilityIssues, isDriveAcceptingApplications } from "@/lib/driveRegistration";
import type { Application, Notification } from "@/lib/types";
import {
  formatPackage, formatDate, getDaysUntilDeadline,
} from "@/lib/utils";
import {
  MapPin, Briefcase, Users, Clock, Calendar, Globe,
  ExternalLink, CheckCircle, ChevronLeft, Check,
  AlertCircle, ArrowRight, ShieldCheck, Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function DriveDetailPage() {
  const params = useParams();
  const driveId = params.id as string;
  const [driveList] = useLocalStorageState("placement-helper:drives", drives);
  const [currentStudent, setCurrentStudent] = useStudentProfile();
  const { applications: myApplications, saveApplication } = useStudentApplications();
  const [notifications, setNotifications] = useLocalStorageState<Notification[]>("placement-helper:notifications", seededNotifications);
  const [portalLaunches, setPortalLaunches] = useLocalStorageState<Record<string, string>>("placement-helper:portal-launches:s1", {});
  const drive = driveList.find((d) => d.id === driveId);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!drive) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500 mb-2">Drive not found</p>
        <Link href="/companies" className="text-indigo-600 font-semibold text-xs hover:underline">
          ← Back to Companies
        </Link>
      </div>
    );
  }

  const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);
  const isClosed = !isDriveAcceptingApplications(drive);
  const eligibilityIssues = getDriveEligibilityIssues(drive, currentStudent);
  const matchingApplication = myApplications.find((application) => application.driveId === drive.id);
  const confirmed = Boolean(matchingApplication && matchingApplication.status === "Confirmed");

  const handleConfirm = (data: ConfirmationFormData) => {
    if (!isDriveAcceptingApplications(drive)
      || getDriveEligibilityIssues(drive, currentStudent).length > 0
      || !portalLaunches[drive.id]
      || data.branch !== currentStudent.branch
      || data.section !== currentStudent.section
      || data.fullName.trim().toLowerCase() !== currentStudent.name.trim().toLowerCase()
      || data.rollNumber.trim().toLowerCase() !== currentStudent.rollNumber.trim().toLowerCase()) return false;
    const now = new Date().toISOString();
    const application: Application = {
      id: matchingApplication?.id ?? `app-${currentStudent.id}-${drive.id}`,
      studentId: currentStudent.id, studentName: currentStudent.name, studentRollNumber: currentStudent.rollNumber,
      studentBranch: currentStudent.branch, studentSection: currentStudent.section,
      driveId: drive.id, driveName: drive.role, companyId: drive.companyId, companyName: drive.companyName,
      status: "Confirmed", appliedAt: matchingApplication?.appliedAt ?? portalLaunches[drive.id] ?? now,
      confirmedAt: now, confirmationData: { ...data, confirmedAt: now },
      followUpCount: matchingApplication?.followUpCount ?? 0, updatedAt: now,
    };
    saveApplication(application);
    if (!notifications.some((notification) => notification.title === `Participation confirmed · ${drive.companyName}`)) {
      setNotifications((current) => [{ id: `confirm-${drive.id}-${Date.now()}`, title: `Participation confirmed · ${drive.companyName}`, message: `Your participation for ${drive.role} was saved on this device. Complete any remaining steps on the official company portal.`, category: "General", createdAt: now, read: false, driveId: drive.id, companyName: drive.companyName }, ...current]);
    }
    return true;
  };

  return (
    <div>
      <StudentHeader title="Drive Details" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to All Companies
        </Link>

        {/* Main Header Banner */}
        <div className="card-clean p-6 sm:p-8 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <CompanyLogo name={drive.companyName} logoColor={drive.companyLogoColor} size="xl" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">{drive.companyName}</h1>
                  <StatusBadge status={isClosed ? "Closed" : drive.status} />
                  {daysLeft > 0 && daysLeft <= 5 && !isClosed && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⏳ {daysLeft} days remaining
                    </span>
                  )}
                </div>
                <p className="text-base text-slate-600 font-medium">{drive.role}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{drive.location}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" />{drive.workMode} ({drive.jobType})</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" />{drive.openings} Openings</span>
                </div>
              </div>
            </div>

            <div className="sm:text-right self-start sm:self-auto border-t sm:border-t-0 pt-4 sm:pt-0">
              <span className="text-xs text-slate-400 block font-medium">Offered CTC / Stipend</span>
              <p className="text-3xl font-extrabold text-slate-950 tracking-tight">
                {formatPackage(drive.packageLPA, drive.stipendMonthly)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Job Description, Skills, Process */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            <div className="card-clean p-6 bg-white space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Job Overview</h2>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {drive.jobDescription}
              </div>
            </div>

            {/* Required Skills */}
            <div className="card-clean p-6 bg-white space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {drive.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-medium px-3 py-1 rounded-lg"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Selection Rounds */}
            <div className="card-clean p-6 bg-white space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Selection Process</h2>
              <div className="space-y-2.5 pt-1">
                {drive.selectionProcess.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Instructions */}
            <div className="card-clean p-6 bg-amber-50/40 border-amber-200/60 space-y-3">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <h2 className="text-sm font-bold">Important Instructions for Candidates</h2>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-900/90 pl-5 list-disc">
                {drive.importantInstructions.map((instr, i) => (
                  <li key={i}>{instr}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: THE 2-BUTTON APPLY FLOW & ELIGIBILITY */}
          <div className="space-y-6">
            {/* The Critical Two-Step Application Card */}
            <div className="card-clean p-6 bg-white border-slate-300 shadow-sm space-y-5 sticky top-20">
              <div className="space-y-1 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Application Workflow
                </span>
                <h3 className="text-base font-bold text-slate-900">How to Apply</h3>
                <p className="text-xs text-slate-500">
                  Follow both steps so the placement team can track your application without manual follow-up.
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-900">Apply on Official Portal</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-7 leading-relaxed">
                  Submit your actual application on the company&apos;s external careers page or Google form.
                </p>
                <div className="pl-7">
                  {portalLaunches[drive.id] && <p className="mb-2 text-[10px] font-semibold text-emerald-700">Official portal opened · {formatDate(portalLaunches[drive.id])}</p>}
                  {isClosed || eligibilityIssues.length > 0 ? (
                    <button
                      disabled
                      className="w-full bg-slate-100 text-slate-400 font-semibold py-2.5 rounded-xl text-xs cursor-not-allowed"
                    >
                      {isClosed ? "Applications Closed" : "Check Eligibility Before Applying"}
                    </button>
                  ) : (
                    <a
                      href={drive.officialApplyLink}
                      onClick={() => setPortalLaunches((current) => ({ ...current, [drive.id]: new Date().toISOString() }))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Apply on Official Portal ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-900">Confirm Participation</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-7 leading-relaxed">
                  Return here and confirm your application so the placement cell marks you as registered.
                </p>

                <div className="pl-7">
                  {confirmed ? (
                    <div className="bg-teal-50 border border-teal-200 text-teal-900 p-3 rounded-xl flex items-center gap-2 text-xs">
                      <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Application Confirmed ✓</p>
                        <p className="text-[10px] text-teal-700">Saved to My Applications on this browser</p>
                      </div>
                    </div>
                  ) : !portalLaunches[drive.id] && !isClosed && eligibilityIssues.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                      Complete step 1 on the official portal first. After returning, you can submit your participation details here.
                    </div>
                  ) : (
                    <button
                      onClick={() => !isClosed && eligibilityIssues.length === 0 && setShowConfirmDialog(true)}
                      disabled={isClosed || eligibilityIssues.length > 0}
                      className={`w-full font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs ${
                        isClosed || eligibilityIssues.length > 0
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      I&apos;ve Applied • Confirm Participation
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Eligibility Summary Box */}
            <div className="card-clean p-5 bg-white space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Eligibility Criteria</h4>
              <div className="space-y-2 text-slate-600">
                <div className={`rounded-lg p-3 ${eligibilityIssues.length ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
                  <p className="font-semibold">{eligibilityIssues.length ? "Eligibility criteria not met" : "You meet the listed academic criteria"}</p>
                  {eligibilityIssues.map((issue) => <p key={issue} className="mt-1 text-[11px]">{issue}</p>)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Allowed Branches:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {drive.eligibility.branches.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Minimum CGPA:</span>
                  <span className="font-semibold text-slate-900">{drive.eligibility.minCGPA}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Backlogs:</span>
                  <span className="font-semibold text-slate-900">{drive.eligibility.maxBacklogs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Drive Date:</span>
                  <span className="font-semibold text-slate-900">{formatDate(drive.driveDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Application Deadline:</span>
                  <span className="font-semibold text-slate-900">{formatDate(drive.applicationDeadline)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmParticipationDialog
        drive={drive}
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirm}
        initialData={{ fullName: currentStudent.name, rollNumber: currentStudent.rollNumber, section: currentStudent.section, branch: currentStudent.branch, collegeEmail: currentStudent.email, phone: currentStudent.phone, resumeFileName: currentStudent.resumeFileName ?? "", applicationReferenceId: "", confirmed: false }}
        onResumeUploaded={(fileName) => setCurrentStudent((current) => ({ ...current, resumeFileName: fileName }))}
      />
    </div>
  );
}
