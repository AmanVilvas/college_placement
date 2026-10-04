"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddDriveDialog } from "@/components/admin/AddDriveDialog";
import { apiMutate, useApiResource } from "@/lib/useApi";
import { Drive } from "@/lib/types";
import { formatPackage, formatDate, getDaysUntilDeadline } from "@/lib/utils";
import {
  Building2, Globe, ExternalLink, Calendar, MapPin,
  Users, Plus, ArrowLeft, CheckCircle2, Clock, AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function AdminCompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;
  const { data: companyRows, loading: companyLoading } = useApiResource<Array<{
    id: string; name: string; website?: string | null; industry?: string | null;
    description?: string | null; logo_url?: string | null; metadata?: { logoColor?: string };
  }>>("companies", { id: `eq.${companyId}`, archived: "eq.false", select: "id,name,website,industry,description,logo_url,metadata", limit: "1" }, { fallback: [] });
  const { data: driveRows, refetch: refetchDrives } = useApiResource<Array<{
    id: string; company_id: string; role_title: string; job_type: string; description?: string;
    location?: string; work_mode?: string; package_lpa?: number; stipend_monthly?: number;
    openings: number; application_deadline?: string; drive_date?: string; status: string;
    official_apply_link?: string; eligibility?: { branches?: string[]; minCGPA?: number; maxBacklogs?: number };
  }>>("drives", { company_id: `eq.${companyId}`, select: "id,company_id,role_title,job_type,description,location,work_mode,package_lpa,stipend_monthly,openings,application_deadline,drive_date,status,official_apply_link,eligibility", limit: "300" }, { fallback: [] });
  const { data: applicationRows } = useApiResource<Array<{ id: string; drive_id: string; status: string }>>(
    "applications", { select: "id,drive_id,status", limit: "1000" }, { fallback: [] }
  );
  const companyRow = companyRows?.[0];
  const company = companyRow ? {
    id: companyRow.id,
    name: companyRow.name,
    website: companyRow.website ?? "",
    industry: companyRow.industry ?? "",
    description: companyRow.description ?? "",
    logoUrl: companyRow.logo_url ?? undefined,
    logoColor: companyRow.metadata?.logoColor ?? "#b91c1c",
  } : undefined;
  const drivesList: Drive[] = (driveRows ?? []).map((drive) => ({
    id: drive.id,
    companyId: drive.company_id,
    companyName: company?.name ?? "",
    companyLogoUrl: companyRow?.logo_url ?? undefined,
    companyLogoColor: company?.logoColor ?? "#b91c1c",
    role: drive.role_title,
    jobType: drive.job_type as Drive["jobType"],
    packageLPA: drive.package_lpa,
    stipendMonthly: drive.stipend_monthly,
    location: drive.location ?? "",
    workMode: (drive.work_mode ?? "On-site") as Drive["workMode"],
    openings: drive.openings,
    applicationDeadline: drive.application_deadline ?? "",
    driveDate: drive.drive_date ?? "",
    status: drive.status as Drive["status"],
    officialApplyLink: drive.official_apply_link ?? "",
    jobDescription: drive.description ?? "",
    eligibility: {
      branches: (drive.eligibility?.branches ?? []) as Drive["eligibility"]["branches"],
      minCGPA: drive.eligibility?.minCGPA ?? 0,
      maxBacklogs: drive.eligibility?.maxBacklogs ?? 0,
    },
    requiredSkills: [],
    selectionProcess: [],
    importantInstructions: [],
    createdAt: "",
  }));
  const companyDriveIds = new Set(drivesList.map((drive) => drive.id));
  const companyApplications = (applicationRows ?? []).filter((application) => companyDriveIds.has(application.drive_id));
  const [isAddDriveOpen, setIsAddDriveOpen] = useState(false);

  if (!company && companyLoading) {
    return <div className="p-8 text-center text-slate-500">Loading company…</div>;
  }

  if (!company) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Company not found</p>
        <Link href="/admin/companies" className="text-red-600 font-semibold text-sm mt-2 inline-block">
          ← Back to Companies
        </Link>
      </div>
    );
  }

  const handleAddDrive = async (newDrive: Partial<Drive>) => {
    try {
      await apiMutate("POST", "drives", {
        company_id: companyId,
        role_title: newDrive.role,
        job_type: newDrive.jobType,
        package_lpa: newDrive.packageLPA,
        stipend_monthly: newDrive.stipendMonthly,
        location: newDrive.location,
        work_mode: newDrive.workMode,
        openings: newDrive.openings,
        application_deadline: newDrive.applicationDeadline,
        drive_date: newDrive.driveDate,
        status: newDrive.status ?? "Open",
        official_apply_link: newDrive.officialApplyLink,
        description: newDrive.jobDescription,
        eligibility: newDrive.eligibility ?? {},
        required_skills: newDrive.requiredSkills ?? [],
      });
      refetchDrives();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to add the drive.");
    }
  };

  return (
    <div>
      <AdminHeader
        title={company.name}
        subtitle={`${company.industry} • Recruitment Profile & Drives`}
        action={{
          label: "New Placement Drive",
          onClick: () => setIsAddDriveOpen(true),
        }}
      />

      <div className="p-6 space-y-6">
        <Link
          href="/admin/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Companies Directory
        </Link>

        {/* Company Header Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <CompanyLogo name={company.name} logoColor={company.logoColor} logoUrl={company.logoUrl} size="xl" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {company.industry}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">{company.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:underline flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" /> {company.website.replace("https://", "")} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6 text-xs">
              <div>
                <span className="text-slate-400">Total Drives:</span>
                <p className="text-base font-bold text-slate-800">{drivesList.length}</p>
              </div>
              <div>
                <span className="text-slate-400">Registered Candidates:</span>
                <p className="text-base font-bold text-red-600">
                  {companyApplications.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Drives Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Placement Drives ({drivesList.length})</h2>
            <button
              onClick={() => setIsAddDriveOpen(true)}
              className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Drive
            </button>
          </div>

          {drivesList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
              No placement drives registered yet for {company.name}.
            </div>
          ) : (
            <div className="space-y-4">
              {drivesList.map((drive) => {
                const driveApps = companyApplications.filter((application) => application.drive_id === drive.id);
                const confirmedCount = driveApps.filter((a) => a.status === "Confirmed").length;
                const shortlistedCount = driveApps.filter((a) => a.status === "Shortlisted").length;
                const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);

                return (
                  <div
                    key={drive.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-bold text-slate-900">{drive.role}</h3>
                          <StatusBadge status={drive.status} />
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                            {formatPackage(drive.packageLPA, drive.stipendMonthly)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{drive.location} ({drive.workMode})</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Drive Date: {formatDate(drive.driveDate)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Deadline: {formatDate(drive.applicationDeadline)} ({daysLeft > 0 ? `${daysLeft}d left` : "Passed"})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={drive.officialApplyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" /> Official Apply Form <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </div>
                    </div>

                    {/* Applicant Snapshot */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-500">Total Applicants:</span>
                        <p className="font-bold text-slate-800 text-sm">{driveApps.length}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Confirmed Applications:</span>
                        <p className="font-bold text-teal-700 text-sm">{confirmedCount}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Shortlisted:</span>
                        <p className="font-bold text-amber-700 text-sm">{shortlistedCount}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Open Vacancies:</span>
                        <p className="font-bold text-slate-800 text-sm">{drive.openings}</p>
                      </div>
                    </div>

                    {/* Eligibility summary */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Eligible Branches:</span>
                        <div className="flex gap-1">
                          {drive.eligibility.branches.map((b) => (
                            <span key={b} className="bg-white border border-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                              {b}
                            </span>
                          ))}
                        </div>
                        <span className="text-slate-400 ml-2">Min CGPA: {drive.eligibility.minCGPA}</span>
                      </div>

                      <Link
                        href={`/admin/applications?company=${encodeURIComponent(company.name)}`}
                        className="text-red-600 font-semibold hover:underline flex items-center gap-1 text-xs"
                      >
                        View Registered Students ({driveApps.length}) →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddDriveDialog
        isOpen={isAddDriveOpen}
        onClose={() => setIsAddDriveOpen(false)}
        onAdd={handleAddDrive}
        companyOptions={[{ ...company, drives: [] }]}
      />
    </div>
  );
}
