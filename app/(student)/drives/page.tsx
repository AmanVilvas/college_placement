"use client";

import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { useApiResource } from "@/lib/useApi";
import { formatDate, formatPackage, getDaysUntilDeadline } from "@/lib/utils";
import { Calendar, MapPin, Clock, Users, RefreshCw } from "lucide-react";
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
  eligibility: {
    branches?: string[];
    minCGPA?: number;
    maxBacklogs?: number;
  };
  companies?: { name: string; logo_url?: string; metadata?: { logoColor?: string } };
}

export default function DrivesPage() {
  // Fetch only Open/Closing Soon drives for the student's campus
  const { data: apiDrives, loading, error, refetch } = useApiResource<ApiDrive[]>(
    "drives",
    {
      select: "id,company_id,role_title,job_type,package_lpa,stipend_monthly,location,work_mode,openings,application_deadline,drive_date,status,eligibility,companies(name,logo_url,metadata)",
      limit: "200",
    },
    { fallback: [] }
  );

  const allDrives = (apiDrives ?? [])
    .filter((d) => d.status === "Open" || d.status === "Closing Soon")
    .sort((a, b) => {
      const aDate = a.drive_date ? new Date(a.drive_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.drive_date ? new Date(b.drive_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });

  return (
    <div>
      <StudentHeader title="Upcoming Drives" subtitle="All scheduled placement drives for your campus" />
      <div className="p-6 space-y-4">
        {/* Connection indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Live Database Connected
            </span>
            <span className="text-slate-500 text-xs">· {allDrives.length} drive{allDrives.length !== 1 ? "s" : ""} active</span>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            title="Sync with database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Could not load drives from the placement database: {error}</p>}

        {loading ? (
          <DataSkeleton label="Loading drives…" variant="list" count={4} />
        ) : allDrives.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center py-24 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No upcoming drives right now</p>
            <p className="text-sm text-slate-400 mt-1">Check back later or contact your placement office.</p>
          </div>
        ) : (
          allDrives.map((drive) => {
            const daysLeft = getDaysUntilDeadline(drive.application_deadline ?? "");
            const companyName = drive.companies?.name ?? "Unknown";
            const logoColor = drive.companies?.metadata?.logoColor ?? "#b91c1c";

            return (
              <Link
                key={drive.id}
                href={`/companies/${drive.id}`}
                className="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all p-5 group"
              >
                <div className="flex gap-4">
                  {/* Date column */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="bg-red-600 text-white rounded-xl px-2 py-1.5">
                      <p className="text-[11px] font-medium opacity-80">
                        {drive.drive_date
                          ? new Date(drive.drive_date).toLocaleString("en", { month: "short" })
                          : "—"}
                      </p>
                      <p className="text-xl font-bold leading-tight">
                        {drive.drive_date ? new Date(drive.drive_date).getDate() : "—"}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {drive.drive_date
                        ? new Date(drive.drive_date).toLocaleString("en", { weekday: "short" })
                        : ""}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <CompanyLogo name={companyName} logoColor={logoColor} logoUrl={drive.companies?.logo_url} size="md" />
                        <div>
                          <p className="font-bold text-slate-900">{companyName}</p>
                          <p className="text-sm text-slate-600">{drive.role_title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          {formatPackage(drive.package_lpa, drive.stipend_monthly)}
                        </p>
                        <StatusBadge status={drive.status} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                      {drive.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />{drive.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />{drive.openings} opening{drive.openings !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Deadline: {drive.application_deadline ? formatDate(drive.application_deadline) : "No deadline"}
                        {daysLeft > 0 && (
                          <span className={`ml-1 font-semibold ${daysLeft <= 3 ? "text-red-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-600"}`}>
                            ({daysLeft}d left)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Eligibility chips */}
                    {(drive.eligibility?.branches ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(drive.eligibility?.branches ?? []).map((b) => (
                          <span key={b} className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            {b}
                          </span>
                        ))}
                        {(drive.eligibility?.minCGPA ?? 0) > 0 && (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            CGPA ≥ {drive.eligibility.minCGPA}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
