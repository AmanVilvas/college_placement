"use client";

import { useState } from "react";
import { X, CalendarDays, Plus, Globe, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { Drive, Branch, JobType, WorkMode, DriveStatus, Company } from "@/lib/types";

interface AddDriveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (drive: Partial<Drive>) => Promise<void>;
  companyOptions?: Company[];
}

const ALL_BRANCHES: Branch[] = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"];
const afterDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export function AddDriveDialog({ isOpen, onClose, onAdd, companyOptions = [] }: AddDriveDialogProps) {
  const [companyId, setCompanyId] = useState(companyOptions[0]?.id || "");
  const [role, setRole] = useState("");
  const [jobType, setJobType] = useState<JobType>("Full-time");
  const [packageLPA, setPackageLPA] = useState<number | undefined>();
  const [stipendMonthly, setStipendMonthly] = useState<number | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode>("Hybrid");
  const [openings, setOpenings] = useState(1);
  const [applicationDeadline, setApplicationDeadline] = useState(() => afterDays(14));
  const [driveDate, setDriveDate] = useState(() => afterDays(21));
  const [officialApplyLink, setOfficialApplyLink] = useState("");
  const [minCGPA, setMinCGPA] = useState(7.0);
  const [maxBacklogs, setMaxBacklogs] = useState(0);
  const [selectedBranches, setSelectedBranches] = useState<Branch[]>([]);
  const [skills, setSkills] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const selectedCompanyId = companyId || companyOptions[0]?.id || "";
  const closeDialog = () => { setSubmitError(""); onClose(); };

  if (!isOpen) return null;

  const toggleBranch = (branch: Branch) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter((b) => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const comp = companyOptions.find((c) => c.id === selectedCompanyId);
    if (!comp) { setSubmitError("Add a company before creating a placement drive."); return; }
    if (!role.trim()) { setSubmitError("Enter a role title."); return; }
    if (selectedBranches.length === 0) { setSubmitError("Select at least one eligible branch."); return; }
    if (!Number.isInteger(openings) || openings < 1) { setSubmitError("Openings must be a positive whole number."); return; }
    setSaving(true);
    setSubmitError("");
    try {
      await onAdd({
      companyId: comp.id,
      companyName: comp.name,
      companyLogoColor: comp.logoColor,
      role,
      jobType,
      packageLPA: jobType === "Full-time" ? packageLPA : undefined,
      stipendMonthly: jobType === "Internship" ? stipendMonthly : undefined,
      location,
      workMode,
      openings,
      applicationDeadline,
      driveDate,
      status: "Open" as DriveStatus,
      officialApplyLink,
      jobDescription,
      eligibility: {
        branches: selectedBranches,
        minCGPA,
        maxBacklogs,
      },
      requiredSkills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      selectionProcess: [],
      importantInstructions: [],
      createdAt: new Date().toISOString(),
      });
      closeDialog();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not publish the placement drive.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!saving) closeDialog(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Placement Drive</h2>
              <p className="text-xs text-slate-500">Configure job role, eligibility, and dual apply links</p>
            </div>
          </div>
          <button onClick={closeDialog} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Dual Link Explanation Callout */}
          <div className="bg-red-50/80 border border-red-100 rounded-xl p-3.5 space-y-2 text-xs text-red-900">
            <div className="flex items-center gap-1.5 font-bold text-red-950">
              <Sparkles className="w-4 h-4 text-red-600" />
              <span>How student applications work with MMDU Placement Cell:</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              <div className="bg-white/90 p-2.5 rounded-lg border border-red-200/50">
                <span className="font-bold text-slate-800 flex items-center gap-1 mb-0.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" /> 1. Official Apply Link
                </span>
                <p className="text-[11px] text-slate-600">External URL: Google Form, careers portal, or university registration link.</p>
              </div>
              <div className="bg-white/90 p-2.5 rounded-lg border border-red-200/50">
                <span className="font-bold text-slate-800 flex items-center gap-1 mb-0.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" /> 2. Student Confirmation
                </span>
                <p className="text-[11px] text-slate-600">Built-in internal tracker where students confirm they completed step 1.</p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Company *</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <option value="">{companyOptions.length ? "Select a company" : "Add a company first"}</option>
                {companyOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Job Role Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Software Engineer, Data Analyst"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              >
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {jobType === "Full-time" ? "Package (LPA)" : "Stipend (/mo)"}
              </label>
              <input
                type="number"
                step="0.5"
                value={jobType === "Full-time" ? (packageLPA ?? "") : (stipendMonthly ?? "")}
                onChange={(e) => jobType === "Full-time" ? setPackageLPA(Number(e.target.value)) : setStipendMonthly(Number(e.target.value))}
                placeholder={jobType === "Full-time" ? "e.g. 15" : "e.g. 50000"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Openings</label>
              <input
                type="number"
                value={openings}
                onChange={(e) => setOpenings(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or remote" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Application Deadline *</label>
              <input
                type="date"
                required
                min={afterDays(0)}
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Drive / Test Date *</label>
              <input
                type="date"
                required
                min={applicationDeadline}
                value={driveDate}
                onChange={(e) => setDriveDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Official External Application Link *</span>
              <span className="text-[11px] text-red-600 font-normal">Where students apply</span>
            </label>
            <input
              type="url"
              required
              placeholder="e.g. https://forms.gle/abc123xyz or https://careers.company.com/apply"
              value={officialApplyLink}
              onChange={(e) => setOfficialApplyLink(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 font-mono text-xs"
            />
          </div>

          {/* Eligibility Section */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-3">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Eligibility Criteria</p>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1.5">Allowed Branches:</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_BRANCHES.map((b) => {
                  const selected = selectedBranches.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBranch(b)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${selected ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
              {!selectedBranches.length && <p className="mt-2 text-[11px] text-amber-700">Select one or more branches to publish this drive.</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Minimum CGPA</label>
                <input
                  type="number"
                  step="0.1"
                  value={minCGPA}
                  onChange={(e) => setMinCGPA(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Max Active Backlogs</label>
                <input
                  type="number"
                  value={maxBacklogs}
                  onChange={(e) => setMaxBacklogs(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Required Skills (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Data Structures, React, Node.js, System Design"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Job description</label>
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={4} placeholder="Describe responsibilities, qualifications, and the role's impact" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800" />
          </div>

          {submitError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{submitError}</p>}
          {!companyOptions.length && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">No companies are available. Add a company in the Companies page, then return here.</p>}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={closeDialog}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !companyOptions.length}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {saving ? "Publishing…" : "Publish Placement Drive"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
