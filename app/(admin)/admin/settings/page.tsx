"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Settings, Shield, Sliders, CheckCircle2, Bell, Lock, Database } from "lucide-react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import Link from "next/link";

const initialSettings = {
  collegeName: "National Institute of Technology & Engineering",
  academicYear: "2025-2026",
  activeCampus: "Main Campus",
  minPlacementCGPA: 6.0,
  allowMultiOffers: true,
  autoReminderDays: 2,
  publicPlacementProfile: false,
  rolePermissions: {
    "Super Admin": { users: true, drives: true, analytics: true },
    "College Admin / TPO": { users: true, drives: true, analytics: true },
    "Department Coordinator": { users: true, drives: false, analytics: false },
    Faculty: { users: true, drives: false, analytics: false },
    Student: { users: false, drives: false, analytics: false },
    Recruiter: { users: false, drives: true, analytics: false },
    Interviewer: { users: false, drives: false, analytics: false },
    Alumni: { users: false, drives: false, analytics: false },
  },
};
const roleNames = Object.keys(initialSettings.rolePermissions) as Array<keyof typeof initialSettings.rolePermissions>;
const capabilities = [
  { key: "users", label: "View student records" },
  { key: "drives", label: "Manage hiring workflow" },
  { key: "analytics", label: "View placement analytics" },
] as const;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useLocalStorageState("placement-helper:settings", initialSettings);
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
                  value={settings.collegeName}
                  onChange={(e) => setSettings((current) => ({ ...current, collegeName: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Active Academic Season</label>
                <input
                  type="text"
                  value={settings.academicYear}
                  onChange={(e) => setSettings((current) => ({ ...current, academicYear: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Active Campus</label>
                <input
                  type="text"
                  value={settings.activeCampus}
                  onChange={(e) => setSettings((current) => ({ ...current, activeCampus: e.target.value }))}
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
                  checked={settings.allowMultiOffers}
                  onChange={(e) => setSettings((current) => ({ ...current, allowMultiOffers: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Automated Follow-up Reminders</p>
                  <p className="text-slate-500 text-[11px]">Dispatch notification to unconfirmed students before deadline</p>
                </div>
                <select
                  value={settings.autoReminderDays}
                  onChange={(e) => setSettings((current) => ({ ...current, autoReminderDays: Number(e.target.value) }))}
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
                  value={settings.minPlacementCGPA}
                  onChange={(e) => setSettings((current) => ({ ...current, minPlacementCGPA: Number(e.target.value) }))}
                  className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900 text-base">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Public placement profile</span>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
              <span><b className="block">Enable public placement page preview</b><span className="mt-1 block text-slate-500">Displays only the local sample statistics; no page is published externally.</span></span>
              <input type="checkbox" checked={settings.publicPlacementProfile} onChange={(e) => setSettings((current) => ({ ...current, publicPlacementProfile: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
            </label>
            <p className="text-[10px] leading-4 text-amber-800">Role access, tenant isolation, audit enforcement, and secure storage require server-side authentication and authorization.</p>
            <Link href="/placements" className="inline-flex rounded-lg bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white">Preview placement profile</Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-slate-900 text-base">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Role access preview</span>
            </div>
            <p className="text-xs leading-5 text-slate-500">Configure a sample permission matrix for the platform roles. These browser settings do not enforce access control or protect routes.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead><tr className="border-b border-slate-100 text-slate-500"><th className="py-2 pr-3">Role</th>{capabilities.map((item) => <th key={item.key} className="px-3 py-2 font-semibold">{item.label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-50">{roleNames.map((role) => <tr key={role}><th className="py-2.5 pr-3 font-medium text-slate-700">{role}</th>{capabilities.map((item) => <td key={item.key} className="px-3 py-2.5"><input aria-label={`${role}: ${item.label}`} type="checkbox" checked={settings.rolePermissions[role][item.key]} onChange={(event) => setSettings((current) => ({ ...current, rolePermissions: { ...current.rolePermissions, [role]: { ...current.rolePermissions[role], [item.key]: event.target.checked } } }))} className="h-4 w-4 accent-indigo-600" /></td>)}</tr>)}</tbody>
              </table>
            </div>
            <p className="text-[10px] leading-4 text-amber-800">Production RBAC needs authenticated identities and server-side authorization checks on every data action.</p>
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
