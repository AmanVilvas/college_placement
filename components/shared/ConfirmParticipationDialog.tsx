"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X, AlertCircle } from "lucide-react";
import { Drive } from "@/lib/types";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { useStudentProfile } from "@/lib/studentState";

interface ConfirmParticipationDialogProps {
  drive: Drive;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ConfirmationFormData) => boolean | void | Promise<boolean | void>;
  initialData?: Partial<ConfirmationFormData>;
}

export interface ConfirmationFormData {
  fullName: string;
  rollNumber: string;
  classYear: string;
  section: string;
  branch: string;
  degree: string;
  specialization: string;
  collegeEmail: string;
  phone: string;
  resumeUrl: string;
  applicationReferenceId: string;
  confirmed: boolean;
}

const INITIAL_FORM: ConfirmationFormData = {
  fullName: "",
  rollNumber: "",
  classYear: "",
  section: "",
  branch: "",
  degree: "",
  specialization: "",
  collegeEmail: "",
  phone: "",
  resumeUrl: "",
  applicationReferenceId: "",
  confirmed: false,
};

interface StudentProfileDetails {
  name?: string | null;
  rollNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  branch?: string | null;
  section?: string | null;
  year?: string | null;
  classYear?: string | null;
  graduationYear?: number | string | null;
  degree?: string | null;
  specialization?: string | null;
  resumeUrl?: string | null;
}

function formatYear(year?: string | number | null, graduationYear?: string | number | null) {
  const value = Number(year);
  if (Number.isInteger(value) && value >= 1 && value <= 8) {
    const suffix = value % 100 >= 11 && value % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] || "th";
    return `${value}${suffix} year`;
  }
  return graduationYear ? `${graduationYear} batch` : "";
}

