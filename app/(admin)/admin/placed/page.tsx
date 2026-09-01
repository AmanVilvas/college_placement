"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { students } from "@/lib/data/students";
import { applications } from "@/lib/data/applications";
import { drives, companies } from "@/lib/data/companies";
import { formatPackage, formatDate } from "@/lib/utils";
import { Trophy, Award, Search, Building2, Sparkles, TrendingUp, Download } from "lucide-react";

export default function AdminPlacedStudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const placedStudents = students.filter((s) => s.placementStatus === "Placed");

  const filtered = placedStudents.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <AdminHeader
        title="Placed Students"
        subtitle="Wall of achievement — Verified campus placement offers & corporate selections"
      />

      <div className="p-6 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg shadow-emerald-900/10">
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Batch 2026 Milestone</span>
              </div>
              <h2 className="text-2xl font-bold">{placedStudents.length} Students Successfully Placed</h2>
              <p className="text-xs text-emerald-100 max-w-xl">
                Highest offer: <strong>₹45.0 LPA (Microsoft)</strong> • Average package: <strong>₹14.2 LPA</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center">
                <span className="text-[10px] text-emerald-200 block uppercase">Conversion Rate</span>
                <span className="text-lg font-bold text-white">45%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search placed candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        {/* Grid Cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((student) => {
            const studentApps = applications.filter((a) => a.studentId === student.id);
            const offerApp = studentApps.find((a) => a.status === "Placed" || a.status === "Selected") || studentApps[0];
            const drive = drives.find((d) => d.id === offerApp?.driveId);

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-60 pointer-events-none" />

                <div className="relative z-10 flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0">
                    {student.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{student.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{student.rollNumber} • {student.branch} (Sec {student.section})</p>
                    <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                      CGPA: {student.cgpa}
                    </span>
                  </div>
                </div>

                {offerApp && (
                  <div className="bg-slate-50/80 rounded-xl p-3.5 space-y-2 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Recruiting Organization:</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" /> {offerApp.companyName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Designation / Role:</span>
                      <span className="font-semibold text-slate-800">{offerApp.driveName}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Compensation Package:</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        {drive ? formatPackage(drive.packageLPA, drive.stipendMonthly) : "₹12.0 LPA"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Verified by Placement Cell</span>
                  <span className="text-teal-600 font-semibold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Placed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
