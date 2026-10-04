"use client";

import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { useState, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddDriveDialog } from "@/components/admin/AddDriveDialog";
import { useApiResource, apiMutate } from "@/lib/useApi";
import { Drive, DriveStatus } from "@/lib/types";
import { formatPackage, formatDate, getDaysUntilDeadline } from "@/lib/utils";
import { CalendarDays, Plus, MapPin, Users, Globe, ExternalLink, Search, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ApiDrive {
  id: string;
  company_id: string;
  role_title: string;
  job_type: string;
  package_lpa?: number;
  stipend_monthly?: number;
  location?: string;
  work_mode?: string;
  openings: number;
  application_deadline?: string;
  drive_date?: string;
  status: string;
  official_apply_link?: string;
  eligibility: Record<string, unknown>;
  required_skills?: string[];
  companies?: { name: string; logo_url?: string; metadata?: { logoColor?: string } };
}

interface ApiCompany {
  id: string;
  name: string;
  metadata?: { logoColor?: string };
}

function apiDriveToLocalDrive(d: ApiDrive): Drive {
  return {
    id: d.id,
    companyId: d.company_id,
    companyName: d.companies?.name ?? "Unknown",
    companyLogoUrl: d.companies?.logo_url,
    companyLogoColor: d.companies?.metadata?.logoColor ?? "#b91c1c",
    role: d.role_title,
    jobType: d.job_type as Drive["jobType"],
    packageLPA: d.package_lpa ?? undefined,
    stipendMonthly: d.stipend_monthly ?? undefined,
    location: d.location ?? "TBD",
    workMode: (d.work_mode as Drive["workMode"]) ?? "On-site",
    openings: d.openings,
    applicationDeadline: d.application_deadline ?? new Date().toISOString(),
    driveDate: d.drive_date ?? new Date().toISOString(),
    status: d.status as Drive["status"],
    officialApplyLink: d.official_apply_link ?? "#",
    jobDescription: "",
    eligibility: {
      branches: (d.eligibility?.branches as Drive["eligibility"]["branches"]) ?? [],
      minCGPA: (d.eligibility?.minCGPA as number) ?? 0,
      maxBacklogs: (d.eligibility?.maxBacklogs as number) ?? 99,
    },
    requiredSkills: d.required_skills ?? [],
    selectionProcess: [],
    importantInstructions: [],
    createdAt: new Date().toISOString(),
  };
}

export default function AdminDrivesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const {
    data: apiDrives,
    loading: drivesLoading,
    error: drivesError,
    refetch: refetchDrives,
  } = useApiResource<ApiDrive[]>(
    "drives",
    {
      select: "id,company_id,role_title,job_type,package_lpa,stipend_monthly,location,work_mode,openings,application_deadline,drive_date,status,official_apply_link,eligibility,required_skills,companies(name,logo_url,metadata)",
      limit: "300",
    },
    { fallback: [] }
  );

  const {
    data: apiCompanies,
    refetch: refetchCompanies,
  } = useApiResource<ApiCompany[]>("companies", { archived: "eq.false", select: "id,name,metadata", limit: "200" }, { fallback: [] });

  const drivesList: Drive[] = (apiDrives ?? []).map(apiDriveToLocalDrive);

  const companyOptions = (apiCompanies ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        logoColor: c.metadata?.logoColor ?? "#b91c1c",
        website: "",
        description: "",
        industry: "",
        drives: [],
      }));

  const filtered = drivesList.filter((d) => {
    const matchesSearch =
      d.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddDrive = useCallback(
    async (newDrive: Partial<Drive>) => {
      try {
        await apiMutate("POST", "drives", {
          company_id: newDrive.companyId,
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
      } catch (err) {
        throw err;
      }
    },
    [refetchDrives]
  );

  const handleStatusChange = useCallback(
    async (driveId: string, newStatus: DriveStatus) => {
      setUpdatingId(driveId);
      try {
        await apiMutate("PATCH", `drives/${driveId}`, { status: newStatus });
        refetchDrives();
      } catch (err) {
        alert((err as Error).message);
      } finally {
        setUpdatingId(null);
      }
    },
    [refetchDrives]
  );

  return (
    <div>
      <AdminHeader
        title="Placement Drives"
        subtitle="Manage active, closing, and completed campus recruitment drives"
        action={{
          label: "New Placement Drive",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsAddOpen(true),
        }}
      />

      <div className="p-6 space-y-6">
        {/* Database connection status */}
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border shadow-2xs ${drivesError ? "text-rose-700 bg-rose-50 border-rose-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"}`}>
            <span className={`w-2 h-2 rounded-full ${drivesError ? "bg-rose-500" : drivesLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            {drivesError ? "Database unavailable" : drivesLoading ? "Connecting to placement database…" : "Connected to placement database"}
          </div>
          <button
            onClick={refetchDrives}
            disabled={drivesLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
            title="Sync with database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>

        {drivesError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{drivesError}</span>
            <button onClick={refetchDrives} className="ml-auto flex items-center gap-1.5 text-xs font-semibold hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search company or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
              {["All", "Open", "Closing Soon", "Closed", "Completed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${statusFilter === s ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={refetchDrives}
              disabled={drivesLoading}
              title="Refresh"
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drives List */}
        {drivesLoading ? (
          <DataSkeleton label="Loading drives…" variant="list" count={4} />
        ) : (
          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center py-20 text-center">
                <CalendarDays className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-slate-500 font-medium">No drives found</p>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="mt-3 text-sm text-red-600 font-semibold hover:underline"
                >
                  Add first drive
                </button>
              </div>
            )}

            {filtered.map((drive) => {
              const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);
              return (
                <div
                  key={drive.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <CompanyLogo name={drive.companyName} logoColor={drive.companyLogoColor} logoUrl={drive.companyLogoUrl} size="lg" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{drive.companyName}</h3>
                          <span className="text-slate-400">•</span>
                          <span className="font-semibold text-slate-700 text-sm">{drive.role}</span>
                          <StatusBadge status={drive.status} />
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                            {formatPackage(drive.packageLPA, drive.stipendMonthly)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />{drive.location} ({drive.workMode})
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />{drive.openings} Openings
                          </span>
                          <span>•</span>
                          <span>
                            Deadline: <strong className="text-slate-700">{formatDate(drive.applicationDeadline)}</strong>
                            {" "}({daysLeft > 0 ? `${daysLeft}d left` : "Closed"})
                          </span>
                          <span>•</span>
                          <span>Drive Date: <strong className="text-slate-700">{formatDate(drive.driveDate)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Status Dropdown */}
                    <div className="flex items-center gap-3 self-end lg:self-center">
                      <select
                        value={drive.status}
                        disabled={updatingId === drive.id}
                        onChange={(e) => handleStatusChange(drive.id, e.target.value as DriveStatus)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none disabled:opacity-60"
                      >
                        <option value="Open">Set: Open</option>
                        <option value="Closing Soon">Set: Closing Soon</option>
                        <option value="Closed">Set: Closed</option>
                        <option value="Completed">Set: Completed</option>
                      </select>

                      {drive.officialApplyLink && drive.officialApplyLink !== "#" && (
                        <a
                          href={drive.officialApplyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" /> Form Link <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Eligibility chips */}
                  {drive.eligibility.branches.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 font-medium mr-1 self-center">Eligible:</span>
                      {drive.eligibility.branches.map((b) => (
                        <span key={b} className="bg-red-50 text-red-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {b}
                        </span>
                      ))}
                      {drive.eligibility.minCGPA > 0 && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          CGPA ≥ {drive.eligibility.minCGPA}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <Link
                      href={`/admin/applications?drive=${encodeURIComponent(drive.id)}`}
                      className="text-red-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      Manage Candidates & Applications →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddDriveDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddDrive}
        companyOptions={companyOptions}
      />
    </div>
  );
}
