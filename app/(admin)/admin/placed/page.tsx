"use client";

import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useApiResource } from "@/lib/useApi";
import { formatPackage } from "@/lib/utils";
import { Award, Search, Trophy } from "lucide-react";

interface StudentRow { id: string; full_name?: string; roll_number: string; department?: string; section?: string; cgpa?: number }
interface ApplicationRow { id: string; student_id: string; drive_id: string; status: string }
interface DriveRow { id: string; company_id: string; role_title: string; package_lpa?: number; stipend_monthly?: number; companies?: { name?: string } }

export default function AdminPlacedStudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: students, loading: studentsLoading } = useApiResource<StudentRow[]>("student_profiles", {
    select: "id,full_name,roll_number,department,section,cgpa", limit: "5000",
  }, { fallback: [] });
  const { data: applications, loading: applicationsLoading } = useApiResource<ApplicationRow[]>("applications", {
    select: "id,student_id,drive_id,status", limit: "5000",
  }, { fallback: [] });
  const { data: drives, loading: drivesLoading } = useApiResource<DriveRow[]>("drives", {
    select: "id,company_id,role_title,package_lpa,stipend_monthly,companies(name)", limit: "2000",
  }, { fallback: [] });
  const loading = studentsLoading || applicationsLoading || drivesLoading;
  const placed = useMemo(() => {
    const studentById = new Map((students ?? []).map((student) => [student.id, student]));
    const driveById = new Map((drives ?? []).map((drive) => [drive.id, drive]));
    const placedByStudent = new Map<string, { student: StudentRow; drive: DriveRow }>();
    for (const application of applications ?? []) {
      if (!new Set(["Selected", "Placed", "Offer Received"]).has(application.status)) continue;
      const student = studentById.get(application.student_id);
      const drive = driveById.get(application.drive_id);
      if (student && drive && !placedByStudent.has(student.id)) placedByStudent.set(student.id, { student, drive });
    }
    return [...placedByStudent.values()];
  }, [applications, drives, students]);
  const filtered = placed.filter(({ student, drive }) =>
    `${student.full_name ?? ""} ${student.roll_number} ${student.department ?? ""} ${drive.companies?.name ?? ""}`
      .toLowerCase().includes(searchTerm.toLowerCase())
  );

  return <div>
    <AdminHeader title="Placed Students" subtitle="Students with a selected or placed application record" />
    <div className="space-y-6 p-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 p-6 text-white sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2 text-emerald-100"><Trophy className="h-5 w-5"/><span className="text-xs font-semibold uppercase tracking-wider">Current database records</span></div><h2 className="mt-2 text-2xl font-bold">{loading ? "—" : placed.length} students selected or placed</h2><p className="mt-1 text-xs text-emerald-100">Placement outcomes are calculated from application statuses.</p></div>
        <div className="rounded-xl bg-white/10 px-4 py-3 text-center"><span className="block text-[10px] uppercase text-emerald-100">Students on roster</span><strong className="text-xl">{loading ? "—" : students?.length ?? 0}</strong></div>
      </section>

      <label className="relative block w-full sm:w-96"><Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400"/><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search name, roll, department, or company" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm"/></label>

      {loading ? <DataSkeleton label="Loading placement records…" variant="cards" count={6} /> : filtered.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(({ student, drive }) => <article key={student.id} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div><h3 className="font-bold text-slate-900">{student.full_name || "Name not provided"}</h3><p className="text-xs text-slate-500">{student.roll_number} · {student.department || "Department not provided"}{student.section ? ` · Section ${student.section}` : ""}</p></div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs"><p className="text-slate-500">Company and role</p><p className="mt-1 font-semibold text-slate-900">{drive.companies?.name || "Company"} · {drive.role_title}</p><p className="mt-1 text-emerald-700">{formatPackage(drive.package_lpa, drive.stipend_monthly)}</p></div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Award className="h-4 w-4"/>Selected / placed in the application tracker</p>
      </article>)}</div> : <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">No selected or placed application records yet.</div>}
    </div>
  </div>;
}