export function ConfirmParticipationDialog({
  drive,
  isOpen,
  onClose,
  onConfirm,
  initialData,
}: ConfirmParticipationDialogProps) {
  const [form, setForm] = useState<ConfirmationFormData>(INITIAL_FORM);
  const [student] = useStudentProfile();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState("");
  const [profileResume, setProfileResume] = useState("");
  const [changeResume, setChangeResume] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ConfirmationFormData>>({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    // Reset this form each time the dialog opens for a new drive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const initialize = (profile: StudentProfileDetails = {}) => {
      const savedResume = profile.resumeUrl || student.resumeUrl || initialData?.resumeUrl || "";
      setForm({
        ...INITIAL_FORM,
        ...initialData,
        fullName: profile.name || student.name || initialData?.fullName || "",
        rollNumber: profile.rollNumber || student.rollNumber || initialData?.rollNumber || "",
        classYear: profile.classYear || formatYear(profile.year || student.year, profile.graduationYear || student.graduationYear)
          || initialData?.classYear || "",
        section: profile.section || student.section || initialData?.section || "",
        branch: profile.specialization || profile.branch || student.branch || initialData?.specialization || "",
        degree: profile.degree || initialData?.degree || "",
        specialization: profile.specialization || profile.branch || student.branch || initialData?.specialization || "",
        collegeEmail: profile.email || student.email || initialData?.collegeEmail || "",
        phone: profile.phone || student.phone || initialData?.phone || "",
        resumeUrl: savedResume,
        confirmed: false,
      });
      setProfileResume(savedResume);
      setChangeResume(!savedResume);
    };
    const controller = new AbortController();
    setProfileLoading(true);
    setProfileLoadError("");
    initialize({
      name: student.name, rollNumber: student.rollNumber, email: student.email, phone: student.phone,
      branch: student.branch, section: student.section, year: student.year,
      graduationYear: student.graduationYear, resumeUrl: student.resumeUrl,
    });
    fetch("/api/student/profile", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load your profile.");
        initialize(body.data as StudentProfileDetails);
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setProfileLoadError("Some fields could not be refreshed from your profile. Check them before submitting.");
      })
      .finally(() => { if (!controller.signal.aborted) setProfileLoading(false); });
    setSubmitted(false);
    setErrors({});
    setSubmitError("");
    return () => controller.abort();
    // initialData is intentionally read only when opening; its parent passes a render-local object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, drive.id]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Partial<Record<keyof ConfirmationFormData, string>> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.rollNumber.trim()) errs.rollNumber = "Roll number is required";
    if (!form.classYear.trim()) errs.classYear = "Class / year is required";
    if (!form.section.trim()) errs.section = "Section is required";
    if (!form.degree.trim()) errs.degree = "Degree is required";
    if (!form.specialization.trim()) errs.specialization = "Specialization is required";
    if (!form.collegeEmail.trim() || !form.collegeEmail.includes("@")) errs.collegeEmail = "Valid college email required";
    if (!/^\+?[0-9 ()-]{10,18}$/.test(form.phone.trim()) || form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a valid phone number";
    if (!form.resumeUrl.trim()) errs.resumeUrl = "Resume Google Drive link is required";
    else if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(form.resumeUrl.trim())) errs.resumeUrl = "Paste a Google Drive or Docs share link";
    if (!form.confirmed) errs.confirmed = "Please check the confirmation box";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs as Partial<ConfirmationFormData>);
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const accepted = await onConfirm({ ...form, branch: form.specialization });
      if (accepted === false) {
        setSubmitError("We could not save your participation. Check the drive details and try again.");
        return;
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save your participation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <CompanyLogo
              name={drive.companyName}
              logoColor={drive.companyLogoColor}
              logoUrl={drive.companyLogoUrl}
              size="sm"
            />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Confirm Participation</h2>
              <p className="text-xs text-slate-500">{drive.companyName} • {drive.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Application Confirmed ✓</h3>
            <p className="text-slate-500 text-sm mb-2">
              Your participation for <strong>{drive.companyName}</strong> – {drive.role} has been recorded.
            </p>
            <p className="text-slate-400 text-xs mb-6">
              Your registration is saved to the placement database and appears under My Applications. Your status is now <strong>Confirmed</strong>.
            </p>
            <button
              onClick={onClose}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Info Banner */}
            <div className="flex gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Submit your student details here so the placement team can record your participation. You can also
                apply separately on the official company portal.
              </p>
            </div>

            {/* Form Fields */}
            {profileLoading && <p role="status" className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Loading your latest profile details…</p>}
            {profileLoadError && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{profileLoadError}</p>}
            <fieldset disabled={profileLoading} className="grid grid-cols-2 gap-4 disabled:opacity-70">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="As per college records"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 transition-colors ${errors.fullName ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.rollNumber}
                  onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value }))}
                  placeholder="Your campus roll number"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 transition-colors ${errors.rollNumber ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.rollNumber && <p className="text-xs text-red-500 mt-1">{errors.rollNumber}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Class / Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.classYear}
                  readOnly
                  placeholder="e.g. 3rd year or 2027 batch"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors ${errors.classYear ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}
                />
                {errors.classYear && <p className="text-xs text-red-500 mt-1">{errors.classYear}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.section}
                  readOnly
                  placeholder="e.g. A"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors ${errors.section ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}
                />
                {errors.section && <p className="text-xs text-red-500 mt-1">{errors.section}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Degree <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.degree}
                  onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))}
                  placeholder="e.g. B.Tech"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 transition-colors ${errors.degree ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.degree && <p className="text-xs text-red-500 mt-1">{errors.degree}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.specialization}
                  onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value, branch: e.target.value }))}
                  placeholder="e.g. Computer Science"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 transition-colors ${errors.specialization ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.specialization && <p className="text-xs text-red-500 mt-1">{errors.specialization}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  College Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.collegeEmail}
                  onChange={(e) => setForm((f) => ({ ...f, collegeEmail: e.target.value }))}
                  placeholder="you@college.edu"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 transition-colors ${errors.collegeEmail ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.collegeEmail && <p className="text-xs text-red-500 mt-1">{errors.collegeEmail}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="10-digit mobile"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 transition-colors ${errors.phone ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              {/* Google Drive resume link */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Resume Google Drive Link <span className="text-red-500">*</span>
                </label>
                {profileResume && !changeResume && (
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <a href={profileResume} target="_blank" rel="noopener noreferrer" className="max-w-[65%] truncate text-sm font-medium text-red-700 underline">Resume saved in profile</a>
                    <button type="button" onClick={() => setChangeResume(true)} className="text-xs font-semibold text-red-700 hover:underline">Change for this application</button>
                  </div>
                )}
                <input
                  type="url"
                  hidden={Boolean(profileResume && !changeResume)}
                  value={form.resumeUrl}
                  onChange={(e) => setForm((f) => ({ ...f, resumeUrl: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/..."
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 transition-colors ${errors.resumeUrl ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {profileResume && changeResume && <button type="button" onClick={() => { setForm((current) => ({ ...current, resumeUrl: profileResume })); setChangeResume(false); }} className="mt-1 text-[11px] font-semibold text-red-700 hover:underline">Use profile resume</button>}
                {!profileResume && <p className="mt-1 text-[11px] text-slate-500">Add a Google Drive share link to <a href="/profile" className="font-semibold text-red-700 underline">My Profile</a> to reuse it next time.</p>}
                {errors.resumeUrl && <p className="text-xs text-red-500 mt-1">{errors.resumeUrl}</p>}
              </div>

              {/* Optional Reference ID */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Application / Reference ID{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={form.applicationReferenceId}
                  onChange={(e) => setForm((f) => ({ ...f, applicationReferenceId: e.target.value }))}
                  placeholder="Reference ID from the official portal (if available)"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-400 transition-colors"
                />
              </div>
            </fieldset>

            {/* Confirmation Checkbox */}
            <div className={`flex gap-3 p-3 rounded-xl border ${errors.confirmed ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
              <input
                type="checkbox"
                id="confirm-check"
                checked={form.confirmed}
                onChange={(e) => setForm((f) => ({ ...f, confirmed: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-red-600 flex-shrink-0"
              />
              <label htmlFor="confirm-check" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
                I confirm that I want the placement team to record my participation for{" "}
                <strong>{drive.companyName} – {drive.role}</strong> and am submitting these details for placement records.
              </label>
            </div>
            {errors.confirmed && <p className="text-xs text-red-500">{errors.confirmed}</p>}

            {submitError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{submitError}</p>}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? "Saving…" : "Submit Participation Details"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
