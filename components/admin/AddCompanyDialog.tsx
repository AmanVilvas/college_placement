"use client";

import { useState } from "react";
import { X, Building2, Plus, Globe, FileText, CheckCircle } from "lucide-react";
import { Company } from "@/lib/types";

interface AddCompanyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (company: Partial<Company>) => void;
}

export function AddCompanyDialog({ isOpen, onClose, onAdd }: AddCompanyDialogProps) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id: "c_" + Date.now(),
      name,
      website: website.startsWith("http") ? website : `https://${website}`,
      industry,
      description,
      logoColor: color,
      drives: [],
    });
    setName("");
    setWebsite("");
    setDescription("");
    onClose();
  };

  const presetColors = ["#00a4ef", "#ff9900", "#86bc25", "#007cc3", "#002d72", "#4285f4", "#9d2449", "#6366f1", "#10b981", "#ec4899"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Partner Company</h2>
              <p className="text-xs text-slate-500">Register a recruiting organization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Microsoft, Google, Goldman Sachs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Website URL</label>
              <input
                type="text"
                placeholder="https://company.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Industry Domain</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="Technology">Technology / SaaS</option>
                <option value="E-Commerce / Cloud">E-Commerce / Cloud</option>
                <option value="Consulting">Consulting / Advisory</option>
                <option value="Finance / Fintech">Finance / Fintech</option>
                <option value="IT Services">IT Services & Solutions</option>
                <option value="Core Engineering">Core Engineering</option>
                <option value="Analytics">Data & Analytics</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Brand Theme Color</label>
            <div className="flex items-center gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">About Organization</label>
            <textarea
              rows={3}
              placeholder="Brief summary of company background, hiring history, or special notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
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
              <Plus className="w-4 h-4" /> Add Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
