"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { StudentHeader } from "@/components/student/StudentHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmParticipationDialog } from "@/components/shared/ConfirmParticipationDialog";
import type { ConfirmationFormData } from "@/components/shared/ConfirmParticipationDialog";
import { isDriveAcceptingApplications } from "@/lib/driveRegistration";
import type { Application } from "@/lib/types";
import { apiMutate, useApiResource } from "@/lib/useApi";
import {
  formatPackage, formatDate, getDaysUntilDeadline,
} from "@/lib/utils";
import {
  MapPin, Briefcase, Users, Globe,
  CheckCircle, ChevronLeft, Check, AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface ApiDrive {
  id: string;
  company_id: string;
  role_title: string;
  job_type?: string;
  package_lpa?: number | string | null;
  stipend_monthly?: number | string | null;
  location?: string | null;
  work_mode?: string | null;
  openings?: number;
  application_deadline?: string | null;
  drive_date?: string | null;
  status: string;
  official_apply_link?: string | null;
  description?: string | null;
  eligibility?: Record<string, unknown>;
  required_skills?: string[];
  selection_process?: string[];
  companies?: { name?: string; logo_url?: string; metadata?: { logoColor?: string } };
}

interface ApiApplication {
  id: string;
  drive_id: string;
  status: string;
}

function toDrive(row: ApiDrive) {
  const eligibility = row.eligibility ?? {};
  const jobType = ["Full-time", "Internship", "Part-time", "Contract"].includes(row.job_type ?? "")
    ? row.job_type as "Full-time" | "Internship" | "Part-time" | "Contract"
    : "Full-time";
  const workMode = ["On-site", "Remote", "Hybrid"].includes(row.work_mode ?? "")
    ? row.work_mode as "On-site" | "Remote" | "Hybrid"
    : "On-site";
  const status = ["Open", "Closing Soon", "Closed", "Completed"].includes(row.status)
    ? row.status as "Open" | "Closing Soon" | "Closed" | "Completed"
    : "Closed";
  const selection = Array.isArray(row.selection_process) ? row.selection_process : [];

  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.companies?.name ?? "Company",
    companyLogoUrl: row.companies?.logo_url ?? undefined,
    companyLogoColor: row.companies?.metadata?.logoColor ?? "#6366f1",
    role: row.role_title,
    jobType,
    packageLPA: row.package_lpa == null ? undefined : Number(row.package_lpa),
    stipendMonthly: row.stipend_monthly == null ? undefined : Number(row.stipend_monthly),
    location: row.location ?? "Not specified",
    workMode,
    openings: row.openings ?? 1,
    applicationDeadline: row.application_deadline ?? "",
    driveDate: row.drive_date ?? "",
    status,
    officialApplyLink: row.official_apply_link ?? "",
    jobDescription: row.description ?? "Company has not provided a job description yet.",
    eligibility: {
      branches: Array.isArray(eligibility.branches) ? eligibility.branches as Application["studentBranch"][] : [],
      minCGPA: Number(eligibility.minCGPA ?? eligibility.min_cgpa ?? 0),
      maxBacklogs: Number(eligibility.maxBacklogs ?? eligibility.max_backlogs ?? 99),
      passOutYear: typeof eligibility.passOutYear === "string" ? eligibility.passOutYear : undefined,
      tenthMin: typeof eligibility.tenthMin === "number" ? eligibility.tenthMin : undefined,
      twelfthMin: typeof eligibility.twelfthMin === "number" ? eligibility.twelfthMin : undefined,
    },
    requiredSkills: row.required_skills ?? [],
    selectionProcess: selection,
    importantInstructions: [],
    createdAt: new Date().toISOString(),
  };
}

