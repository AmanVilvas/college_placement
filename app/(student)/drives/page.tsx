"use client";

import { StudentHeader } from "@/components/student/StudentHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { drives } from "@/lib/data/companies";
import { formatDate, formatPackage, getDaysUntilDeadline } from "@/lib/utils";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

export default function DrivesPage() {
  const [driveList] = useLocalStorageState("placement-helper:drives", drives);
  const upcoming = driveList
    .filter((d) => d.status === "Open" || d.status === "Closing Soon")
    .sort((a, b) => new Date(a.driveDate).getTime() - new Date(b.driveDate).getTime());

  return (
    <div>
      <StudentHeader title="Upcoming Drives" subtitle="All scheduled placement drives" />
      <div className="p-6 space-y-4">
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center py-24 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No upcoming drives scheduled</p>
          </div>
        ) : (
          upcoming.map((drive) => {
            const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);
            return (
              <Link
                key={drive.id}
                href={`/companies/${drive.id}`}
                className="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-5 group"
              >
                <div className="flex gap-4">
                  {/* Date column */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="bg-indigo-600 text-white rounded-xl px-2 py-1.5">
                      <p className="text-[11px] font-medium opacity-80">
                        {new Date(drive.driveDate).toLocaleString("en", { month: "short" })}
                      </p>
                      <p className="text-xl font-bold leading-tight">
                        {new Date(drive.driveDate).getDate()}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(drive.driveDate).toLocaleString("en", { weekday: "short" })}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <CompanyLogo name={drive.companyName} logoColor={drive.companyLogoColor} size="md" />
                        <div>
                          <p className="font-bold text-slate-900">{drive.companyName}</p>
                          <p className="text-sm text-slate-600">{drive.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">{formatPackage(drive.packageLPA, drive.stipendMonthly)}</p>
                        <StatusBadge status={drive.status} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{drive.location}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{drive.openings} openings</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Deadline: {formatDate(drive.applicationDeadline)}
                        {daysLeft > 0 && (
                          <span className={`ml-1 font-semibold ${daysLeft <= 3 ? "text-red-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-600"}`}>
                            ({daysLeft}d left)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {drive.eligibility.branches.map((b) => (
                        <span key={b} className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">{b}</span>
                      ))}
                    </div>
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
