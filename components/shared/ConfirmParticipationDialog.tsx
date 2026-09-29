"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Upload, X, AlertCircle } from "lucide-react";
import { Drive } from "@/lib/types";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { saveLocalFile } from "@/lib/localFiles";

interface ConfirmParticipationDialogProps {
  drive: Drive;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ConfirmationFormData) => boolean | void;
  initialData?: Partial<ConfirmationFormData>;
  onResumeUploaded?: (fileName: string) => void;
}

export interface ConfirmationFormData {
  fullName: string;
  rollNumber: string;
  section: string;
  branch: string;
  collegeEmail: string;
  phone: string;
  resumeFileName: string;
  applicationReferenceId: string;
  confirmed: boolean;
}

const INITIAL_FORM: ConfirmationFormData = {
  fullName: "",
  rollNumber: "",
  section: "",
  branch: "",
  collegeEmail: "",
  phone: "",
  resumeFileName: "",
  applicationReferenceId: "",
  confirmed: false,
};

export function ConfirmParticipationDialog({
  drive,
  isOpen,
  onClose,
  onConfirm,
  initialData,
  onResumeUploaded,
}: ConfirmParticipationDialogProps) {
  const [form, setForm] = useState<ConfirmationFormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<ConfirmationFormData>>({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...INITIAL_FORM, ...initialData, confirmed: false });
    setSubmitted(false);
    setErrors({});
    setSubmitError("");
  }, [isOpen, drive.id]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Partial<Record<keyof ConfirmationFormData, string>> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.rollNumber.trim()) errs.rollNumber = "Roll number is required";
    if (!form.section.trim()) errs.section = "Section is required";
    if (!form.branch.trim()) errs.branch = "Branch is required";
    if (!form.collegeEmail.trim() || !form.collegeEmail.includes("@")) errs.collegeEmail = "Valid college email required";
    if (!/^\+?[0-9 ()-]{10,18}$/.test(form.phone.trim()) || form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a valid phone number";
    if (!form.resumeFileName.trim()) errs.resumeFileName = "Please upload your resume";
    if (!form.confirmed) errs.confirmed = "Please check the confirmation box";
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs as Partial<ConfirmationFormData>);
      return;
    }
    const accepted = onConfirm(form);
    if (accepted === false) {
      setSubmitError("Registration could not be completed. Check that the drive is open, you are eligible, and your profile details match.");
      return;
    }
    setSubmitted(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(file.name)) {
      setErrors((err) => ({ ...err, resumeFileName: "Choose a PDF or DOC/DOCX file smaller than 5 MB." }));
      return;
    }
    try {
      await saveLocalFile("student-resume:s1", file);
      setForm((f) => ({ ...f, resumeFileName: file.name }));
      setErrors((err) => ({ ...err, resumeFileName: "" }));
      onResumeUploaded?.(file.name);
    } catch (error) {
      setErrors((err) => ({ ...err, resumeFileName: error instanceof Error ? error.message : "Could not save this file locally." }));
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
              Your registration is saved under My Applications in this browser. Your status is now <strong>Confirmed</strong>.
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
                After completing your application on the official portal, submit this form so the placement
                team can track your participation. This does <strong>not</strong> replace the official application.
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="As per college records"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-colors ${errors.fullName ? "border-red-300 bg-red-50" : "border-slate-200"}`}
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
                  placeholder="e.g. 21CSE102"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-colors ${errors.rollNumber ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.rollNumber && <p className="text-xs text-red-500 mt-1">{errors.rollNumber}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-colors ${errors.section ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                >
                  <option value="">Select section</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                </select>
                {errors.section && <p className="text-xs text-red-500 mt-1">{errors.section}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.branch}
                  onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-colors ${errors.branch ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                >
                  <option value="">Select branch</option>
                  {["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {errors.branch && <p className="text-xs text-red-500 mt-1">{errors.branch}</p>}
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
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-colors ${errors.collegeEmail ? "border-red-300 bg-red-50" : "border-slate-200"}`}
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
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-colors ${errors.phone ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              {/* Resume Upload */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Resume <span className="text-red-500">*</span>
                </label>
                <label className={`flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors ${errors.resumeFileName ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {form.resumeFileName || "Click to upload PDF / DOC (max 5MB)"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                {errors.resumeFileName && <p className="text-xs text-red-500 mt-1">{errors.resumeFileName}</p>}
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
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className={`flex gap-3 p-3 rounded-xl border ${errors.confirmed ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
              <input
                type="checkbox"
                id="confirm-check"
                checked={form.confirmed}
                onChange={(e) => setForm((f) => ({ ...f, confirmed: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
              />
              <label htmlFor="confirm-check" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
                I confirm that I have completed the official application for{" "}
                <strong>{drive.companyName} – {drive.role}</strong> on the official portal, and I am
                submitting this form to inform the placement team of my participation.
              </label>
            </div>
            {errors.confirmed && <p className="text-xs text-red-500">{errors.confirmed}</p>}

            {submitError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{submitError}</p>}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              I&apos;ve Applied • Confirm Participation
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
