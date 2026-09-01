"use client";

import { useState } from "react";
import { StudentHeader } from "@/components/student/StudentHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { drives } from "@/lib/data/companies";
import { formatPackage, formatDate, getDaysUntilDeadline } from "@/lib/utils";
import { MapPin, Briefcase, Users, Clock, ArrowRight, Search, Filter } from "lucide-react";
import Link from "next/link";

export default function CompaniesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");

  const filteredDrives = drives.filter((d) => {
    const matchesSearch =
      d.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "All" ||
      (filterType === "Full-time" && d.jobType === "Full-time") ||
      (filterType === "Internship" && d.jobType === "Internship") ||
      (filterType === "Open" && (d.status === "Open" || d.status === "Closing Soon"));
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <StudentHeader
        title="Placement Opportunities"
        subtitle="Active campus hiring drives, recruitment schedules, and CTC packages"
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies, roles, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            {["All", "Open", "Full-time", "Internship"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === type
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Drives Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredDrives.map((drive) => {
            const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);

            return (
              <Link
                key={drive.id}
                href={`/companies/${drive.id}`}
                className="card-clean-hover p-5 bg-white flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={drive.companyName} logoColor={drive.companyLogoColor} size="lg" />
                      <div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                          {drive.companyName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{drive.role}</p>
                      </div>
                    </div>
                    <StatusBadge status={drive.status} size="sm" />
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-lg font-extrabold text-slate-950 tracking-tight">
                      {formatPackage(drive.packageLPA, drive.stipendMonthly)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{drive.jobType}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{drive.location}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" />{drive.openings} openings</span>
                    <span>•</span>
                    <span className="text-slate-600 font-medium">Min CGPA: {drive.eligibility.minCGPA}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span className={`font-medium ${daysLeft <= 3 ? "text-rose-600" : "text-slate-500"}`}>
                    Deadline: {formatDate(drive.applicationDeadline)} {daysLeft > 0 && `(${daysLeft}d left)`}
                  </span>
                  <span className="font-semibold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1">
                    View Details <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
