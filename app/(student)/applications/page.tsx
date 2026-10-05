"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { formatDate, APPLICATION_JOURNEY } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useApiResource } from "@/lib/useApi";
import type { Application } from "@/lib/types";
import { CheckCircle, Circle, FileText, PartyPopper } from "lucide-react";
import Link from "next/link";

interface ApiApplication {
  id: string;
  student_id: string;
  drive_id: string;
  status: string;
  confirmation_data?: Application["confirmationData"];
  applied_at?: string;
  updated_at?: string;
  drives?: { role_title?: string; company_id?: string; companies?: { name?: string; logo_url?: string; metadata?: { logoColor?: string } } };
}

export default function MyApplicationsPage() {
  const { data: rows, error } = useApiResource<ApiApplication[]>("applications", {
    select: "id,student_id,drive_id,status,confirmation_data,applied_at,updated_at,drives(role_title,company_id,companies(name,logo_url,metadata))",
    order: "applied_at.desc",
    limit: "500",
  }, { fallback: [] });
  const databaseApps: Application[] = (rows ?? []).map((row) => {
    const confirmation = row.confirmation_data;
    const liveDrive = row.drives;
    return {
      id: row.id,
      studentId: row.student_id,
      studentName: confirmation?.fullName || "Student",
      studentRollNumber: confirmation?.rollNumber || "",
      studentBranch: (confirmation?.specialization || "") as Application["studentBranch"],
      studentSection: confirmation?.section || "",
      driveId: row.drive_id,
      driveName: liveDrive?.role_title || "Placement drive",
      companyId: liveDrive?.company_id || "",
      companyName: liveDrive?.companies?.name || "Company",
      companyLogoUrl: liveDrive?.companies?.logo_url,
      status: row.status as Application["status"],
      appliedAt: row.applied_at,
      confirmedAt: confirmation?.confirmedAt,
      confirmationData: confirmation,
      followUpCount: 0,
      updatedAt: row.updated_at || row.applied_at || "",
    };
  });
  const myApps = databaseApps;
  const placedApplications = myApps.filter((application) => application.status === "Placed");
  const [showConfetti, setShowConfetti] = useState(false);
  const placedApplicationKey = placedApplications.map((application) => application.id).sort().join(",");

  useEffect(() => {
    if (!placedApplicationKey) return;
    setShowConfetti(true);
    const timeout = window.setTimeout(() => setShowConfetti(false), 4200);
    return () => window.clearTimeout(timeout);
  }, [placedApplicationKey]);

  const statusGroups = {
    active: myApps.filter((a) => !["Placed", "Rejected", "Not Responded"].includes(a.status)),
    notResponded: myApps.filter((a) => a.status === "Not Responded"),
    placed: placedApplications,
    completed: myApps.filter((a) => a.status === "Rejected"),
  };

  return (
    <div>
      <StudentHeader title="My Applications" subtitle="Track your placement journey for each company" />
      <div className="p-6 space-y-6">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Could not load applications from the placement database: {error}</p>}

        {showConfetti && (
          <div aria-hidden="true" className="placement-confetti-layer">
            {Array.from({ length: 42 }, (_, index) => (
              <span
                key={index}
                className="placement-confetti-piece"
                style={{
                  left: `${(index * 43) % 100}%`,
                  backgroundColor: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"][index % 5],
                  animationDelay: `${(index % 12) * 55}ms`,
                  animationDuration: `${2.5 + (index % 4) * 0.2}s`,
                  "--confetti-drift": `${((index * 17) % 90) - 45}px`,
                } as CSSProperties}
              />
            ))}
          </div>
        )}

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
              className="bg-red-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-red-700 transition-colors"
            >
              Browse Companies
            </Link>
          </div>
        ) : (
          <>
            {statusGroups.placed.length > 0 && (
              <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-sm">
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <PartyPopper className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-emerald-900">Congratulations on your placement!</h2>
                      <p className="text-xs text-emerald-800">Your placement office has marked this application as placed.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {statusGroups.placed.map((app) => (
                      <article key={app.id} className="rounded-xl border border-emerald-100 bg-white/90 p-4">
                        <div className="flex items-center gap-3">
                        <CompanyLogo name={app.companyName} logoColor="#059669" logoUrl={app.companyLogoUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{app.companyName}</p>
                          <p className="truncate text-xs text-slate-600">{app.driveName}</p>
                          {app.updatedAt && <p className="mt-0.5 text-[10px] text-slate-400">Updated {formatDate(app.updatedAt)}</p>}
                        </div>
                        <StatusBadge status={app.status} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-emerald-100 pt-3 text-xs text-slate-500">
                          {app.appliedAt && <p>Applied on {formatDate(app.appliedAt)}</p>}
                          {app.confirmedAt && <p>Confirmed on {formatDate(app.confirmedAt)}</p>}
                        </div>
                        <h3 className="mb-3 mt-4 text-xs font-semibold text-slate-700">Placement journey</h3>
                        <div className="overflow-x-auto pb-2">
                          <ol aria-label={`Placement journey for ${app.companyName}`} className="flex min-w-max items-center">
                            {APPLICATION_JOURNEY.filter((step) => !["Eligible", "Interested"].includes(step)).map((step, index, steps) => (
                              <li key={step} aria-current={step === "Placed" ? "step" : undefined} className="flex items-center">
                                <div className="flex flex-col items-center">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600">
                                    <CheckCircle aria-hidden="true" className="h-4 w-4 text-white" />
                                  </div>
                                  <span className="mt-1 w-16 text-center text-[10px] font-semibold text-emerald-700">{step}</span>
                                </div>
                                {index < steps.length - 1 && <div aria-hidden="true" className="mb-4 h-0.5 w-8 bg-emerald-400" />}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500">Current status: Placed. Progress is based on the placement office’s latest status.</p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Active Applications */}
            {statusGroups.active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
                  Active ({statusGroups.active.length})
                </h2>
                <div className="space-y-4">
                  {statusGroups.active.map((app) => {
                    const stepIndex = APPLICATION_JOURNEY.indexOf(app.status as typeof APPLICATION_JOURNEY[number]);
                    return (
                      <div key={app.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-start gap-4 mb-5">
                          <CompanyLogo
                            name={app.companyName}
                            logoColor="#b91c1c"
                            logoUrl={app.companyLogoUrl}
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
                              return (
                                <div key={step} className="flex items-center">
                                  <div className="flex flex-col items-center">
                                    <div className={cn(
                                      "w-6 h-6 rounded-full flex items-center justify-center",
                                      isDone ? "bg-emerald-500" : isCurrent ? "bg-red-600" : "bg-slate-200"
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
                                      isDone ? "text-emerald-600" : isCurrent ? "text-red-600 font-bold" : "text-slate-400"
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
                    return (
                      <div key={app.id} className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center gap-4">
                        <CompanyLogo
                          name={app.companyName}
                          logoColor="#f59e0b"
                          logoUrl={app.companyLogoUrl}
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
