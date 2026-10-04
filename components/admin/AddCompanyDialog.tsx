"use client";

import { useState } from "react";
import {
  X, Building2, Plus, Globe, Trash2, ImagePlus,
  MapPin, User, DollarSign, GraduationCap, Briefcase, Phone,
  CheckCircle2, Loader2,
} from "lucide-react";
import { CompanyLogo } from "@/components/shared/CompanyLogo";

interface CustomField {
  key: string;
  value: string;
  id: string;
}

interface AddCompanyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (company: Record<string, unknown>) => Promise<void> | void;
}

const PRESET_COLORS = [
  "#00a4ef", "#ff9900", "#86bc25", "#007cc3", "#002d72",
  "#4285f4", "#9d2449", "#b91c1c", "#10b981", "#ec4899",
  "#f97316", "#8b5cf6", "#14b8a6", "#ef4444", "#0ea5e9",
];

const INDUSTRIES = [
  "Technology / SaaS", "E-Commerce / Cloud", "Consulting / Advisory",
  "Finance / Fintech / Banking", "IT Services & Solutions",
  "Core Engineering", "Data & Analytics", "Healthcare / Pharma",
  "Automobile / Manufacturing", "FMCG / Retail", "Telecom",
  "Media & Entertainment", "Government / PSU", "Other",
];

const inputCls =
  "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all bg-white";

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-widest pb-1">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

