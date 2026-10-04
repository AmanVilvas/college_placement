"use client";

import { useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AICareerPanel } from "@/components/shared/AICareerPanel";
import { AssessmentManager } from "@/components/admin/AssessmentManager";
import { apiMutate, importStudents as importStudentRows, useApiResource } from "@/lib/useApi";
import { parseStudentFile } from "@/lib/parseStudentFile";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { APPLICATION_JOURNEY, formatDate } from "@/lib/utils";
import type { Application, ApplicationStatus, Branch, Company, Drive, Student } from "@/lib/types";
import {
  Activity, Building2, CalendarDays, CheckCircle2, ClipboardCheck, Download,
  FileSpreadsheet, Mail, Plus, Search, ShieldCheck, SlidersHorizontal, Users,
} from "lucide-react";

const panels = ["Command center", "Candidate ATS", "Employer CRM", "Policies & eligibility", "Interviews & drive day", "Assessments & offers", "Drive analyzer", "Reports & data", "Communications & audit", "Employer discovery", "TPO insight assistant", "AI copilot"] as const;
type Panel = (typeof panels)[number];
type Contact = { id: string; company: string; companyId: string; name: string; email: string; nextFollowUp: string; notes: string[] };
type Interview = { id: string; candidate: string; company: string; round: string; date: string; time: string; room: string };
type Assessment = { id: string; title: string; type: string; duration: number; questions: number; status: "Draft" | "Published" };
type Offer = { id: string; student: string; company: string; role: string; packageLPA: number; status: "Draft" | "Released" | "Viewed" | "Accepted" | "Rejected" | "Joined"; deadline: string };
type OpsData = {
  policies: { maxAppsPerDay: number; minCGPA: number; noActiveBacklogs: boolean; blockAfterPlacement: boolean; dreamThresholdLPA: number };
};
const initialOps: OpsData = {
  policies: { maxAppsPerDay: 3, minCGPA: 6, noActiveBacklogs: true, blockAfterPlacement: true, dreamThresholdLPA: 15 },
};

interface OperationsApiApplication {
  id: string; student_id: string; drive_id: string; status: string; confirmation_data?: Application["confirmationData"];
  applied_at?: string; updated_at?: string;
  student_profiles?: { full_name?: string; roll_number?: string; department?: string; section?: string };
  drives?: { role_title?: string; company_id?: string; companies?: { name?: string } };
}
interface OperationsApiDrive {
  id: string; company_id: string; role_title: string; job_type: string; package_lpa?: number; stipend_monthly?: number;
  location?: string; work_mode?: string; openings: number; application_deadline?: string; drive_date?: string; status: string;
  official_apply_link?: string; description?: string; eligibility?: { branches?: string[]; minCGPA?: number; maxBacklogs?: number; tenthMin?: number; twelfthMin?: number };
  required_skills?: string[]; selection_process?: string[]; companies?: { name?: string; logo_url?: string; metadata?: { logoColor?: string } };
}
interface OperationsApiStudent {
  id: string; roll_number: string; full_name?: string; email?: string; phone?: string; department?: string; section?: string;
  cgpa?: number; tenth_percent?: number; twelfth_percent?: number; backlogs?: number; skills?: string[];
}
interface OperationsApiCompany { id: string; name: string; website?: string; industry?: string; description?: string; metadata?: { logoColor?: string }; }
interface OperationsApiInterview {
  id: string; application_id: string; round?: string; starts_at: string; ends_at: string; location?: string | null; status: string;
  student_name?: string; roll_number?: string; role_title?: string; company_name?: string;
}
interface OperationsApiContact { id: string; company_id: string; company_name?: string; name: string; email?: string; next_follow_up?: string | null; interaction_notes?: string | null; }
interface OperationsApiCheckin { application_id: string; checked_in: boolean; checked_in_at?: string | null; }
interface OperationsApiOffer { id: string; application_id: string; status: string; package_lpa?: number | null; details?: { deadline?: string | null }; student_name?: string; company_name?: string; role_title?: string; }
interface OperationsApiPolicy { id: string; rules: OpsData["policies"]; active: boolean; }
interface OperationsApiAudit { id: string; action: string; at: string; }

function operationsDrive(row: OperationsApiDrive): Drive {
  return {
    id: row.id, companyId: row.company_id, companyName: row.companies?.name || "", companyLogoUrl: row.companies?.logo_url,
    companyLogoColor: row.companies?.metadata?.logoColor || "#b91c1c", role: row.role_title, jobType: row.job_type as Drive["jobType"],
    packageLPA: row.package_lpa, stipendMonthly: row.stipend_monthly, location: row.location || "", workMode: (row.work_mode || "On-site") as Drive["workMode"],
    openings: row.openings, applicationDeadline: row.application_deadline || "", driveDate: row.drive_date || "", status: row.status as Drive["status"],
    officialApplyLink: row.official_apply_link || "", jobDescription: row.description || "",
    eligibility: { branches: (row.eligibility?.branches || []) as Branch[], minCGPA: row.eligibility?.minCGPA || 0,
      maxBacklogs: row.eligibility?.maxBacklogs ?? 99, tenthMin: row.eligibility?.tenthMin, twelfthMin: row.eligibility?.twelfthMin },
    requiredSkills: row.required_skills || [], selectionProcess: row.selection_process || [], importantInstructions: [], createdAt: "",
  };
}

