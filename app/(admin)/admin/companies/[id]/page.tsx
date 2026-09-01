"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddDriveDialog } from "@/components/admin/AddDriveDialog";
import { companies, drives as initialDrives } from "@/lib/data/companies";
import { applications } from "@/lib/data/applications";
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
  const company = companies.find((c) => c.id === companyId);
  const [drivesList, setDrivesList] = useState<Drive[]>(initialDrives.filter((d) => d.companyId === companyId));
  const [isAddDriveOpen, setIsAddDriveOpen] = useState(false);

  if (!company) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Company not found</p>
        <Link href="/admin/companies" className="text-indigo-600 font-semibold text-sm mt-2 inline-block">
          ← Back to Companies
        </Link>
      </div>
    );
  }

  const handleAddDrive = (newDrive: Partial<Drive>) => {
    setDrivesList([newDrive as Drive, ...drivesList]);
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Companies Directory
        </Link>

        {/* Company Header Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <CompanyLogo name={company.name} logoColor={company.logoColor} size="xl" />
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
                    className="text-indigo-600 hover:underline flex items-center gap-1"
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
                <p className="text-base font-bold text-indigo-600">
                  {applications.filter((a) => a.companyId === companyId).length}
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
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
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
                const driveApps = applications.filter((a) => a.driveId === drive.id);
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
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
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
                        className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 text-xs"
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
      />
    </div>
  );
}
