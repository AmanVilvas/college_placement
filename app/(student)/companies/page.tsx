"use client";

import { useState, useMemo } from "react";
import { StudentHeader } from "@/components/student/StudentHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { ConfirmParticipationDialog } from "@/components/shared/ConfirmParticipationDialog";
import type { ConfirmationFormData } from "@/components/shared/ConfirmParticipationDialog";
import { useApiResource } from "@/lib/useApi";
import { apiMutate } from "@/lib/useApi";
import type { Drive } from "@/lib/types";
import {
  Building2, ExternalLink, Search, RefreshCw, Loader2,
  MapPin, DollarSign, GraduationCap, Briefcase, Phone, User,
  ChevronDown, ChevronUp, Sparkles, X, CheckCircle2,
} from "lucide-react";

interface ApiCompanyMeta {
  logoColor?: string;
  position?: string;
  qualification?: string;
  stipend?: string;
  ctc?: string;
  location?: string;
  spoc?: string;
  trainer_details?: string;
  extra_fields?: Record<string, string>;
}

interface ApiCompany {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  logo_url?: string;
  archived: boolean;
  metadata?: ApiCompanyMeta;
  created_at?: string;
}

interface ApiDrive {
  id: string;
  company_id: string;
  role_title: string;
  job_type?: string;
  package_lpa?: number | string | null;
  stipend_monthly?: number | string | null;
  location?: string | null;
  work_mode?: string | null;
  openings?: number;
  application_deadline?: string | null;
  drive_date?: string | null;
  status?: string;
  official_apply_link?: string | null;
  description?: string | null;
  eligibility?: Record<string, unknown>;
  required_skills?: string[];
  selection_process?: string[];
  companies?: { name?: string; logo_url?: string; metadata?: { logoColor?: string } };
}

interface ApiApplication {
  status: string;
  drives?: { company_id?: string };
}

function asDrive(company: ApiCompany, row?: ApiDrive): Drive {
  const metadata = company.metadata ?? {};
  const role = row?.role_title ?? metadata.position?.split(/\r?\n/).map((line) => line.replace(/^\s*[-•*]\s*/, "").trim()).find(Boolean) ?? `${company.name} Placement Opportunity`;
  return {
    id: row?.id ?? company.id,
    companyId: company.id,
    companyName: company.name,
    companyLogoUrl: company.logo_url,
    companyLogoColor: metadata.logoColor ?? "#6366f1",
    role,
    jobType: "Full-time",
    packageLPA: row?.package_lpa == null ? undefined : Number(row.package_lpa),
    stipendMonthly: row?.stipend_monthly == null ? undefined : Number(row.stipend_monthly),
    location: row?.location ?? metadata.location ?? "Not specified",
    workMode: "On-site",
    openings: row?.openings ?? 1,
    applicationDeadline: row?.application_deadline ?? "",
    driveDate: row?.drive_date ?? "",
    status: row?.status === "Closed" || row?.status === "Completed" ? row.status : "Open",
    officialApplyLink: row?.official_apply_link ?? company.website ?? "",
    jobDescription: row?.description ?? company.description ?? "Placement opportunity shared by the placement office.",
    eligibility: {
      branches: Array.isArray(row?.eligibility?.branches) ? row.eligibility.branches as Drive["eligibility"]["branches"] : [],
      minCGPA: Number(row?.eligibility?.minCGPA ?? row?.eligibility?.min_cgpa ?? 0),
      maxBacklogs: Number(row?.eligibility?.maxBacklogs ?? row?.eligibility?.max_backlogs ?? 99),
    },
    requiredSkills: row?.required_skills ?? [],
    selectionProcess: row?.selection_process ?? [],
    importantInstructions: [],
    createdAt: row?.id ? new Date().toISOString() : company.created_at ?? new Date().toISOString(),
  };
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center mt-0.5">
        <Icon className="w-3.5 h-3.5 text-indigo-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-line">{value}</p>
      </div>
    </div>
  );
}