function csvDownload(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function AdminOperationsPage() {
  const [panel, setPanel] = useState<Panel>("Command center");
  const [policyOverrides, setPolicyOverrides] = useState<Partial<OpsData["policies"]>>({});
  const { data: applicationRows, refetch: refetchApplications } = useApiResource<OperationsApiApplication[]>("applications", {
    select: "id,student_id,drive_id,status,confirmation_data,applied_at,updated_at,student_profiles(full_name,roll_number,department,section),drives(role_title,company_id,companies(name))", limit: "1000",
  }, { fallback: [] });
  const { data: driveRows } = useApiResource<OperationsApiDrive[]>("drives", {
    select: "id,company_id,role_title,job_type,package_lpa,stipend_monthly,location,work_mode,openings,application_deadline,drive_date,status,official_apply_link,description,eligibility,required_skills,selection_process,companies(name,logo_url,metadata)", limit: "1000",
  }, { fallback: [] });
  const { data: studentRows, refetch: refetchStudents } = useApiResource<OperationsApiStudent[]>("student_profiles", {
    select: "id,roll_number,full_name,email,phone,department,section,cgpa,tenth_percent,twelfth_percent,backlogs,skills", limit: "1000",
  }, { fallback: [] });
  const { data: companyRows } = useApiResource<OperationsApiCompany[]>("companies", {
    archived: "eq.false", select: "id,name,website,industry,description,metadata", limit: "500",
  }, { fallback: [] });
  const applications: Application[] = (applicationRows ?? []).map((row) => ({
    id: row.id, studentId: row.student_id,
    studentName: row.confirmation_data?.fullName || row.student_profiles?.full_name || "Student",
    studentRollNumber: row.confirmation_data?.rollNumber || row.student_profiles?.roll_number || "",
    studentBranch: (row.student_profiles?.department || "") as Application["studentBranch"],
    studentSection: row.confirmation_data?.section || row.student_profiles?.section || "",
    driveId: row.drive_id, driveName: row.drives?.role_title || "Placement drive", companyId: row.drives?.company_id || "",
    companyName: row.drives?.companies?.name || "Company", status: row.status as ApplicationStatus,
    appliedAt: row.applied_at, confirmedAt: row.confirmation_data?.confirmedAt || row.updated_at,
    confirmationData: row.confirmation_data, followUpCount: 0, updatedAt: row.updated_at || row.applied_at || "",
  }));
  const { data: interviewRows, refetch: refetchInterviews } = useApiResource<OperationsApiInterview[]>("interviews", {}, { fallback: [] });
  const { data: contactRows, refetch: refetchContacts } = useApiResource<OperationsApiContact[]>("recruiter_contacts", {}, { fallback: [] });
  const { data: checkinRows, refetch: refetchCheckins } = useApiResource<OperationsApiCheckin[]>("checkins", {}, { fallback: [] });
  const checkedIn = new Set((checkinRows ?? []).filter((row) => row.checked_in).map((row) => row.application_id));
  const { data: offerRows, refetch: refetchOffers } = useApiResource<OperationsApiOffer[]>("offers", {}, { fallback: [] });
  const { data: policyRows, refetch: refetchPolicies } = useApiResource<OperationsApiPolicy[]>("placement_policies", {}, { fallback: [] });
  const { data: auditRows } = useApiResource<OperationsApiAudit[]>("audit_logs", {}, { fallback: [] });
  const offers: Offer[] = (offerRows ?? []).map((row) => ({ id: row.id, student: row.student_name || "Student", company: row.company_name || "Company",
    role: row.role_title || "Role", packageLPA: Number(row.package_lpa || 0), status: row.status as Offer["status"], deadline: row.details?.deadline || "" }));
  const contacts: Contact[] = (contactRows ?? []).map((row) => ({ id: row.id, companyId: row.company_id, company: row.company_name || "Company", name: row.name,
    email: row.email || "", nextFollowUp: row.next_follow_up || "", notes: row.interaction_notes?.split("\n").filter(Boolean) || [] }));
  const interviews: Interview[] = (interviewRows ?? []).map((row) => {
    const startsAt = new Date(row.starts_at);
    return { id: row.id, candidate: row.student_name || row.roll_number || "Student", company: row.company_name || "Company",
      round: row.round || "Interview", date: startsAt.toISOString().slice(0, 10), time: startsAt.toTimeString().slice(0, 5), room: row.location || "" };
  });
  const drives = (driveRows ?? []).map(operationsDrive);
  const companies: Company[] = (companyRows ?? []).map((company) => ({
    id: company.id, name: company.name, website: company.website || "", description: company.description || "",
    industry: company.industry || "", logoColor: company.metadata?.logoColor || "#b91c1c", drives: [],
  }));
  const students: Student[] = (studentRows ?? []).map((student) => ({
    id: student.id, name: student.full_name || "", rollNumber: student.roll_number, branch: (student.department || "CSE") as Branch,
    section: (student.section || "A") as Student["section"], year: "4", email: student.email || "", phone: student.phone || "",
    cgpa: Number(student.cgpa || 0), placementStatus: "Unplaced", skills: student.skills || [], tenthPercent: Number(student.tenth_percent || 0),
    twelfthPercent: Number(student.twelfth_percent || 0), backlogs: Number(student.backlogs || 0), createdAt: "",
  }));
  const [contactForm, setContactForm] = useState({ company: "", name: "", email: "", nextFollowUp: "" });
  const [interaction, setInteraction] = useState<Record<string, string>>({});
  const [interviewForm, setInterviewForm] = useState({ candidate: "", company: "", round: "", date: "", time: "", room: "" });
  const [interviewError, setInterviewError] = useState("");
  const [offerForm, setOfferForm] = useState({ applicationId: "", packageLPA: "", deadline: "" });
  const [fileError, setFileError] = useState("");
  const [filter, setFilter] = useState("");
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState("");
  const [analysisDriveId, setAnalysisDriveId] = useState("");
  const [policyCheck, setPolicyCheck] = useState({ cgpa: "8.0", backlogs: "0", placed: false, appsToday: "0", package: "" });
  const [operationMessage, setOperationMessage] = useState("");

  const savedPolicies = policyRows?.find((row) => row.active)?.rules;
  const policies = { ...initialOps.policies, ...savedPolicies, ...policyOverrides };
  const selectedAnalysisDriveId = analysisDriveId || drives[0]?.id || "";
  const effectiveApplications = applications;
  const pending = effectiveApplications.filter((application) => application.status === "Not Responded").length;
  const studentApps = applications.length;
  const scheduledInterviews = interviews.length;
  const scheduledForDay = useMemo(() => interviews.filter((interview) => interview.date === new Date().toISOString().slice(0, 10)).length, [interviews]);

  async function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
    setOperationMessage("");
    try {
      await apiMutate("POST", "notifications", { action: "application_status", applicationId, status });
      await refetchApplications();
      setOperationMessage(`Candidate stage updated to ${status}; the student was notified in their Notifications page.`);
    } catch (error) {
      setOperationMessage(error instanceof Error ? error.message : "Could not update the candidate stage.");
    }
  }
  async function addContact(event: React.FormEvent) {
    event.preventDefault();
    try {
      await apiMutate("POST", "recruiter_contacts", { company_id: contactForm.company, name: contactForm.name, email: contactForm.email, next_follow_up: contactForm.nextFollowUp || null });
      await refetchContacts();
      setOperationMessage("Recruiter contact saved to the database.");
      setContactForm({ ...contactForm, name: "", email: "" });
    } catch (error) { setOperationMessage(error instanceof Error ? error.message : "Could not save the recruiter contact."); }
  }
  async function addInterview(event: React.FormEvent) {
    event.preventDefault();
    setInterviewError("");
    if (!interviewForm.candidate || !interviewForm.date || !interviewForm.time || !interviewForm.round.trim()) {
      setInterviewError("Choose an applied student, interview round, date, and time."); return;
    }
    const startsAt = new Date(`${interviewForm.date}T${interviewForm.time}:00`);
    const endsAt = new Date(startsAt.getTime() + 45 * 60_000);
    try {
      await apiMutate("POST", "interviews", { application_id: interviewForm.candidate, round: interviewForm.round.trim(), starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), location: interviewForm.room.trim() || null });
      await refetchInterviews();
      setOperationMessage("Interview saved to the database.");
      setInterviewForm({ ...interviewForm, round: "", date: "", time: "", room: "" });
    } catch (error) {
      setInterviewError(error instanceof Error ? error.message : "Could not save this interview.");
    }
  }
  async function setCheckedIn(application: Application, checked: boolean) {
    try {
      await apiMutate("POST", "checkins", { application_id: application.id, checked_in: checked });
      await refetchCheckins();
      setOperationMessage(`${application.studentName} ${checked ? "checked in" : "check-in reverted"}.`);
    } catch (error) { setOperationMessage(error instanceof Error ? error.message : "Could not save the drive-day check-in."); }
  }
  async function updateOffer(offerId: string, status: Offer["status"]) {
    try { await apiMutate("PATCH", `offers/${offerId}`, { status }); await refetchOffers(); setOperationMessage(`Offer status saved as ${status}.`); }
    catch (error) { setOperationMessage(error instanceof Error ? error.message : "Could not update offer status."); }
  }
  async function createOffer(event: React.FormEvent) {
    event.preventDefault();
    const packageLPA = Number(offerForm.packageLPA);
    if (!offerForm.applicationId || !Number.isFinite(packageLPA) || packageLPA < 0) { setOperationMessage("Choose an applicant and enter a valid package."); return; }
    try {
      await apiMutate("POST", "offers", { application_id: offerForm.applicationId, package_lpa: packageLPA, deadline: offerForm.deadline || null });
      await refetchOffers(); setOfferForm({ ...offerForm, packageLPA: "", deadline: "" }); setOperationMessage("Offer draft saved to the database.");
    } catch (error) { setOperationMessage(error instanceof Error ? error.message : "Could not create the offer."); }
  }
  async function savePolicies() {
    try { await apiMutate("POST", "placement_policies", { rules: policies }); await refetchPolicies(); setOperationMessage("Placement rules saved. Minimum CGPA, backlog, placement, and daily limit rules are enforced when students confirm a drive."); }
    catch (error) { setOperationMessage(error instanceof Error ? error.message : "Could not save placement rules."); }
  }
  async function importStudents(file?: File) {
    if (!file) return;
    setFileError("");
    try {
      const rows = await parseStudentFile(file);
      const result = await importStudentRows(rows);
      await refetchStudents();
      setFileError(`${result.successCount} student records saved to the database${result.errorCount ? ` · ${result.errorCount} rows failed validation/import` : ""}.`);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Could not import student file."); }
  }

  const eligibleStudents = students.filter((student) => student.branch === "CSE" && student.cgpa >= 8 && student.backlogs === 0);
  const blocked = Number(policyCheck.cgpa) < policies.minCGPA || (policies.noActiveBacklogs && Number(policyCheck.backlogs) > 0) || (policies.blockAfterPlacement && policyCheck.placed) || Number(policyCheck.appsToday) >= policies.maxAppsPerDay;
  const copilotContext = JSON.stringify({
    applicationStageCounts: Object.fromEntries([...new Set(effectiveApplications.map((item) => item.status))].map((status) => [status, effectiveApplications.filter((item) => item.status === status).length])),
    pendingConfirmationCount: pending,
    driveCount: drives.length,
    activeDriveCount: drives.filter((drive) => drive.status === "Open" || drive.status === "Closing Soon").length,
    eligibleCseSampleCount: eligibleStudents.length,
  });

  function askTpoAssistant() {
    const query = copilotPrompt.toLowerCase();
    if (query.includes("eligible") || query.includes("cgpa")) {
      const matches = eligibleStudents.filter((student) => student.branch === "CSE" && student.cgpa >= 8 && student.backlogs === 0);
      setCopilotAnswer(`From the campus student directory, ${matches.length} CSE students have CGPA ≥ 8.0 and no backlogs: ${matches.map((student) => `${student.name} (${student.rollNumber}, ${student.cgpa})`).join(", ")}. This is a live directory query; select a specific drive for its full eligibility rules.`);
    } else if (query.includes("confirm") || query.includes("participat")) {
      const waiting = effectiveApplications.filter((application) => application.status === "Not Responded");
      setCopilotAnswer(`${waiting.length} application records are marked Not Responded: ${waiting.map((application) => `${application.studentName} — ${application.companyName}`).join(", ") || "none"}. Review the candidate ATS before sending any follow-up.`);
    } else if (query.includes("drop") || query.includes("conversion") || query.includes("drive")) {
      const buckets = ["Confirmed", "Shortlisted", "Assessment", "Interview", "Selected", "Placed"];
      const summary = buckets.map((status) => `${status}: ${effectiveApplications.filter((application) => application.status === status).length}`).join(" · ");
      setCopilotAnswer(`Current sample pipeline counts: ${summary}. These counts reflect loaded records and local status updates; they do not include external ATS data or establish why candidates dropped off.`);
    } else if (query.includes("email") || query.includes("recruiter")) {
      setCopilotAnswer("I can prepare wording for a recruiter follow-up, but this local preview cannot send it. Suggested draft: “Hello, I’m following up on the campus hiring process and would be happy to coordinate the next steps. Please let us know your preferred dates and candidate requirements.” Review it in Communications & audit before copying.");
    } else {
      setCopilotAnswer("Try a question about CSE eligibility, pending confirmations, drive funnel counts, or a recruiter follow-up. Answers use the sample data and simple local rules; no AI model or live institutional data is connected.");
    }
  }

  return (
    <div>
      <AdminHeader title="Placement operations" subtitle="Coordinate campus placement work using the shared company, student, drive, and application records" />
      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-7">
        {operationMessage && <p role="status" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900">{operationMessage}</p>}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Student records", value: students.length, icon: Users, sub: "Campus database roster" },
            { label: "Applications", value: studentApps, icon: ClipboardCheck, sub: `${pending} pending confirmations` },
            { label: "Placement drives", value: drives.length, icon: CalendarDays, sub: `${drives.filter((drive) => drive.status === "Open" || drive.status === "Closing Soon").length} active` },
            { label: "Eligible CSE students", value: eligibleStudents.length, icon: Building2, sub: "CGPA 8+ and no backlogs" },
          ].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{item.label}</p><item.icon className="h-4 w-4 text-red-500"/></div><p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p><p className="mt-1 text-[10px] text-slate-400">{item.sub}</p></div>)}
        </section>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Placement office modules">{panels.map((item) => <button key={item} role="tab" aria-selected={panel === item} onClick={() => setPanel(item)} className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold ${panel === item ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{item}</button>)}</div>

        {panel === "Command center" && <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Placement control center</h3></div><p className="mt-1 text-xs text-slate-500">Prioritize the next actions across active placement activity.</p><div className="mt-5 space-y-3">{[
          { title: `${pending} students need follow-up`, detail: "Open the follow-up queue to review students who have not confirmed participation.", href: "/admin/followups", action: "Review queue" },
          { title: `${scheduledInterviews} interviews scheduled`, detail: "Check room conflicts and review the calendar for upcoming rounds.", href: "#", action: "Schedule interview", target: "Interviews & drive day" },
          { title: `${drives.length} placement drives on record`, detail: "Update deadlines, stages, and eligibility criteria in the drive manager.", href: "/admin/drives", action: "Manage drives" },
          { title: `${eligibleStudents.length} students match CSE · CGPA 8+ · zero backlog`, detail: "Eligibility is computed from the loaded campus student records.", href: "/admin/students", action: "View students" },
        ].map((item) => <div key={item.title} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div>{item.target ? <button onClick={() => setPanel(item.target as Panel)} className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-semibold text-white">{item.action}</button> : <a href={item.href} className="rounded-lg bg-slate-900 px-3 py-2 text-center text-[10px] font-semibold text-white">{item.action}</a>}</div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="font-bold text-slate-900">Placement journey</h3><p className="mt-1 text-xs text-slate-500">Pipeline totals from the live placement database</p><div className="mt-5 space-y-3">{["Not Responded", "Confirmed", "Shortlisted", "Assessment", "Interview", "Selected", "Placed"].map((status) => { const count = effectiveApplications.filter((application) => application.status === status).length; return <div key={status} className="flex items-center gap-3"><span className="w-24 text-xs text-slate-600">{status}</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.max(count / Math.max(effectiveApplications.length, 1) * 100, count ? 8 : 0)}%` }}/></div><b className="w-6 text-right text-xs text-slate-800">{count}</b></div>; })}</div><p className="mt-4 text-[10px] text-slate-400">Counts include records currently stored in this campus database.</p></div></section>}

        {panel === "Candidate ATS" && <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><Users className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Candidate pipeline</h3></div><p className="mt-1 text-xs text-slate-500">Update candidate stages in the shared database and student tracker.</p></div><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search name, roll no, company" className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs"/></label></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400"><th className="p-3">Student</th><th className="p-3">Company / role</th><th className="p-3">Eligibility</th><th className="p-3">Stage</th><th className="p-3">Update stage</th></tr></thead><tbody className="divide-y divide-slate-50">{applications.filter((application) => `${application.studentName} ${application.studentRollNumber} ${application.companyName}`.toLowerCase().includes(filter.toLowerCase())).map((application) => { const current = application.status; const drive = drives.find((item) => item.id === application.driveId); return <tr key={application.id} className="text-xs"><td className="p-3"><b className="text-slate-800">{application.studentName}</b><p className="mt-1 text-[10px] text-slate-400">{application.studentRollNumber} · {application.studentBranch}</p></td><td className="p-3 text-slate-700">{application.companyName}<p className="mt-1 text-[10px] text-slate-400">{application.driveName}</p></td><td className="p-3">{drive ? <span className={application.studentBranch === "CSE" && drive.eligibility.branches.includes(application.studentBranch) ? "text-emerald-700" : "text-amber-700"}>{drive.eligibility.branches.includes(application.studentBranch) ? "Branch listed" : "Branch mismatch"}</span> : "Pending"}</td><td className="p-3"><StatusBadge status={current} size="sm"/></td><td className="p-3"><select value={current} onChange={(event) => { const next = event.target.value as ApplicationStatus; void updateApplicationStatus(application.id, next); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="Not Responded">Not Responded</option>{APPLICATION_JOURNEY.map((stage) => <option key={stage} value={stage}>{stage}</option>)}<option value="Rejected">Rejected</option></select></td></tr>; })}</tbody></table>{applications.filter((application) => `${application.studentName} ${application.studentRollNumber} ${application.companyName}`.toLowerCase().includes(filter.toLowerCase())).length === 0 && <p className="py-12 text-center text-sm text-slate-500">No candidates match your search.</p>}</div></section>}

        {panel === "Employer CRM" && <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Add recruiter relationship</h3><p className="mt-1 text-xs text-slate-500">Contact records and follow-up notes are shared from the database.</p><form onSubmit={addContact} className="mt-4 space-y-3"><label className="block text-xs font-medium text-slate-600">Company<select required value={contactForm.company} onChange={(event) => setContactForm({ ...contactForm, company: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm"><option value="">Choose a company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><input required placeholder="Recruiter name" value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/><input required type="email" placeholder="Work email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/><label className="block text-xs text-slate-600">Next follow-up<input type="date" value={contactForm.nextFollowUp} onChange={(event) => setContactForm({ ...contactForm, nextFollowUp: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label><button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5"/>Add contact</button></form></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Employer relationships</h3><p className="mt-1 text-xs text-slate-500">Record follow-ups, hiring history, and recruiter next steps.</p></div><span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700">{contacts.length} contacts</span></div><div className="mt-4 space-y-3">{contacts.map((contact) => <article key={contact.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="text-sm font-semibold text-slate-900">{contact.name}</h4><p className="text-xs text-slate-500">{contact.company} · {contact.email}</p></div><span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] text-amber-800">Follow up {formatDate(contact.nextFollowUp)}</span></div><p className="mt-2 text-xs text-slate-500">Drive history: {drives.filter((drive) => drive.companyName === contact.company).length} drives · {contact.notes.join("; ") || "No notes yet"}</p><div className="mt-3 flex gap-2"><input value={interaction[contact.id] || ""} onChange={(event) => setInteraction({ ...interaction, [contact.id]: event.target.value })} placeholder="Log a conversation or action" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"/><button onClick={async () => { const note = interaction[contact.id]?.trim(); if (!note) return; try { await apiMutate("POST", "employer_interactions", { company_id: contact.companyId, kind: "Follow-up", notes: note }); await refetchContacts(); setOperationMessage("Employer interaction saved to the database."); setInteraction({ ...interaction, [contact.id]: "" }); } catch (error) { setOperationMessage(error instanceof Error ? error.message : "Could not save the employer interaction."); } }} className="rounded-lg border border-slate-200 px-3 text-xs font-semibold">Log</button></div></article>)}</div></div></section>}

        {panel === "Policies & eligibility" && <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Placement policy rules</h3></div><p className="mt-1 text-xs text-slate-500">Rules are shared from the campus database. The minimum CGPA and application limits are enforced with drive eligibility when a student confirms.</p><label className="mt-5 block text-xs font-semibold text-slate-700">Maximum applications per day<input type="number" min="1" max="20" value={policies.maxAppsPerDay} onChange={(event) => setPolicyOverrides((current) => ({ ...current, maxAppsPerDay: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label><label className="mt-3 block text-xs font-semibold text-slate-700">Minimum CGPA<input type="number" min="0" max="10" step="0.01" value={policies.minCGPA} onChange={(event) => setPolicyOverrides((current) => ({ ...current, minCGPA: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label>{[["noActiveBacklogs", "Block students with active backlogs"], ["blockAfterPlacement", "Block applications after placement"]].map(([key, label]) => <label key={key} className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{label}<input type="checkbox" checked={policies[key as "noActiveBacklogs" | "blockAfterPlacement"]} onChange={(event) => setPolicyOverrides((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-red-600"/></label>)}<label className="mt-4 block text-xs font-semibold text-slate-700">Dream offer threshold (LPA)<input type="number" min="0" value={policies.dreamThresholdLPA} onChange={(event) => setPolicyOverrides((current) => ({ ...current, dreamThresholdLPA: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label><button type="button" onClick={() => void savePolicies()} className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white">Save placement rules</button></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Try an eligibility / policy check</h3></div><p className="mt-1 text-xs text-slate-500">Check sample values against the currently saved campus rules.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["cgpa", "CGPA"], ["backlogs", "Active backlogs"], ["appsToday", "Applications today"], ["package", "Offer package (LPA), if placed"]].map(([key, label]) => <label key={key} className="text-xs font-medium text-slate-600">{label}<input type="number" value={policyCheck[key as keyof typeof policyCheck] as string} onChange={(event) => setPolicyCheck({ ...policyCheck, [key]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm"/></label>)}<label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2"><input type="checkbox" checked={policyCheck.placed} onChange={(event) => setPolicyCheck({ ...policyCheck, placed: event.target.checked })}/>Already placed</label></div><div className={`mt-4 rounded-xl p-4 text-sm ${blocked ? "bg-rose-50 text-rose-900" : "bg-emerald-50 text-emerald-900"}`}><p className="font-bold">{blocked ? "Action blocked by configured policy" : "No configured rule blocks this action"}</p><p className="mt-1 text-xs leading-5">{Number(policyCheck.cgpa) < policies.minCGPA ? `Minimum CGPA (${policies.minCGPA}) is not met. ` : ""}{policies.noActiveBacklogs && Number(policyCheck.backlogs) > 0 ? "Active backlogs are not permitted. " : ""}{policies.blockAfterPlacement && policyCheck.placed ? "Placed students are blocked by the current rule. " : ""}{Number(policyCheck.appsToday) >= policies.maxAppsPerDay ? `Daily application limit (${policies.maxAppsPerDay}) reached. ` : ""}{policyCheck.package && Number(policyCheck.package) < policies.dreamThresholdLPA ? "Offer package is below the dream threshold and should be reviewed." : ""}</p><p className="mt-2 text-[10px]">Dream offer threshold: {policies.dreamThresholdLPA} LPA</p></div></div></section>}

        {panel === "Interviews & drive day" && <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Schedule an interview</h3></div>
            <p className="mt-1 text-xs text-slate-500">Schedules are saved in the database. Time overlaps in the same room are rejected.</p>
            <form onSubmit={addInterview} className="mt-4 space-y-3"><select required value={interviewForm.candidate} onChange={(e) => setInterviewForm({ ...interviewForm, candidate: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"><option value="">Choose an applicant</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.studentName} · {application.studentRollNumber} · {application.companyName}</option>)}</select>
              <input required value={interviewForm.round} onChange={(e) => setInterviewForm({ ...interviewForm, round: e.target.value })} placeholder="Interview round / role" className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/>
              <div className="grid grid-cols-2 gap-2"><input required type="date" value={interviewForm.date} onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })} className="rounded-lg border border-slate-200 p-2.5 text-sm"/><input required type="time" value={interviewForm.time} onChange={(e) => setInterviewForm({ ...interviewForm, time: e.target.value })} className="rounded-lg border border-slate-200 p-2.5 text-sm"/></div>
              <input value={interviewForm.room} onChange={(e) => setInterviewForm({ ...interviewForm, room: e.target.value })} placeholder="Room or virtual meeting URL" className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"/>{interviewError && <p role="alert" className="text-xs text-rose-700">{interviewError}</p>}
              <button disabled={applications.length === 0} className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">Schedule interview</button>{applications.length === 0 && <p className="text-xs text-slate-500">Interview scheduling is available after students confirm applications.</p>}</form>
          </div><div className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Interview calendar</h3><p className="mt-1 text-xs text-slate-500">Database schedule · {interviews.length} total</p><div className="mt-4 space-y-2">{[...interviews].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map((interview) => <div key={interview.id} className="grid gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-[100px_1fr_auto] sm:items-center"><div className="font-semibold text-red-700">{formatDate(interview.date)}<br/>{interview.time}</div><div><p className="font-semibold text-slate-800">{interview.candidate} · {interview.company}</p><p className="text-slate-500">{interview.round} · {interview.room}</p></div><button onClick={async () => { try { await apiMutate("PATCH", `interviews/${interview.id}`, { status: "Cancelled" }); await refetchInterviews(); } catch (error) { setOperationMessage(error instanceof Error ? error.message : "Could not cancel interview."); } }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold">Cancel</button></div>)}{interviews.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No interviews scheduled yet.</p>}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Drive-day candidate list</h3><p className="mt-1 text-xs text-slate-500">Confirmed applicants loaded from the live database.</p><div className="mt-3 space-y-2">{applications.filter((application) => application.status !== "Not Responded").map((application) => <div key={application.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs"><span><b>{application.studentName}</b><span className="ml-2 text-slate-500">{application.companyName} · {application.status}</span></span><span className="mr-auto text-slate-500">{interviews.some((item) => item.candidate === application.studentName && item.company === application.companyName) ? "Interview scheduled" : "Awaiting interview"}</span><label className="flex items-center gap-2"><span className={checkedIn.has(application.id) ? "text-emerald-700" : "text-slate-400"}>{checkedIn.has(application.id) ? "Checked in" : "Waiting"}</span><input type="checkbox" checked={checkedIn.has(application.id)} onChange={(event) => void setCheckedIn(application, event.target.checked)} className="h-4 w-4 accent-emerald-600"/></label></div>)}</div>{applications.length === 0 && <p className="mt-3 text-xs text-slate-500">No applicants yet.</p>}</div>
          </div></section>}

        {panel === "Assessments & offers" && <section className="space-y-5"><AssessmentManager/><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Offer lifecycle</h3></div><p className="mt-1 text-xs text-slate-500">Create and update offer records; every status change is shared from the database.</p><form onSubmit={createOffer} className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4"><select required value={offerForm.applicationId} onChange={(e) => setOfferForm({ ...offerForm, applicationId: e.target.value })} className="rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">Select applicant</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.studentName} · {application.companyName}</option>)}</select><input required type="number" min="0" step="0.01" placeholder="Package LPA" value={offerForm.packageLPA} onChange={(e) => setOfferForm({ ...offerForm, packageLPA: e.target.value })} className="rounded-lg border border-slate-200 bg-white p-2 text-xs"/><input type="date" aria-label="Acceptance deadline" value={offerForm.deadline} onChange={(e) => setOfferForm({ ...offerForm, deadline: e.target.value })} className="rounded-lg border border-slate-200 bg-white p-2 text-xs"/><button disabled={!applications.length} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Create offer draft</button></form><div className="mt-4 space-y-3">{offers.map((offer) => <article key={offer.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900">{offer.student}</p><p className="text-xs text-slate-500">{offer.company} · {offer.role} · ₹{offer.packageLPA} LPA</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">{offer.status}</span></div><div className="mt-3 flex flex-wrap items-center gap-1.5">{(["Draft", "Released", "Viewed", "Accepted", "Rejected", "Joined"] as Offer["status"][]).map((status) => <button key={status} onClick={() => updateOffer(offer.id, status)} className={`rounded-md px-2 py-1.5 text-[10px] font-semibold ${offer.status === status ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{status}</button>)}</div><p className="mt-2 text-[10px] text-slate-400">Acceptance deadline: {formatDate(offer.deadline)} · Offer documents are not stored here.</p></article>)}</div></div></section>}

        {panel === "Reports & data" && <section className="grid gap-5 xl:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Download placement reports</h3></div><p className="mt-1 text-xs text-slate-500">Export currently loaded database records to CSV.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={() => csvDownload("placement-applications.csv", [["student", "rollNumber", "branch", "company", "role", "status"], ...applications.map((item) => [item.studentName, item.studentRollNumber, item.studentBranch, item.companyName, item.driveName, item.status])])} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"><b className="text-xs">Applications report</b><p className="mt-1 text-[10px] text-slate-500">Candidate pipeline roster</p></button><button onClick={() => csvDownload("placement-drives.csv", [["company", "role", "deadline", "packageLPA", "status"], ...drives.map((item) => [item.companyName, item.role, item.applicationDeadline, String(item.packageLPA ?? ""), item.status])])} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"><b className="text-xs">Drive report</b><p className="mt-1 text-[10px] text-slate-500">Companies and drive criteria</p></button><button onClick={() => csvDownload("student-roster.csv", [["name", "rollNumber", "email", "branch", "cgpa"], ...students.map((item) => [item.name, item.rollNumber, item.email, item.branch, String(item.cgpa)])])} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"><b className="text-xs">Student roster</b><p className="mt-1 text-[10px] text-slate-500">Loaded database records</p></button><button onClick={() => csvDownload("company-summary.csv", [["company", "industry", "sampleDrives"], ...companies.map((company) => [company.name, company.industry, String(drives.filter((drive) => drive.companyId === company.id).length)])])} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"><b className="text-xs">Company summary</b><p className="mt-1 text-[10px] text-slate-500">Internal drive history only</p></button></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Download className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Import student CSV</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">Required columns: name, rollNumber, email, branch, cgpa. Validated rows are upserted into the campus student directory. This is the same import flow as Student Management.</p><label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download className="h-4 w-4"/>Choose CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void importStudents(event.target.files?.[0])}/></label>{fileError && <p aria-live="polite" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-900">{fileError}</p>}</div></section>}

        {panel === "Communications & audit" && <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Mail className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Student communications</h3></div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Send campus notices or shortlisted updates from the notification center. In-app notices are saved per student; email and WhatsApp results are reported per channel.</p>
            <Link href="/admin/notifications" className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white">Open notification center</Link>
            <p className="mt-3 text-[10px] leading-4 text-slate-400">External delivery needs provider credentials. Students can still receive notices in their portal inbox.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Audit trail</h3></div>
            <p className="mt-1 text-xs text-slate-500">Database audit records for company, drive, application, interview, offer, and policy changes.</p>
            <div className="mt-4 max-h-[480px] space-y-2 overflow-y-auto">{(auditRows ?? []).map((item) => <div key={item.id} className="flex gap-3 rounded-lg border border-slate-100 p-3"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500"/><div><p className="text-xs font-medium text-slate-700">{item.action}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(item.at).toLocaleString()}</p></div></div>)}{!auditRows?.length && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No database audit events recorded yet.</p>}</div>
          </div>
        </section>}

        {panel === "Drive analyzer" && <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Drive performance snapshot</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">Counts current application statuses and eligibility from database records. Historical stage timestamps are not available, so this view does not claim a conversion rate or causal drop-off.</p><label className="mt-4 block text-xs font-semibold text-slate-600">Choose drive<select value={selectedAnalysisDriveId} onChange={(event) => setAnalysisDriveId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm font-normal">{drives.map((drive) => <option key={drive.id} value={drive.id}>{drive.companyName} · {drive.role}</option>)}</select></label>{(() => { const drive = drives.find((item) => item.id === selectedAnalysisDriveId); if (!drive) return null; const candidates = effectiveApplications.filter((application) => application.driveId === drive.id); const eligibleCount = students.filter((student) => drive.eligibility.branches.includes(student.branch) && student.cgpa >= drive.eligibility.minCGPA && student.backlogs <= drive.eligibility.maxBacklogs && (!drive.eligibility.tenthMin || student.tenthPercent >= drive.eligibility.tenthMin) && (!drive.eligibility.twelfthMin || student.twelfthPercent >= drive.eligibility.twelfthMin)).length; const statusCounts = ["Not Responded", "Confirmed", "Shortlisted", "Assessment", "Interview", "Selected", "Placed", "Rejected"]; return <><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">{drive.companyName} · {drive.role}</p><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><span className="text-slate-500">Eligible students</span><b className="mt-1 block text-lg text-slate-900">{eligibleCount}</b></div><div><span className="text-slate-500">Application records</span><b className="mt-1 block text-lg text-slate-900">{candidates.length}</b></div></div></div><p className="mt-4 text-xs font-semibold text-slate-800">Current status distribution</p><div className="mt-2 space-y-2">{statusCounts.map((status) => { const count = candidates.filter((candidate) => candidate.status === status).length; return <div key={status} className="flex items-center gap-2 text-[10px]"><span className="w-24 text-slate-600">{status}</span><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-red-500" style={{ width: `${candidates.length ? count / candidates.length * 100 : 0}%` }}/></div><b className="w-5 text-right text-slate-800">{count}</b></div>; })}</div></>; })()}</div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Evidence and next checks</h3><p className="mt-1 text-xs text-slate-500">Read from currently loaded company, student, and application database records.</p><div className="mt-4 space-y-3">{(() => { const drive = drives.find((item) => item.id === selectedAnalysisDriveId); const candidates = effectiveApplications.filter((application) => application.driveId === selectedAnalysisDriveId); const notResponded = candidates.filter((application) => application.status === "Not Responded").length; const assessmentOrBeyond = candidates.filter((application) => ["Assessment", "Interview", "Selected", "Placed"].includes(application.status)).length; const selected = candidates.filter((application) => ["Selected", "Placed"].includes(application.status)).length; return [
          { title: `${notResponded} candidate records need confirmation`, body: notResponded ? "Review the pending roster and follow up through your approved communication channel." : "No application records are currently marked Not Responded." },
          { title: `${assessmentOrBeyond} records reached assessment or later`, body: "Use the candidate stage history and interviewer feedback to understand individual progress." },
          { title: `${selected} records are selected or placed`, body: drive ? `The drive lists ${drive.openings} openings. Check offer acceptance and joining records before publishing outcomes.` : "Check offer acceptance and joining records before publishing outcomes." },
        ].map((insight) => <div key={insight.title} className="rounded-xl border border-slate-100 p-4"><p className="text-sm font-semibold text-slate-800">{insight.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{insight.body}</p></div>); })()}</div><p className="mt-4 text-[10px] leading-4 text-slate-400">These are descriptive checks, not an AI-generated analysis. Status counts are snapshot records, not reconstructed event funnels.</p></div></section>}

        {panel === "Employer discovery" && <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">Employer discovery</h3></div><p className="mt-1 text-xs text-slate-500">Recommendations use only internal campus hiring history. No live hiring signal is available.</p></div><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search by company or industry" className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs"/></label></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{companies.filter((company) => `${company.name} ${company.industry}`.toLowerCase().includes(filter.toLowerCase())).map((company) => { const history = drives.filter((drive) => drive.companyId === company.id); const hires = applications.filter((application) => application.companyId === company.id && ["Selected", "Placed"].includes(application.status)).length; return <article key={company.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: company.logoColor }}>{company.name.slice(0, 2).toUpperCase()}</span><div><b className="text-sm text-slate-900">{company.name}</b><p className="text-[10px] text-slate-500">{company.industry}</p></div></div><p className="mt-3 text-xs leading-5 text-slate-600">Recommended because {history.length ? `the college has ${history.length} recorded drive${history.length === 1 ? "" : "s"} and ${hires} selection${hires === 1 ? "" : "s"}.` : "the company record is active; no campus hiring history is recorded yet."}</p><p className="mt-2 text-[10px] text-slate-400">Roles: {history.length ? [...new Set(history.map((drive) => drive.role))].join(", ") : "No recorded role"} · Source: campus database records</p><button onClick={() => { setPanel("Employer CRM"); setContactForm({ ...contactForm, company: company.id }); }} className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-semibold text-white">Add recruiter contact</button></article>; })}</div></section>}

        {panel === "AI copilot" && <AICareerPanel mode="tpo" context={copilotContext}/>}

        {panel === "TPO insight assistant" && <section className="grid gap-5 lg:grid-cols-[1fr_300px]"><div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-red-600"/><h3 className="font-bold text-slate-900">TPO insight assistant preview</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">Local, rule-based answers using the campus roster and browser-updated candidate stages. It does not execute actions or call an AI service.</p><textarea value={copilotPrompt} onChange={(event) => setCopilotPrompt(event.target.value)} rows={3} placeholder="Ask about eligible students, pending confirmations, funnel counts, or a recruiter follow-up" className="mt-4 w-full rounded-lg border border-slate-200 p-3 text-sm"/><button onClick={askTpoAssistant} disabled={!copilotPrompt.trim()} className="mt-3 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">Get a data-backed preview</button>{copilotAnswer && <div aria-live="polite" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-950">{copilotAnswer}</div>}</div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Suggested questions</h3>{["Show CSE students with CGPA above 8", "Who has not confirmed participation?", "Summarize the placement funnel", "Draft an email to a recruiter"].map((question) => <button key={question} onClick={() => setCopilotPrompt(question)} className="mt-3 block w-full rounded-lg border border-slate-200 p-3 text-left text-xs text-slate-600 hover:bg-slate-50">{question}</button>)}<p className="mt-4 text-[10px] leading-4 text-slate-400">Production AI needs a protected service, structured data access, access checks, and human approval for actions.</p></div></section>}
      </div>
    </div>
  );
}
