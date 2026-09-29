"use client";

import { StudentHeader } from "@/components/student/StudentHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { drives as seededDrives } from "@/lib/data/companies";
import { formatDate, formatPackage, APPLICATION_JOURNEY } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useStudentApplications } from "@/lib/studentState";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { CheckCircle, Circle, FileText, Calendar, Building2 } from "lucide-react";
import Link from "next/link";

export default function MyApplicationsPage() {
  const { applications: myApps } = useStudentApplications();
  const [drives] = useLocalStorageState("placement-helper:drives", seededDrives);

  const statusGroups = {
    active: myApps.filter((a) => !["Placed", "Rejected", "Not Responded"].includes(a.status)),
    notResponded: myApps.filter((a) => a.status === "Not Responded"),
    completed: myApps.filter((a) => ["Placed", "Rejected"].includes(a.status)),
  };

  return (
    <div>
      <StudentHeader title="My Applications" subtitle="Track your placement journey for each company" />
      <div className="p-6 space-y-6">

        {myApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No applications yet</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm">
              Browse available companies and apply to start tracking your placement journey here.
            </p>
            <Link
              href="/companies"
              className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Browse Companies
            </Link>
          </div>
        ) : (
          <>
            {/* Active Applications */}
            {statusGroups.active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
                  Active ({statusGroups.active.length})
                </h2>
                <div className="space-y-4">
                  {statusGroups.active.map((app) => {
                    const drive = drives.find((d) => d.id === app.driveId);
                    const stepIndex = APPLICATION_JOURNEY.indexOf(app.status as typeof APPLICATION_JOURNEY[number]);
                    return (
                      <div key={app.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-start gap-4 mb-5">
                          <CompanyLogo
                            name={app.companyName}
                            logoColor={drive?.companyLogoColor || "#6366f1"}
                            size="md"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <h3 className="font-bold text-slate-900">{app.companyName}</h3>
                                <p className="text-sm text-slate-500">{app.driveName}</p>
                              </div>
                              <StatusBadge status={app.status} />
                            </div>
                            {app.appliedAt && (
                              <p className="text-xs text-slate-400 mt-1">
                                Applied on {formatDate(app.appliedAt)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Journey Progress */}
                        <div className="overflow-x-auto pb-2">
                          <div className="flex items-center gap-0 min-w-max">
                            {APPLICATION_JOURNEY.filter(s => !["Eligible", "Interested"].includes(s)).map((step, i, arr) => {
                              const stepIdx = APPLICATION_JOURNEY.indexOf(step);
                              const isDone = stepIndex > stepIdx;
                              const isCurrent = stepIndex === stepIdx;
                              const isNext = !isDone && !isCurrent;
                              return (
                                <div key={step} className="flex items-center">
                                  <div className="flex flex-col items-center">
                                    <div className={cn(
                                      "w-6 h-6 rounded-full flex items-center justify-center",
                                      isDone ? "bg-emerald-500" : isCurrent ? "bg-indigo-600" : "bg-slate-200"
                                    )}>
                                      {isDone ? (
                                        <CheckCircle className="w-4 h-4 text-white" />
                                      ) : isCurrent ? (
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                      ) : (
                                        <Circle className="w-3 h-3 text-slate-400" />
                                      )}
                                    </div>
                                    <span className={cn(
                                      "text-[9px] font-medium mt-1 text-center w-14",
                                      isDone ? "text-emerald-600" : isCurrent ? "text-indigo-600 font-bold" : "text-slate-400"
                                    )}>
                                      {step}
                                    </span>
                                  </div>
                                  {i < arr.length - 1 && (
                                    <div className={cn(
                                      "w-8 h-0.5 mb-3",
                                      isDone ? "bg-emerald-400" : "bg-slate-200"
                                    )} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Not Responded */}
            {statusGroups.notResponded.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-4">
                  ⚠ Action Required — Not Confirmed ({statusGroups.notResponded.length})
                </h2>
                <div className="space-y-3">
                  {statusGroups.notResponded.map((app) => {
                    const drive = drives.find((d) => d.id === app.driveId);
                    return (
                      <div key={app.id} className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center gap-4">
                        <CompanyLogo
                          name={app.companyName}
                          logoColor={drive?.companyLogoColor || "#f59e0b"}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900">{app.companyName}</p>
                          <p className="text-xs text-slate-500">{app.driveName}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={app.status} />
                          <Link
                            href={`/companies/${app.driveId}`}
                            className="text-xs bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                          >
                            Confirm Now
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
