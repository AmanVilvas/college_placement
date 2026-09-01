"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { students, getStudentStats } from "@/lib/data/students";
import { drives, companies } from "@/lib/data/companies";
import { applications } from "@/lib/data/applications";
import {
  TrendingUp, Award, Building2, Users, PieChart, BarChart3,
  CheckCircle2, ArrowUpRight, ShieldCheck, Zap
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const stats = getStudentStats();
  const placementRate = Math.round((stats.placed / stats.total) * 100);

  // Branch-wise breakdown
  const branches = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA"];
  const branchData = branches.map((b) => {
    const branchStudents = students.filter((s) => s.branch === b);
    const placedInBranch = branchStudents.filter((s) => s.placementStatus === "Placed").length;
    const rate = branchStudents.length > 0 ? Math.round((placedInBranch / branchStudents.length) * 100) : 0;
    return { branch: b, total: branchStudents.length, placed: placedInBranch, rate };
  });

  // Company-wise selections
  const companyData = [
    { name: "Microsoft", package: "45.0 LPA", selections: 2, applications: 8 },
    { name: "Amazon", package: "38.0 LPA", selections: 1, applications: 12 },
    { name: "Deloitte", package: "9.75 LPA", selections: 3, applications: 20 },
    { name: "TCS", package: "3.6 LPA", selections: 2, applications: 15 },
    { name: "Google (Intern)", package: "1.5L /mo", selections: 1, applications: 6 },
    { name: "Accenture", package: "4.5 LPA", selections: 1, applications: 14 },
  ];

  return (
    <div>
      <AdminHeader
        title="Placement Analytics"
        subtitle="Key recruitment performance indicators, branch metrics, and salary distribution"
      />

      <div className="p-6 space-y-6">
        {/* Top KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Placement Rate"
            value={`${placementRate}%`}
            subtitle="Overall 2026 Batch"
            icon={TrendingUp}
            color="emerald"
            trend={{ value: 14, label: "vs 2025" }}
          />
          <StatsCard
            title="Highest CTC Offer"
            value="₹45.0 LPA"
            subtitle="Microsoft IDC"
            icon={Award}
            color="indigo"
          />
          <StatsCard
            title="Average CTC Package"
            value="₹14.2 LPA"
            subtitle="Across engineering"
            icon={Zap}
            color="purple"
            trend={{ value: 8, label: "y-o-y" }}
          />
          <StatsCard
            title="Total Offers Rolled"
            value={stats.placed + 2}
            subtitle="Including PPOs"
            icon={Building2}
            color="cyan"
          />
        </div>

        {/* Charts & Analytics Grids */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Branch-wise Placement Percentage */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Branch-wise Placement Rate</h3>
                <p className="text-xs text-slate-500">Placement conversion across engineering streams</p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Engineering & MCA
              </span>
            </div>

            <div className="space-y-3.5 pt-2">
              {branchData.map((item) => (
                <div key={item.branch} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.branch} Department</span>
                    <span className="text-slate-500">
                      <strong className="text-slate-900">{item.placed}</strong> / {item.total} Placed (<strong>{item.rate}%</strong>)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company-wise Selections & Package */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Company-wise Selections</h3>
                <p className="text-xs text-slate-500">Top recruiting organizations & offer packages</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                Season 2026
              </span>
            </div>

            <div className="divide-y divide-slate-50 pt-1">
              {companyData.map((c) => (
                <div key={c.name} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                    <p className="text-[11px] text-slate-400">{c.applications} applicants registered</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600 text-sm">{c.package}</p>
                    <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                      {c.selections} Selected
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Funnel & Conversion Metrics */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Campus Recruitment Funnel Analysis</h3>
          <p className="text-xs text-slate-500">Tracking friction and drop-off across all selection rounds</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {[
              { label: "1. Eligible Candidates", count: stats.total, percent: "100%", color: "bg-blue-50 text-blue-800" },
              { label: "2. Form Confirmed", count: 16, percent: "80%", color: "bg-teal-50 text-teal-800" },
              { label: "3. Shortlisted / Test", count: 11, percent: "55%", color: "bg-amber-50 text-amber-800" },
              { label: "4. Interview Rounds", count: 7, percent: "35%", color: "bg-purple-50 text-purple-800" },
              { label: "5. Final Offers", count: stats.placed, percent: `${placementRate}%`, color: "bg-emerald-50 text-emerald-800 font-bold" },
            ].map((stage, i) => (
              <div key={stage.label} className={`p-4 rounded-xl border border-slate-100 ${stage.color} space-y-1`}>
                <span className="text-[11px] font-semibold opacity-80 block">{stage.label}</span>
                <p className="text-xl font-bold">{stage.count}</p>
                <span className="text-[10px] opacity-70 block">{stage.percent} conversion</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
