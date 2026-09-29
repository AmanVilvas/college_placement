"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StudentHeader } from "@/components/student/StudentHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { drives } from "@/lib/data/companies";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useStudentProfile } from "@/lib/studentState";
import { formatDate, formatPackage, getDaysUntilDeadline } from "@/lib/utils";
import {
  ArrowDownWideNarrow, ArrowRight, Bookmark, BriefcaseBusiness, Check,
  CircleAlert, Clock3, MapPin, Search, SlidersHorizontal, Sparkles, Users, X,
} from "lucide-react";

const SAVED_DRIVES_KEY = "placement-helper:saved-drives:s1";
type Availability = "All drives" | "Open now" | "Closing soon" | "Saved";
type SortBy = "Recommended" | "Deadline" | "Package: high to low";

function getEligibility(drive: (typeof drives)[number], student: ReturnType<typeof useStudentProfile>[0]) {
  const reasons: string[] = [];
  if (!drive.eligibility.branches.includes(student.branch)) reasons.push(`${student.branch} is not in the eligible branches`);
  if (student.cgpa < drive.eligibility.minCGPA) reasons.push(`CGPA ${student.cgpa} is below the ${drive.eligibility.minCGPA} minimum`);
  if (student.backlogs > drive.eligibility.maxBacklogs) reasons.push(`${student.backlogs} backlogs exceeds the limit of ${drive.eligibility.maxBacklogs}`);
  if (drive.eligibility.tenthMin && student.tenthPercent < drive.eligibility.tenthMin) reasons.push(`10th score is below ${drive.eligibility.tenthMin}%`);
  if (drive.eligibility.twelfthMin && student.twelfthPercent < drive.eligibility.twelfthMin) reasons.push(`12th score is below ${drive.eligibility.twelfthMin}%`);
  if (drive.eligibility.passOutYear && drive.eligibility.passOutYear !== "2026") reasons.push(`Graduation year ${drive.eligibility.passOutYear} does not match your batch`);
  return reasons;
}

