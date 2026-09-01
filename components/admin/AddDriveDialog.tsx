"use client";

import { useState } from "react";
import { X, CalendarDays, Plus, Info, Globe, ShieldAlert, Sparkles } from "lucide-react";
import { Drive, Branch, JobType, WorkMode, DriveStatus } from "@/lib/types";
import { companies } from "@/lib/data/companies";

interface AddDriveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (drive: Partial<Drive>) => void;
}

const ALL_BRANCHES: Branch[] = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"];

export function AddDriveDialog({ isOpen, onClose, onAdd }: AddDriveDialogProps) {
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [role, setRole] = useState("");
  const [jobType, setJobType] = useState<JobType>("Full-time");
  const [packageLPA, setPackageLPA] = useState<number | undefined>(12);
  const [stipendMonthly, setStipendMonthly] = useState<number | undefined>(undefined);
  const [location, setLocation] = useState("Bangalore / Hybrid");
  const [workMode, setWorkMode] = useState<WorkMode>("Hybrid");
  const [openings, setOpenings] = useState(10);
  const [applicationDeadline, setApplicationDeadline] = useState("2026-09-20");
  const [driveDate, setDriveDate] = useState("2026-09-28");
  const [officialApplyLink, setOfficialApplyLink] = useState("");
  const [minCGPA, setMinCGPA] = useState(7.0);
  const [maxBacklogs, setMaxBacklogs] = useState(0);
  const [selectedBranches, setSelectedBranches] = useState<Branch[]>(["CSE", "IT", "ECE"]);
  const [skills, setSkills] = useState("DSA, Java, Problem Solving, React");
  const [jobDescription, setJobDescription] = useState("");

  if (!isOpen) return null;

  const toggleBranch = (branch: Branch) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter((b) => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const comp = companies.find((c) => c.id === companyId);
    if (!comp || !role.trim()) return;

    onAdd({
      id: "d_" + Date.now(),
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
      officialApplyLink: officialApplyLink || "https://careers.google.com",
      jobDescription: jobDescription || `Hiring for ${role} with excellent problem-solving ability and technical proficiency.`,
      eligibility: {
        branches: selectedBranches,
        minCGPA,
        maxBacklogs,
        passOutYear: "2026",
      },
      requiredSkills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      selectionProcess: ["Online Assessment", "Technical Interview Round", "HR Round"],
      importantInstructions: [
        "Carry valid college ID card",
        "Keep resume updated",
        "Formals required for in-person rounds",
      ],
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Placement Drive</h2>
              <p className="text-xs text-slate-500">Configure job role, eligibility, and dual apply links</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Dual Link Explanation Callout */}
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3.5 space-y-2 text-xs text-indigo-900">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>How Student Applications Work on PlacementOS:</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              <div className="bg-white/90 p-2.5 rounded-lg border border-indigo-200/50">
                <span className="font-bold text-slate-800 flex items-center gap-1 mb-0.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" /> 1. Official Apply Link
                </span>
                <p className="text-[11px] text-slate-600">External URL: Google Form, careers portal, or university registration link.</p>
              </div>
              <div className="bg-white/90 p-2.5 rounded-lg border border-indigo-200/50">
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
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {companies.map((c) => (
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
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Application Deadline *</label>
              <input
                type="date"
                required
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Drive / Test Date *</label>
              <input
                type="date"
                required
                value={driveDate}
                onChange={(e) => setDriveDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Official External Application Link *</span>
              <span className="text-[11px] text-indigo-600 font-normal">Where students apply</span>
            </label>
            <input
              type="url"
              required
              placeholder="e.g. https://forms.gle/abc123xyz or https://careers.company.com/apply"
              value={officialApplyLink}
              onChange={(e) => setOfficialApplyLink(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono text-xs"
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
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
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Publish Placement Drive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
