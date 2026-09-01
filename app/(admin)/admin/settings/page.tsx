"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Settings, Shield, Sliders, CheckCircle2, Bell, Lock, Database } from "lucide-react";

export default function AdminSettingsPage() {
  const [collegeName, setCollegeName] = useState("National Institute of Technology & Engineering");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [minPlacementCGPA, setMinPlacementCGPA] = useState(6.0);
  const [allowMultiOffers, setAllowMultiOffers] = useState(true);
  const [autoReminderDays, setAutoReminderDays] = useState(2);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <AdminHeader
        title="Placement Cell Configuration"
        subtitle="Platform policies, academic year controls, and eligibility parameters"
      />

      <div className="p-6 max-w-4xl space-y-6">
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Placement operating policies successfully updated!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Institution Settings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900 text-base">
              <Settings className="w-4 h-4 text-indigo-600" />
              <span>Institutional Identity</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Active Academic Season</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Placement Policy Controls */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900 text-base">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Campus Hiring Policies & Eligibility Safeguards</span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Dream Offer Policy (Multiple Offers)</p>
                  <p className="text-slate-500 text-[11px]">Allow students placed below ₹10 LPA to apply for dream companies (&gt;₹20 LPA)</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowMultiOffers}
                  onChange={(e) => setAllowMultiOffers(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Automated Follow-up Reminders</p>
                  <p className="text-slate-500 text-[11px]">Dispatch notification to unconfirmed students before deadline</p>
                </div>
                <select
                  value={autoReminderDays}
                  onChange={(e) => setAutoReminderDays(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700"
                >
                  <option value={1}>1 day before</option>
                  <option value={2}>2 days before</option>
                  <option value={3}>3 days before</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Baseline Placement Registration CGPA</p>
                  <p className="text-slate-500 text-[11px]">Minimum cumulative GPA required to register on the placement platform</p>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={minPlacementCGPA}
                  onChange={(e) => setMinPlacementCGPA(Number(e.target.value))}
                  className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
            >
              Save Configuration Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
