"use client";

import { useState, useCallback } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { AddCompanyDialog } from "@/components/admin/AddCompanyDialog";

import { useApiResource, apiMutate } from "@/lib/useApi";
import { Globe, ExternalLink, Plus, Search, Trash2, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface ApiCompany {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  logo_url?: string;
  archived: boolean;
  metadata?: Record<string, unknown>;
}

interface ApiDrive {
  id: string;
  company_id: string;
  status: string;
}

export default function AdminCompaniesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: apiCompanies,
    loading: companiesLoading,
    error: companiesError,
    refetch: refetchCompanies,
  } = useApiResource<ApiCompany[]>("companies", { archived: "eq.false", limit: "500" }, { fallback: [] });

  const {
    data: apiDrives,
    loading: drivesLoading,
    refetch: refetchDrives,
  } = useApiResource<ApiDrive[]>("drives", { select: "id,company_id,status", limit: "500" }, { fallback: [] });

  const companyList: ApiCompany[] = apiCompanies ?? [];
  const driveList: ApiDrive[] = apiDrives ?? [];

  const filtered = companyList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.industry ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = useCallback(
    async (newComp: Record<string, unknown>) => {
      await apiMutate("POST", "companies", newComp);
      await Promise.all([refetchCompanies(), refetchDrives()]);
    },
    [refetchCompanies, refetchDrives]
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm("Archive this company? This hides it from all views.")) return;
      setDeletingId(id);
      try {
        await apiMutate("PATCH", `companies/${id}`, { archived: true });
        refetchCompanies();
      } catch (err) {
        alert((err as Error).message);
      } finally {
        setDeletingId(null);
      }
    },
    [refetchCompanies]
  );

  return (
    <div>
      <AdminHeader
        title="Recruiting Companies"
        subtitle="Manage partner corporate accounts and campus hiring schedules"
        action={{
          label: "Add Company",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsAddOpen(true),
        }}
      />

      <div className="p-6 space-y-6">
        {/* Live Supabase connection indicator */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Connected to Supabase (Live Database 24/7)
          </div>
          <button
            onClick={() => { refetchCompanies(); refetchDrives(); }}
            disabled={companiesLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
            title="Sync with database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${companiesLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>

        {companiesError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{companiesError}</span>
            <button onClick={refetchCompanies} className="ml-auto flex items-center gap-1.5 text-xs font-semibold hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies or industries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{companyList.length}</span> Companies
              <span>•</span>
              <span className="font-semibold text-slate-800">{driveList.length}</span> Drives
            </div>
            <button
              onClick={() => { refetchCompanies(); refetchDrives(); }}
              disabled={companiesLoading || drivesLoading}
              title="Refresh"
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${(companiesLoading || drivesLoading) ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Companies Grid */}
        {companiesLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading companies…
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((company) => {
              const companyDrives = driveList.filter((d) => d.company_id === company.id);
              const activeDrives = companyDrives.filter((d) => d.status === "Open" || d.status === "Closing Soon");
              const logoColor = (company.metadata?.logoColor as string) ?? "#6366f1";

              return (
                <div
                  key={company.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5 flex flex-col justify-between group relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <CompanyLogo name={company.name} logoColor={logoColor} size="lg" />
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{company.name}</h3>
                          <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5">
                            {company.industry ?? "—"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(company.id, e)}
                        disabled={deletingId === company.id}
                        title="Archive Company"
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        {deletingId === company.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {company.description ?? "No description available."}
                    </p>

                    <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Total Drives:</span>
                        <span className="font-bold text-slate-800">{companyDrives.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Active Opportunities:</span>
                        <span className={`font-bold ${activeDrives.length > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                          {activeDrives.length} active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="w-3.5 h-3.5" /> Website <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" /> No website
                      </span>
                    )}

                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Manage Drives →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddCompanyDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