function CompanyCard({
  company, drive, confirmed, isExpanded, onToggle, onConfirmed,
}: { company: ApiCompany; drive?: ApiDrive; confirmed: boolean; isExpanded: boolean; onToggle: () => void; onConfirmed: () => void }) {
  const meta = company.metadata ?? {};
  const logoColor = meta.logoColor ?? "#6366f1";
  const [showConfirm, setShowConfirm] = useState(false);
  const formDrive = asDrive(company, drive);
  const hasDetails = !!(meta.position || meta.qualification || meta.stipend ||
    meta.ctc || meta.location || meta.spoc || meta.trainer_details);
  const extraKeys = meta.extra_fields ? Object.keys(meta.extra_fields) : [];

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
      style={{ borderTop: `3px solid ${logoColor}` }}
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <CompanyLogo name={company.name} logoColor={logoColor} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-sm leading-tight">{company.name}</h3>
            {company.industry && (
              <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1">
                {company.industry}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {meta.ctc && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-1 rounded-full border border-emerald-100">
              <DollarSign className="w-2.5 h-2.5" />{meta.ctc}
            </span>
          )}
          {meta.location && (
            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-[10px] font-semibold px-2 py-1 rounded-full border border-sky-100">
              <MapPin className="w-2.5 h-2.5" />{meta.location}
            </span>
          )}
          {meta.qualification && (
            <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] font-semibold px-2 py-1 rounded-full border border-violet-100">
              <GraduationCap className="w-2.5 h-2.5" />{meta.qualification}
            </span>
          )}
        </div>

        {meta.position && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 mb-3">
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Position(s)</p>
            <p className="text-xs text-indigo-900 font-medium whitespace-pre-line leading-relaxed">{meta.position}</p>
          </div>
        )}

        {company.description && (
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{company.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 pb-4">
        {company.website ? (
          <a href={company.website} target="_blank" rel="noopener noreferrer"
            className="min-h-10 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 flex items-center justify-center gap-1.5 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Official Site
          </a>
        ) : (
          <span className="min-h-10 rounded-xl border border-slate-100 px-2 py-2 text-xs text-slate-400 flex items-center justify-center">No official site</span>
        )}
        {confirmed ? (
          <span className="min-h-10 rounded-xl bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Applied
          </span>
        ) : (
          <button onClick={() => setShowConfirm(true)}
            className="min-h-10 rounded-xl bg-indigo-600 px-2 py-2 text-xs font-semibold text-white hover:bg-indigo-700 flex items-center justify-center gap-1.5 transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Application
          </button>
        )}
      </div>

      {(hasDetails || extraKeys.length > 0) && (
        <div className="border-t border-slate-100">
          <button onClick={onToggle}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors">
            <span>{isExpanded ? "Hide details" : "View full details"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {isExpanded && (
            <div className="px-5 pb-5 space-y-0.5">
              <InfoRow icon={Briefcase} label="Position(s)" value={meta.position} />
              <InfoRow icon={GraduationCap} label="Qualification" value={meta.qualification} />
              <InfoRow icon={MapPin} label="Location" value={meta.location} />
              <InfoRow icon={DollarSign} label="Stipend" value={meta.stipend} />
              <InfoRow icon={DollarSign} label="CTC / Package" value={meta.ctc} />
              <InfoRow icon={Phone} label="Operations SPOC" value={meta.spoc} />
              <InfoRow icon={User} label="Trainer Details" value={meta.trainer_details} />
              {extraKeys.map((key) => (
                <InfoRow key={key} icon={Building2} label={key} value={meta.extra_fields?.[key]} />
              ))}
            </div>
          )}
        </div>
      )}
      <ConfirmParticipationDialog
        drive={formDrive}
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        initialData={{ confirmed: false }}
        onConfirm={async (data: ConfirmationFormData) => {
          await apiMutate("POST", "applications", { company_id: company.id, confirmation_data: data });
          onConfirmed();
          return true;
        }}
      />
    </div>
  );
}

const INDUSTRIES = [
  "All industries",
  "Technology / SaaS", "Finance / Fintech / Banking", "IT Services & Solutions",
  "Core Engineering", "Data & Analytics", "Consulting / Advisory",
  "E-Commerce / Cloud", "Healthcare / Pharma", "Automobile / Manufacturing",
  "FMCG / Retail", "Telecom", "Media & Entertainment", "Government / PSU", "Other",
];

export default function StudentCompaniesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("All industries");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: apiCompanies, loading, error, refetch } = useApiResource<ApiCompany[]>(
    "companies",
    { archived: "eq.false", limit: "500" },
    { fallback: [] }
  );
  const { data: apiDrives } = useApiResource<ApiDrive[]>("drives", {
    select: "id,company_id,role_title,job_type,package_lpa,stipend_monthly,location,work_mode,openings,application_deadline,drive_date,status,official_apply_link,description,eligibility,required_skills,selection_process",
    limit: "1000",
  }, { fallback: [] });
  const { data: applications, refetch: refetchApplications } = useApiResource<ApiApplication[]>("applications", {
    select: "id,status,drives(company_id)",
    limit: "1000",
  }, { fallback: [] });
  const driveByCompany = new Map((apiDrives ?? []).map((drive) => [drive.company_id, drive]));
  const confirmedCompanyIds = new Set((applications ?? [])
    .filter((application) => application.status === "Confirmed" || application.status === "Applied")
    .map((application) => application.drives?.company_id)
    .filter((id): id is string => Boolean(id)));

  const companies = useMemo(() => {
    const list = apiCompanies ?? [];
    return list.filter((c) => {
      const q = searchTerm.trim().toLowerCase();
      const searchable = [c.name, c.industry ?? "", c.metadata?.position ?? "", c.metadata?.location ?? ""]
        .join(" ").toLowerCase();
      const matchSearch = !q || searchable.includes(q);
      const matchIndustry = selectedIndustry === "All industries" || c.industry === selectedIndustry;
      return matchSearch && matchIndustry;
    });
  }, [apiCompanies, searchTerm, selectedIndustry]);

  const totalCount = (apiCompanies ?? []).length;
  const filtersActive = !!(searchTerm || selectedIndustry !== "All industries");

  return (
    <div className="min-h-full">
      <StudentHeader
        title="Recruiting Companies"
        subtitle="All companies recruiting from campus this placement season"
      />

      <div className="max-w-7xl mx-auto p-5 sm:p-7 space-y-6">

        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white">
          <div className="absolute -right-8 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -left-8 -bottom-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 mb-3">
                <Sparkles className="w-4 h-4" /> CAMPUS PLACEMENT 2026
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {loading ? "Loading…" : `${totalCount} Recruiting Partner${totalCount !== 1 ? "s" : ""}`}
              </h2>
              <p className="mt-1.5 text-sm text-slate-400 max-w-md">
                Explore every company coming to campus, their open positions, packages, and contact details.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-semibold">Live Database</span>
              <button onClick={refetch} disabled={loading}
                className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input type="search" placeholder="Search companies, positions, locations…"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white focus:border-indigo-300 transition-all" />
            </div>
            <select value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)}
              className="sm:w-56 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all">
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            {filtersActive && (
              <button onClick={() => { setSearchTerm(""); setSelectedIndustry("All industries"); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
          {filtersActive && (
            <p className="mt-2.5 text-xs text-slate-500">
              Showing {companies.length} of {totalCount} companies
            </p>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 flex items-center gap-3">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={refetch} className="ml-auto text-xs font-semibold hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading companies…
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">
              {totalCount === 0 ? "No companies added yet" : "No companies match your search"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {totalCount === 0 ? "Ask your placement office to add recruiting companies." : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                drive={driveByCompany.get(company.id)}
                confirmed={confirmedCompanyIds.has(company.id)}
                isExpanded={expandedId === company.id}
                onToggle={() => setExpandedId(expandedId === company.id ? null : company.id)}
                onConfirmed={refetchApplications}
              />
            ))}
          </div>
        )}

        <p className="pb-2 text-center text-[11px] text-slate-400">
          Company details are updated in real-time by your placement office.
        </p>
      </div>
    </div>
  );
}