export default function DriveDetailPage() {
  const params = useParams();
  const driveId = params.id as string;
  const { data: liveDriveRows, loading: driveLoading } = useApiResource<ApiDrive[]>("drives", {
    id: `eq.${driveId}`,
    select: "id,company_id,role_title,job_type,package_lpa,stipend_monthly,location,work_mode,openings,application_deadline,drive_date,status,official_apply_link,description,eligibility,required_skills,selection_process,companies(name,logo_url,metadata)",
    limit: "1",
  }, { fallback: [] });
  const { data: liveApplications, refetch: refetchApplications } = useApiResource<ApiApplication[]>("applications", {
    drive_id: `eq.${driveId}`,
    select: "id,drive_id,status",
    limit: "50",
  }, { fallback: [] });
  const [portalLaunches, setPortalLaunches] = useState<Record<string, string>>({});
  const liveRow = liveDriveRows?.[0];
  const drive = liveRow ? toDrive(liveRow) : undefined;

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!drive) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500 mb-2">{driveLoading ? "Loading drive…" : "Drive not found in the placement database"}</p>
        <Link href="/companies" className="text-indigo-600 font-semibold text-xs hover:underline">
          ← Back to Companies
        </Link>
      </div>
    );
  }

  const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);
  const isClosed = !isDriveAcceptingApplications(drive);
  const confirmed = Boolean(liveApplications?.some((application) => application.drive_id === drive.id && application.status === "Confirmed"));

  const handleConfirm = async (data: ConfirmationFormData) => {
    if (!isDriveAcceptingApplications(drive) || !data.confirmed) return false;
    await apiMutate("POST", "applications", {
      drive_id: drive.id,
      confirmation_data: data,
    });
    refetchApplications();
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
                  Apply or Confirm
                </span>
                <h3 className="text-base font-bold text-slate-900">Choose an action</h3>
                <p className="text-xs text-slate-500">
                  Apply on the company site, or send your details to the placement team. You can do both.
                </p>
              </div>

              {portalLaunches[drive.id] && <p className="text-[10px] font-semibold text-emerald-700">Official portal opened · {formatDate(portalLaunches[drive.id])}</p>}
              <div className="grid grid-cols-2 gap-2">
                {isClosed ? (
                  <button disabled className="min-h-11 rounded-xl bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed">
                    Applications Closed
                  </button>
                ) : (
                  <a
                    href={drive.officialApplyLink}
                    onClick={() => setPortalLaunches((current) => ({ ...current, [drive.id]: new Date().toISOString() }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-11 rounded-xl bg-slate-900 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors shadow-xs"
                  >
                    <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                    Official Site ↗
                  </a>
                )}

                {confirmed ? (
                  <div className="min-h-11 rounded-xl border border-teal-200 bg-teal-50 px-2 py-2 text-[11px] font-semibold text-teal-800 flex items-center justify-center gap-1 text-center">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-teal-600" /> Confirmed
                  </div>
                ) : (
                  <button
                    onClick={() => !isClosed && setShowConfirmDialog(true)}
                    disabled={isClosed}
                    className={`min-h-11 rounded-xl px-2 py-2 text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-xs ${isClosed ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                  >
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                    Confirm Here
                  </button>
                )}
              </div>
            </div>

            {/* Eligibility Summary Box */}
            <div className="card-clean p-5 bg-white space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Eligibility Criteria</h4>
              <div className="space-y-2 text-slate-600">
                <div className="rounded-lg bg-slate-50 p-3 text-slate-700">
                  <p className="font-semibold">Review the company’s listed criteria before applying.</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Allowed Branches:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {drive.eligibility.branches.length ? drive.eligibility.branches.join(", ") : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Minimum CGPA:</span>
                  <span className="font-semibold text-slate-900">{drive.eligibility.minCGPA || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Backlogs:</span>
                  <span className="font-semibold text-slate-900">{drive.eligibility.maxBacklogs === 99 ? "Not specified" : drive.eligibility.maxBacklogs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Drive Date:</span>
                  <span className="font-semibold text-slate-900">{drive.driveDate ? formatDate(drive.driveDate) : "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Application Deadline:</span>
                  <span className="font-semibold text-slate-900">{drive.applicationDeadline ? formatDate(drive.applicationDeadline) : "Not specified"}</span>
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
        initialData={{ classYear: "", section: "", degree: "", specialization: "", resumeFileName: "", applicationReferenceId: "", confirmed: false }}
      />
    </div>
  );
}
