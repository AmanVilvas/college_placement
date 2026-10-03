"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { useApiResource } from "@/lib/useApi";
import { formatPackage } from "@/lib/utils";
import { TrendingUp, Award, Building2, Zap } from "lucide-react";

interface ApiStudent { id: string; department?: string }
interface ApiDrive {
  id: string; company_id: string; role_title: string; package_lpa?: number;
  stipend_monthly?: number; companies?: { name?: string };
}
interface ApiApplication { id: string; student_id: string; drive_id: string; status: string }

const selectedStatuses = new Set(["Selected", "Placed", "Offer Received"]);
const stages = ["Applied", "Confirmed", "Shortlisted", "Assessment", "Interview", "Selected", "Placed"];

export default function AdminAnalyticsPage() {
  const { data: students, loading: studentsLoading } = useApiResource<ApiStudent[]>(
    "student_profiles", { select: "id,department", limit: "5000" }, { fallback: [] }
  );
  const { data: drives, loading: drivesLoading } = useApiResource<ApiDrive[]>(
    "drives", { select: "id,company_id,role_title,package_lpa,stipend_monthly,companies(name)", limit: "2000" }, { fallback: [] }
  );
  const { data: applications, loading: applicationsLoading } = useApiResource<ApiApplication[]>(
    "applications", { select: "id,student_id,drive_id,status", limit: "5000" }, { fallback: [] }
  );

  const studentRows = students ?? [];
  const driveRows = drives ?? [];
  const applicationRows = applications ?? [];
  const selectedApps = applicationRows.filter((application) => selectedStatuses.has(application.status));
  const placedStudentIds = new Set(selectedApps.map((application) => application.student_id));
  const placementRate = studentRows.length ? Math.round(placedStudentIds.size / studentRows.length * 100) : 0;
  const placedPackages = selectedApps.flatMap((application) => {
    const drive = driveRows.find((item) => item.id === application.drive_id);
    return drive?.package_lpa == null ? [] : [Number(drive.package_lpa)];
  });
  const highestPackage = placedPackages.length ? Math.max(...placedPackages) : 0;
  const averagePackage = placedPackages.length
    ? placedPackages.reduce((total, value) => total + value, 0) / placedPackages.length
    : 0;
  const departments = [...new Set(studentRows.map((student) => student.department).filter(Boolean))].sort();
  const branchData = departments.map((department) => {
    const departmentStudents = studentRows.filter((student) => student.department === department);
    const placed = departmentStudents.filter((student) => placedStudentIds.has(student.id)).length;
    return { department, total: departmentStudents.length, placed, rate: departmentStudents.length ? Math.round(placed / departmentStudents.length * 100) : 0 };
  });
  const companyData = [...new Map(driveRows.map((drive) => [drive.company_id, drive])).values()].map((drive) => {
    const companyDriveIds = new Set(driveRows.filter((item) => item.company_id === drive.company_id).map((item) => item.id));
    const companyApps = applicationRows.filter((application) => companyDriveIds.has(application.drive_id));
    return {
      id: drive.company_id,
      name: drive.companies?.name || "Company",
      package: formatPackage(drive.package_lpa, drive.stipend_monthly),
      applicants: companyApps.length,
      selections: companyApps.filter((application) => selectedStatuses.has(application.status)).length,
    };
  });
  const loading = studentsLoading || drivesLoading || applicationsLoading;

  return <div>
    <AdminHeader title="Placement Analytics" subtitle="Placement and recruiting metrics from current campus records" />
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Placement Rate" value={loading ? "—" : `${placementRate}%`} subtitle={`${placedStudentIds.size} of ${studentRows.length} students`} icon={TrendingUp} color="emerald" />
        <StatsCard title="Highest CTC Offer" value={loading || !highestPackage ? "—" : `₹${highestPackage.toFixed(1)} LPA`} subtitle="From selected or placed applications" icon={Award} color="indigo" />
        <StatsCard title="Average CTC Package" value={loading || !averagePackage ? "—" : `₹${averagePackage.toFixed(1)} LPA`} subtitle="Recorded full-time offers" icon={Zap} color="purple" />
        <StatsCard title="Offers Recorded" value={loading ? "—" : selectedApps.length} subtitle="Selected, placed, or offer received" icon={Building2} color="cyan" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
          <div><h2 className="font-bold text-slate-900">Placement by department</h2><p className="text-xs text-slate-500">Based on current student and application records</p></div>
          {branchData.length ? branchData.map((item) => <div key={item.department} className="space-y-1.5">
            <div className="flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-800">{item.department}</span><span className="text-slate-500">{item.placed} / {item.total} · {item.rate}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${item.rate}%` }} /></div>
          </div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No student records available yet.</p>}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
          <div><h2 className="font-bold text-slate-900">Company activity</h2><p className="text-xs text-slate-500">Companies with drives and application records</p></div>
          {companyData.length ? companyData.map((company) => <div key={company.id} className="flex items-center justify-between gap-3 border-b border-slate-50 py-2.5 text-xs">
            <div><p className="font-bold text-sm text-slate-900">{company.name}</p><p className="text-slate-400">{company.applicants} applicants</p></div>
            <div className="text-right"><p className="font-semibold text-indigo-600">{company.package}</p><p className="text-emerald-700">{company.selections} selected</p></div>
          </div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No placement drives have been added yet.</p>}
        </section>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
        <div><h2 className="font-bold text-slate-900">Application stages</h2><p className="text-xs text-slate-500">Counts are snapshots of current application statuses.</p></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {stages.map((stage) => {
            const count = applicationRows.filter((application) => application.status === stage).length;
            return <div key={stage} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><span className="text-[11px] font-semibold text-slate-600">{stage}</span><p className="mt-1 text-xl font-bold text-slate-900">{loading ? "—" : count}</p></div>;
          })}
        </div>
      </section>
    </div>
  </div>;
}