export function AddCompanyDialog({ isOpen, onClose, onAdd }: AddCompanyDialogProps) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("Technology / SaaS");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [processingLogo, setProcessingLogo] = useState(false);
  const [color, setColor] = useState("#b91c1c");
  const [position, setPosition] = useState("");
  const [qualification, setQualification] = useState("");
  const [stipend, setStipend] = useState("");
  const [ctc, setCtc] = useState("");
  const [location, setLocation] = useState("");
  const [spoc, setSpoc] = useState("");
  const [trainerDetails, setTrainerDetails] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  function addCustomField() {
    setCustomFields((f) => [...f, { key: "", value: "", id: Date.now().toString() }]);
  }

  function removeCustomField(id: string) {
    setCustomFields((f) => f.filter((cf) => cf.id !== id));
  }

  function updateCustomField(id: string, field: "key" | "value", val: string) {
    setCustomFields((f) => f.map((cf) => (cf.id === id ? { ...cf, [field]: val } : cf)));
  }

  function resetForm() {
    setName(""); setWebsite(""); setIndustry("Technology / SaaS"); setDescription("");
    setLogoUrl(""); setLogoError(null); setProcessingLogo(false);
    setColor("#b91c1c"); setPosition(""); setQualification(""); setStipend("");
    setCtc(""); setLocation(""); setSpoc(""); setTrainerDetails(""); setCustomFields([]);
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setLogoError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("The image must be under 5 MB.");
      return;
    }

    setProcessingLogo(true);
    setLogoError(null);
    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(320 / image.width, 320 / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not process this image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
      if (!blob) throw new Error("Could not process this image.");
      if (blob.type !== "image/webp") throw new Error("This browser could not resize the image. Try a different browser.");
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read this image."));
        reader.onerror = () => reject(new Error("Could not read this image."));
        reader.readAsDataURL(blob);
      });
      setLogoUrl(dataUrl);
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Could not process this image.");
    } finally {
      setProcessingLogo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const extraFields: Record<string, string> = {};
    customFields.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) extraFields[key.trim()] = value.trim();
    });

    const payload: Record<string, unknown> = {
      name: name.trim(),
      logo_url: logoUrl || null,
      website: website.trim()
        ? (website.startsWith("http") ? website.trim() : `https://${website.trim()}`)
        : null,
      industry,
      description: description.trim() || null,
      metadata: {
        logoColor: color,
        position: position.trim() || null,
        qualification: qualification.trim() || null,
        stipend: stipend.trim() || null,
        ctc: ctc.trim() || null,
        location: location.trim() || null,
        spoc: spoc.trim() || null,
        trainer_details: trainerDetails.trim() || null,
        extra_fields: Object.keys(extraFields).length > 0 ? extraFields : null,
      },
    };

    try {
      await onAdd(payload);
      resetForm();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save this company. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50/60 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors"
              style={{ backgroundColor: color + "22", border: `2px solid ${color}44` }}
            >
              <Building2 className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Recruiting Company</h2>
              <p className="text-xs text-slate-500">All details visible to students immediately</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {submitError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {submitError}
              </p>
            )}

            {/* SECTION 1: Company Identity */}
            <div className="space-y-4">
              <SectionHeader icon={Building2} label="Company Identity" />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input type="text" required placeholder="Enter company name"
                  value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="company.com" value={website}
                      onChange={(e) => setWebsite(e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Industry Domain</label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Company logo <span className="font-normal text-slate-400">(optional)</span></span>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <CompanyLogo name={name || "Company"} logoColor={color} logoUrl={logoUrl || undefined} size="md" />
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700">
                    <ImagePlus className="h-4 w-4" />
                    {processingLogo ? "Preparing image…" : logoUrl ? "Replace image" : "Upload image"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleLogoChange(event)} disabled={processingLogo || isSubmitting} className="sr-only" />
                  </label>
                  {logoUrl && <button type="button" onClick={() => { setLogoUrl(""); setLogoError(null); }} className="text-xs font-medium text-slate-500 hover:text-red-700">Remove image</button>}
                  <span className="text-[11px] text-slate-500">JPG, PNG, or WebP · up to 5 MB</span>
                </div>
                {logoError && <p role="alert" className="mt-1.5 text-xs text-red-700">{logoError}</p>}
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Images are resized before saving. Without a logo, the company name initials are shown.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Brand Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" title={c} onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${color === c ? "scale-125 ring-2 ring-offset-2 ring-slate-500" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    className="w-7 h-7 rounded-full cursor-pointer border-2 border-slate-200 p-0.5" title="Custom color" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* SECTION 2: Opportunity Details */}
            <div className="space-y-4">
              <SectionHeader icon={Briefcase} label="Opportunity Details" />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Position(s) / Role Title</label>
                <textarea rows={2}
                  placeholder="e.g. Graduate Engineer Trainee&#10;&#8226; Software Application Analyst Intern&#10;&#8226; Data Analyst / Data Engineer Intern"
                  value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls + " resize-none"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Qualification</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="e.g. BTech CSE 2027 Batch" value={qualification}
                      onChange={(e) => setQualification(e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location(s)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="e.g. Jaipur / Mumbai" value={location}
                      onChange={(e) => setLocation(e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Stipend</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="e.g. Rs.15,000/month - 6 months" value={stipend}
                      onChange={(e) => setStipend(e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">CTC / Package</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="e.g. Rs.5 LPA + Performance Bonus" value={ctc}
                      onChange={(e) => setCtc(e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* SECTION 3: Contacts & Notes */}
            <div className="space-y-4">
              <SectionHeader icon={User} label="Contacts & Notes" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Operations SPOC</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="e.g. Ms. Deepanshi" value={spoc}
                      onChange={(e) => setSpoc(e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trainer Details</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="e.g. Ms. Kirti, Mr. Rahul Kamboj" value={trainerDetails}
                      onChange={(e) => setTrainerDetails(e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">About / Description</label>
                <textarea rows={2} placeholder="Brief company background, hiring history, or notes..."
                  value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls + " resize-none"} />
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* SECTION 4: Dynamic Extra Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <Plus className="w-3.5 h-3.5" />
                  Additional Fields
                </div>
                <button type="button" onClick={addCustomField}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100">
                  <Plus className="w-3.5 h-3.5" /> Add More Field
                </button>
              </div>
              {customFields.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">
                  Click Add More Field to add Bond Period, Selection Process, etc.
                </p>
              ) : (
                <div className="space-y-2">
                  {customFields.map((cf) => (
                    <div key={cf.id} className="flex items-center gap-2">
                      <input type="text" placeholder="Field name (e.g. Bond Period)" value={cf.key}
                        onChange={(e) => updateCustomField(cf.id, "key", e.target.value)}
                        className="flex-[2] border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 bg-white" />
                      <input type="text" placeholder="Value" value={cf.value}
                        onChange={(e) => updateCustomField(cf.id, "value", e.target.value)}
                        className="flex-[3] border border-slate-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 bg-white" />
                      <button type="button" onClick={() => removeCustomField(cf.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex-shrink-0 sticky bottom-0">
            <button type="button" onClick={() => { resetForm(); onClose(); }} disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-red-200/60 transition-colors flex items-center gap-2">
              {isSubmitting
                ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>)
                : (<><CheckCircle2 className="w-4 h-4" /> Add Company</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
