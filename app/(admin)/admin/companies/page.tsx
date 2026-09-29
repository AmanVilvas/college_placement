"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { AddCompanyDialog } from "@/components/admin/AddCompanyDialog";
import { companies as initialCompanies, drives } from "@/lib/data/companies";
import { Company } from "@/lib/types";
import { Building2, Globe, ExternalLink, Briefcase, Plus, Search, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

export default function AdminCompaniesPage() {
  const [companyList, setCompanyList] = useLocalStorageState<Company[]>("placement-helper:companies", initialCompanies);
  const [driveList] = useLocalStorageState("placement-helper:drives", drives);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filtered = companyList.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = (newComp: Partial<Company>) => {
    setCompanyList((current) => [newComp as Company, ...current]);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to archive this company?")) {
      setCompanyList((current) => current.filter((c) => c.id !== id));
    }
  };

  return (
    <div>
      <AdminHeader
        title="Recruiting Companies"
        subtitle="Manage partner corporate accounts and campus hiring schedules"
        action={{
          label: "Add Company",
          onClick: () => setIsAddOpen(true),
        }}
      />

      <div className="p-6 space-y-6">
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

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{companyList.length}</span> Total Companies
            <span>•</span>
            <span className="font-semibold text-slate-800">{driveList.length}</span> Total Drives
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((company) => {
            const companyDrives = driveList.filter((d) => d.companyId === company.id);
            const activeDrives = companyDrives.filter((d) => d.status === "Open" || d.status === "Closing Soon");

            return (
              <div
                key={company.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5 flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={company.name} logoColor={company.logoColor} size="lg" />
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{company.name}</h3>
                        <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5">
                          {company.industry}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDelete(company.id, e)}
                      title="Archive Company"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                    {company.description}
                  </p>

                  <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Total Drives Hosted:</span>
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
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" /> Website <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>

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
      </div>

      <AddCompanyDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