export default function CompaniesPage() {
  const [student] = useStudentProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [availability, setAvailability] = useState<Availability>("All drives");
  const [jobType, setJobType] = useState("Any type");
  const [workMode, setWorkMode] = useState("Any location");
  const [sortBy, setSortBy] = useState<SortBy>("Recommended");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [savedIds, setSavedIds, savedLoaded] = useLocalStorageState<string[]>(SAVED_DRIVES_KEY, []);
  const [driveList] = useLocalStorageState("placement-helper:drives", drives);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search).get("search");
    if (search) setSearchTerm(search);
  }, []);

  const filtersActive = Boolean(searchTerm || availability !== "All drives" || jobType !== "Any type" || workMode !== "Any location" || eligibleOnly);
  const filteredDrives = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = driveList.filter((drive) => {
      const searchable = [drive.companyName, drive.role, drive.location, ...drive.requiredSkills].join(" ").toLowerCase();
      const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);
      const open = drive.status === "Open" || drive.status === "Closing Soon";
      return (!query || searchable.includes(query))
        && (availability === "All drives" || (availability === "Open now" && open && daysLeft >= 0) || (availability === "Closing soon" && open && daysLeft >= 0 && daysLeft <= 5) || (availability === "Saved" && savedIds.includes(drive.id)))
        && (jobType === "Any type" || drive.jobType === jobType)
        && (workMode === "Any location" || drive.workMode === workMode)
        && (!eligibleOnly || getEligibility(drive, student).length === 0);
    });
    if (sortBy === "Deadline") filtered.sort((a, b) => a.applicationDeadline.localeCompare(b.applicationDeadline));
    if (sortBy === "Package: high to low") filtered.sort((a, b) => (b.packageLPA ?? 0) - (a.packageLPA ?? 0));
    return filtered;
  }, [searchTerm, availability, jobType, workMode, eligibleOnly, savedIds, sortBy, driveList, student]);

  const openDrives = driveList.filter((drive) => (drive.status === "Open" || drive.status === "Closing Soon") && getDaysUntilDeadline(drive.applicationDeadline) >= 0).length;
  const eligibleDrives = driveList.filter((drive) => getEligibility(drive, student).length === 0).length;

  function toggleSaved(driveId: string) {
    setSavedIds((current) => current.includes(driveId) ? current.filter((id) => id !== driveId) : [...current, driveId]);
  }

  function resetFilters() {
    setSearchTerm(""); setAvailability("All drives"); setJobType("Any type"); setWorkMode("Any location"); setEligibleOnly(false); setSortBy("Recommended");
  }

  return (
    <div className="min-h-full">
      <StudentHeader title="Companies & opportunities" subtitle="Explore campus drives and find roles that fit your profile" />
      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-7">
        <section className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-7 text-white sm:px-8">
          <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-indigo-200"><Sparkles className="h-4 w-4" /> YOUR PLACEMENT SEASON</div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Find your next opportunity.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Search roles, check your eligibility, and keep the drives you care about close.</p>
            </div>
            <div className="grid grid-cols-3 gap-5 border-t border-white/10 pt-4 md:min-w-[350px] md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <div><p className="text-xl font-bold">{driveList.length}</p><p className="mt-1 text-[11px] text-slate-400">Listed drives</p></div>
              <div><p className="text-xl font-bold">{openDrives}</p><p className="mt-1 text-[11px] text-slate-400">Open today</p></div>
              <div><p className="text-xl font-bold">{eligibleDrives}</p><p className="mt-1 text-[11px] text-slate-400">Match your profile</p></div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Opportunity filters">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input aria-label="Search companies, roles, locations, or skills" type="search" placeholder="Search companies, roles, locations, or skills" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <select aria-label="Filter by job type" value={jobType} onChange={(event) => setJobType(event.target.value)} className="bg-transparent outline-none"><option>Any type</option><option>Full-time</option><option>Internship</option><option>Part-time</option><option>Contract</option></select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              <select aria-label="Filter by work mode" value={workMode} onChange={(event) => setWorkMode(event.target.value)} className="bg-transparent outline-none"><option>Any location</option><option>On-site</option><option>Hybrid</option><option>Remote</option></select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
              <ArrowDownWideNarrow className="h-4 w-4 text-slate-400" />
              <select aria-label="Sort opportunities" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)} className="bg-transparent outline-none"><option>Recommended</option><option>Deadline</option><option>Package: high to low</option></select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["All drives", "Open now", "Closing soon", "Saved"] as Availability[]).map((item) => (
              <button key={item} onClick={() => setAvailability(item)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${availability === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item}{item === "Saved" && savedIds.length > 0 ? ` (${savedIds.length})` : ""}</button>
            ))}
            <span className="mx-1 hidden h-5 border-l border-slate-200 sm:block" />
            <button aria-pressed={eligibleOnly} onClick={() => setEligibleOnly((value) => !value)} className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${eligibleOnly ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {eligibleOnly && <Check className="h-3.5 w-3.5" />} Show eligible for me
            </button>
            {filtersActive && <button onClick={resetFilters} className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"><X className="h-3.5 w-3.5" /> Clear filters</button>}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-base font-bold text-slate-900">Campus opportunities</h3><p className="mt-0.5 text-xs text-slate-500">{filteredDrives.length} {filteredDrives.length === 1 ? "drive" : "drives"} · Eligibility uses your sample profile</p></div>
          <Link href="/applications" className="hidden items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 sm:flex">My applications <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        {filteredDrives.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100"><Search className="h-5 w-5 text-slate-500" /></div>
            <h3 className="mt-4 font-semibold text-slate-900">No drives match those filters</h3>
            <p className="mt-1 text-sm text-slate-500">Try a different search or clear some filters.</p>
            <button onClick={resetFilters} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">Clear filters</button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredDrives.map((drive) => {
              const daysLeft = getDaysUntilDeadline(drive.applicationDeadline);
              const reasons = getEligibility(drive, student);
              const isSaved = savedIds.includes(drive.id);
              const isOpen = (drive.status === "Open" || drive.status === "Closing Soon") && daysLeft >= 0;
              return (
                <article key={drive.id} className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md sm:p-6">
                  <div className="flex items-start gap-3">
                    <CompanyLogo name={drive.companyName} logoColor={drive.companyLogoColor} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-slate-900">{drive.companyName}</h4><StatusBadge status={isOpen ? drive.status : "Closed"} size="sm" /></div>
                      <p className="mt-0.5 text-sm text-slate-600">{drive.role}</p>
                    </div>
                    <button aria-label={isSaved ? `Remove ${drive.companyName} from saved drives` : `Save ${drive.companyName}`} aria-pressed={isSaved} onClick={() => toggleSaved(drive.id)} className={`rounded-lg border p-2 transition ${isSaved ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"}`}><Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} /></button>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Compensation</p><p className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-950">{formatPackage(drive.packageLPA, drive.stipendMonthly)}</p></div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{drive.jobType}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{drive.location} · {drive.workMode}</span>
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{drive.openings} openings</span>
                    <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5 text-slate-400" />Min CGPA {drive.eligibility.minCGPA}</span>
                  </div>
                  <div className={`mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${reasons.length ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
                    {reasons.length ? <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <div><p className="font-semibold">{reasons.length ? "Eligibility needs attention" : "You meet the listed criteria"}</p>{reasons.length > 0 && <p className="mt-0.5 leading-5">{reasons.join(" · ")}</p>}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${daysLeft >= 0 && daysLeft <= 5 && isOpen ? "text-rose-600" : "text-slate-500"}`}><Clock3 className="h-3.5 w-3.5" />{isOpen ? `Deadline ${formatDate(drive.applicationDeadline)}${daysLeft >= 0 ? ` · ${daysLeft}d left` : ""}` : `Closed · ${formatDate(drive.applicationDeadline)}`}</div>
                    <Link href={`/companies/${drive.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700">View drive <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <p className="pb-2 text-center text-[11px] text-slate-400">Eligibility is a guide based on the profile shown in this demo. Confirm final criteria with your placement team.</p>
      </div>
      {savedLoaded && <span className="sr-only" aria-live="polite">{savedIds.length} saved drives</span>}
    </div>
  );
}
