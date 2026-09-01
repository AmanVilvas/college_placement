"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddDriveDialog } from "@/components/admin/AddDriveDialog";
import { drives as initialDrives } from "@/lib/data/companies";
import { applications } from "@/lib/data/applications";
import { Drive, DriveStatus } from "@/lib/types";
import { formatPackage, formatDate, getDaysUntilDeadline } from "@/lib/utils";
import { CalendarDays, Plus, MapPin, Users, Globe, ExternalLink, Search, Filter } from "lucide-react";
import Link from "next/link";

export default function AdminDrivesPage() {
  const [drivesList, setDrivesList] = useState<Drive[]>(initialDrives);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filtered = drivesList.filter((d) => {
    const matchesSearch = d.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddDrive = (newDrive: Partial<Drive>) => {
    setDrivesList([newDrive as Drive, ...drivesList]);
  };

  const handleStatusChange = (driveId: string, newStatus: DriveStatus) => {
    setDrivesList(drivesList.map((d) => d.id === driveId ? { ...d, status: newStatus } : d));
  };

  return (
    <div>
      <AdminHeader
        title="Placement Drives"
        subtitle="Manage active, closing, and completed campus recruitment drives"
        action={{
          label: "New Placement Drive",
          onClick: () => setIsAddOpen(true),
        }}
      />

      <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search company or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            {["All", "Open", "Closing Soon", "Closed", "Completed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${statusFilter === status ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Drives Table/Cards */}
        <div className="space-y-4">
          {filtered.map((drive) => {
            const driveApps = applications.filter((a) => a.driveId === drive.id);
            const confirmedCount = driveApps.filter((a) => a.status === "Confirmed").length;
            const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);

            return (
              <div
                key={drive.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <CompanyLogo name={drive.companyName} logoColor={drive.companyLogoColor} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">{drive.companyName}</h3>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-700 text-sm">{drive.role}</span>
                        <StatusBadge status={drive.status} />
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {formatPackage(drive.packageLPA, drive.stipendMonthly)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{drive.location} ({drive.workMode})</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{drive.openings} Openings</span>
                        <span>•</span>
                        <span>Deadline: <strong className="text-slate-700">{formatDate(drive.applicationDeadline)}</strong> ({daysLeft > 0 ? `${daysLeft}d left` : "Closed"})</span>
                        <span>•</span>
                        <span>Drive Date: <strong className="text-slate-700">{formatDate(drive.driveDate)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="flex items-center gap-3 self-end lg:self-center">
                    <select
                      value={drive.status}
                      onChange={(e) => handleStatusChange(drive.id, e.target.value as DriveStatus)}
                      className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
                    >
                      <option value="Open">Set: Open</option>
                      <option value="Closing Soon">Set: Closing Soon</option>
                      <option value="Closed">Set: Closed</option>
                      <option value="Completed">Set: Completed</option>
                    </select>

                    <a
                      href={drive.officialApplyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" /> Form Link <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  </div>
                </div>

                {/* Candidate Stats & Eligibility */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span>Applications: <strong className="text-slate-900">{driveApps.length}</strong></span>
                    <span>Confirmed: <strong className="text-teal-700">{confirmedCount}</strong></span>
                    <span>Pending confirmation: <strong className="text-rose-600">{driveApps.length - confirmedCount}</strong></span>
                  </div>

                  <Link
                    href={`/admin/applications?drive=${encodeURIComponent(drive.id)}`}
                    className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    Manage Candidates & Applications →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AddDriveDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddDrive}
      />
    </div>
  );
}
