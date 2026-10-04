"use client";

import { useState } from "react";
import { X, Check, AlertTriangle, Loader2, Save, Sparkles } from "lucide-react";

export interface StudentToEdit {
  id: string;
  name: string;
  email: string;
  phone?: string;
  rollNumber: string;
  branch: string;
  section?: string;
  cgpa?: number;
  backlogs?: number;
  graduationYear?: number;
  hasProblemWithDetails?: boolean;
  detailProblems?: string[];
  rawProfileData?: Record<string, unknown>;
}

interface Props {
  student: StudentToEdit | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStudentDetailsModal({ student, isOpen, onClose, onSuccess }: Props) {
  if (!isOpen || !student) return null;

  return (
    <EditStudentModalInner
      student={student}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function EditStudentModalInner({
  student,
  onClose,
  onSuccess,
}: {
  student: StudentToEdit;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState(student.name === "—" ? "" : student.name);
  const [rollNumber, setRollNumber] = useState(student.rollNumber);
  const [email, setEmail] = useState(student.email === "—" ? "" : student.email);
  const [phone, setPhone] = useState(student.phone === "—" ? "" : (student.phone ?? ""));
  const [department, setDepartment] = useState(student.branch);
  const [section, setSection] = useState(student.section === "—" ? "" : (student.section ?? ""));
  const [cgpa, setCgpa] = useState(student.cgpa !== undefined && student.cgpa !== null ? String(student.cgpa) : "");
  const [backlogs, setBacklogs] = useState(String(student.backlogs ?? 0));
  const [graduationYear, setGraduationYear] = useState(student.graduationYear ? String(student.graduationYear) : "");
  const [markAsVerified, setMarkAsVerified] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) {
      setError("Roll Number cannot be empty");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const parsedCgpa = cgpa ? parseFloat(cgpa) : null;
      const safeCgpa = parsedCgpa !== null && !isNaN(parsedCgpa)
        ? Math.min(Math.max(parsedCgpa, 0), 99.99)
        : null;

      const existingProfileData = student.rawProfileData || {};
      const updatedProfileData = {
        ...existingProfileData,
        imported_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        has_problem_with_details: !markAsVerified,
        detail_problems: markAsVerified ? [] : (student.detailProblems || []),
      };

      const payload = {
        roll_number: rollNumber.trim(),
        full_name: fullName.trim() || "Unknown Student",
        email: email.trim() || null,
        phone: phone.trim() || null,
        department: department.trim() || "General",
        section: section.trim() || null,
        cgpa: safeCgpa,
        backlogs: parseInt(backlogs, 10) || 0,
        graduation_year: graduationYear ? parseInt(graduationYear, 10) : null,
        profile_data: updatedProfileData,
      };

      const res = await fetch(`/api/student_profiles/${encodeURIComponent(student.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || `Save failed (${res.status})`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Student Details</h2>
            <p className="text-xs text-slate-500">
              Update email, roll number, or any field that needed review
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Issue Banner if student has problem with details */}
          {student.hasProblemWithDetails && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">This student has problem with details</p>
                {student.detailProblems && student.detailProblems.length > 0 ? (
                  <ul className="list-disc list-inside mt-1 text-amber-800 space-y-0.5">
                    {student.detailProblems.map((prob, pi) => (
                      <li key={pi}>{prob}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5 text-amber-800">
                    Fields such as email or roll number need your attention. You can correct them below.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Arjun Sharma"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Roll Number / ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 21MBA01"
                required
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. arjun@college.edu"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department / Course
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. MBA, CSE, Marketing"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. A"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marks / CGPA / %
              </label>
              <input
                type="number"
                step="0.01"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                placeholder="0–100 or 0–10"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Active Backlogs
              </label>
              <input
                type="number"
                value={backlogs}
                onChange={(e) => setBacklogs(e.target.value)}
                min="0"
                placeholder="0"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Passout Year
              </label>
              <input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="e.g. 2025"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          {/* Verification check */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200/70 hover:bg-slate-100/70 transition-colors">
              <input
                type="checkbox"
                checked={markAsVerified}
                onChange={(e) => setMarkAsVerified(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">
                  Mark details as verified
                </span>
                <p className="text-[11px] text-slate-500">
                  Removes the &quot;This has problem with details&quot; warning badge
                </p>
              </div>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
