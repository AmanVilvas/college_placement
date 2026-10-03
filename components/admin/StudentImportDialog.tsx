"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Download, Loader2, X, ChevronDown, ChevronUp, Info,
  Pencil, CheckCheck, AlertCircle, FileCheck2, Filter
} from "lucide-react";
import { parseStudentFile, validateRows, prepareForImport, ValidatedRow } from "@/lib/parseStudentFile";
import { importStudents } from "@/lib/useApi";

interface ImportResult {
  successCount: number;
  errorCount: number;
  results: { roll_number: string; status: string; error?: string }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";

/** Standard editable fields shown in the inline fix panel */
const EDITABLE_FIELDS: { key: string; label: string; type?: string; placeholder?: string }[] = [
  { key: "roll_number", label: "Roll Number / ID", placeholder: "e.g. 21CSE001 or STU-001" },
  { key: "full_name",   label: "Full Name",   placeholder: "e.g. Rahul Sharma" },
  { key: "email",       label: "Email Address", type: "email", placeholder: "e.g. rahul@college.edu" },
  { key: "phone",       label: "Phone / Contact", placeholder: "e.g. 9876543210" },
  { key: "department",  label: "Department / Course", placeholder: "e.g. MBA, CSE, Marketing" },
  { key: "cgpa",        label: "Marks / CGPA / %", type: "number", placeholder: "e.g. 8.5 or 85" },
  { key: "tenth_percent",   label: "10th %",   type: "number", placeholder: "0–100" },
  { key: "twelfth_percent", label: "12th %",   type: "number", placeholder: "0–100" },
  { key: "section",         label: "Section",  placeholder: "e.g. A" },
  { key: "graduation_year", label: "Pass-out Year", type: "number", placeholder: "e.g. 2025" },
];

export function StudentImportDialog({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep]           = useState<Step>("upload");
  const [file, setFile]           = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showAll, setShowAll]      = useState(false);
  const [filterProblemOnly, setFilterProblemOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload"); setFile(null); setValidatedRows([]);
    setEditingIdx(null); setEditValues({}); setImportResult(null);
    setParseError(null); setImportError(null); setShowAll(false);
    setFilterProblemOnly(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const processFile = useCallback(async (f: File) => {
    setFile(f); setParseError(null);
    try {
      const rows = await parseStudentFile(f);
      const validated = validateRows(rows);
      setValidatedRows(validated);
      setStep("preview");
    } catch (err) {
      setParseError((err as Error).message);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  };

  /** Start editing a row */
  const startEdit = (idx: number) => {
    const vr = validatedRows[idx];
    const vals: Record<string, string> = {};
    EDITABLE_FIELDS.forEach(({ key }) => {
      vals[key] = vr.row[key] !== undefined && vr.row[key] !== null ? String(vr.row[key]) : "";
    });
    setEditValues(vals);
    setEditingIdx(idx);
  };

  /** Commit edits back into validatedRows and re-validate */
  const commitEdit = (idx: number) => {
    setValidatedRows((prev) => {
      const next = [...prev];
      const targetRow = { ...next[idx].row };

      EDITABLE_FIELDS.forEach(({ key, type }) => {
        const val = editValues[key]?.trim() ?? "";
        if (val === "") {
          delete targetRow[key];
        } else if (type === "number") {
          const num = parseFloat(val);
          targetRow[key] = isNaN(num) ? val : num;
        } else {
          targetRow[key] = val;
        }
      });

      // Re-run validation for updated row
      const [revalidated] = validateRows([targetRow]);
      next[idx] = {
        ...revalidated,
        rowIndex: next[idx].rowIndex,
      };
      return next;
    });
    setEditingIdx(null);
  };

  const handleImport = async () => {
    const rows = prepareForImport(validatedRows);
    if (rows.length === 0) return;
    setStep("importing"); setImportError(null);
    try {
      const result = await importStudents(rows);
      setImportResult(result); setStep("done");
    } catch (err) {
      setImportError((err as Error).message); setStep("preview");
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Roll No", "Full Name", "Email", "Phone", "Department",
      "CGPA", "10th Percentage", "12th Percentage", "Section", "Passout Year"
    ];
    const sample = ["21MBA01", "Arjun Sharma", "arjun@college.edu", "9876543210", "MBA Finance", "82.5", "88", "84", "A", "2025"];
    const csv = [headers.join(","), sample.join(",")].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "student_flexible_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const problemRows = validatedRows.filter((vr) => vr.hasProblemWithDetails);
  const cleanRows   = validatedRows.filter((vr) => !vr.hasProblemWithDetails);
  const activeRows  = filterProblemOnly ? problemRows : validatedRows;
  const displayRows = showAll ? activeRows : activeRows.slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Import Student Data</h2>
              <p className="text-xs text-slate-500">Flexible schema: works with any list (even 4-5 columns) • No forceful blocks</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ───── Step: Upload ───── */}
          {step === "upload" && (
            <>
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Flexible schema:</strong> Even if your new sheet has only <strong>4-5 columns</strong>, we adapt automatically. If any detail looks wrong, you can write it or edit later.
                  </span>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ml-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Sample
                </button>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">{isDragging ? "Drop your file here" : "Click to upload or drag & drop"}</p>
                <p className="text-sm text-slate-400 mt-1">.xlsx, .xls, or .csv — up to 2,000 students per batch</p>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Supported column variations (automatically recognized)</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Roll No / ID / S.No",
                    "Name / Name Student / Candidate",
                    "Email Id of Student / Mail",
                    "Contact No / Mobile",
                    "Branch / Dept / Specialization",
                    "CGPA / Overall % in Bachelor",
                    "10th % / 12th %",
                    "Any custom columns (saved in profile)"
                  ].map((col) => (
                    <span key={col} className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  All custom and extra columns (Father&apos;s Name, Address, Category, etc.) are automatically stored in each student&apos;s profile data.
                </p>
              </div>
            </>
          )}

          {/* ───── Step: Preview ───── */}
          {step === "preview" && (
            <>
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <p className="text-2xl font-bold text-slate-900">{validatedRows.length}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total In Sheet</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-2xl font-bold text-emerald-700">{cleanRows.length}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">✓ Ready & Clean</p>
                </div>
                <div
                  onClick={() => setFilterProblemOnly(!filterProblemOnly)}
                  className={`rounded-xl p-3 text-center border cursor-pointer transition-colors ${
                    filterProblemOnly
                      ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400"
                      : problemRows.length > 0
                      ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <p className={`text-2xl font-bold ${problemRows.length > 0 ? "text-amber-700" : "text-slate-300"}`}>
                    {problemRows.length}
                  </p>
                  <p className={`text-[11px] mt-0.5 flex items-center justify-center gap-1 ${problemRows.length > 0 ? "text-amber-700 font-semibold" : "text-slate-400"}`}>
                    <AlertTriangle className="w-3 h-3" />
                    Has problem with details
                    <span className="text-[10px] underline ml-0.5">({filterProblemOnly ? "show all" : "filter"})</span>
                  </p>
                </div>
              </div>

              {/* Informational Guidance Banner */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">
                    No forceful blocking — you can write the details now or edit later:
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    If an email, roll number, or any field doesn&apos;t look right, it is addressed below with{" "}
                    <span className="font-bold underline decoration-amber-500">this has problem with details</span>.
                    You can click <strong>&quot;Write Details&quot;</strong> to fill them right away, or simply import all students now and edit them anytime later in the Student Directory.
                  </p>
                </div>
              </div>

              {/* Table of Rows */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-full">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Roll No / ID</div>
                    <div className="col-span-3">Student Name</div>
                    <div className="col-span-3">Email / Contact</div>
                    <div className="col-span-2 text-right">Option</div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                  {displayRows.map((vr, idx) => {
                    const isEditing = editingIdx === idx;
                    const hasProblem = vr.hasProblemWithDetails;

                    return (
                      <div
                        key={idx}
                        className={`transition-colors ${
                          hasProblem ? "bg-amber-50/50 hover:bg-amber-50" : "bg-white hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Summary Line */}
                        <div className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-xs">
                          <div className="col-span-1 font-mono text-slate-400 text-[11px]">
                            {vr.rowIndex}
                          </div>
                          <div className="col-span-3 font-mono font-medium text-slate-800 truncate">
                            {String(vr.row.roll_number ?? "—")}
                          </div>
                          <div className="col-span-3 font-medium text-slate-800 truncate">
                            {String(vr.row.full_name ?? "—")}
                          </div>
                          <div className="col-span-3 text-slate-500 truncate">
                            {vr.row.email ? String(vr.row.email) : vr.row.phone ? String(vr.row.phone) : "—"}
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <button
                              onClick={() => (isEditing ? commitEdit(idx) : startEdit(idx))}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                                isEditing
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                  : hasProblem
                                  ? "bg-amber-200 text-amber-900 hover:bg-amber-300"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {isEditing ? (
                                <>
                                  <CheckCheck className="w-3.5 h-3.5" /> Save
                                </>
                              ) : (
                                <>
                                  <Pencil className="w-3.5 h-3.5" /> Write Details
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Problem with details callout tags */}
                        {!isEditing && hasProblem && (
                          <div className="px-4 pb-2.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              This has problem with details:
                            </span>
                            {vr.warnings.map((w, wi) => (
                              <span
                                key={wi}
                                className="inline-flex items-center text-[11px] bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-md"
                              >
                                {w.message.replace(/^This has problem with details:\s*/, "")}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Inline Form to Write / Edit Student Details */}
                        {isEditing && (
                          <div className="mx-4 mb-3.5 bg-white border-2 border-indigo-200 rounded-xl p-4 shadow-md">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                                Write / Edit details for student #{vr.rowIndex}
                              </p>
                              <span className="text-[11px] text-slate-400">
                                Not forcefully required — you can also save and edit later
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {EDITABLE_FIELDS.map(({ key, label, type, placeholder }) => {
                                const issue = vr.warnings.find((w) => w.field === key);
                                return (
                                  <div key={key}>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                                      <span>{label}</span>
                                      {issue && (
                                        <span className="text-amber-600 text-[10px] font-normal">
                                          ⚠ Needs review
                                        </span>
                                      )}
                                    </label>
                                    <input
                                      type={type ?? "text"}
                                      value={editValues[key] ?? ""}
                                      onChange={(e) =>
                                        setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
                                      }
                                      placeholder={placeholder}
                                      className={`w-full text-xs px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                                        issue ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"
                                      }`}
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                              <p className="text-[11px] text-slate-500">
                                Click &quot;Save Details&quot; to apply your changes right to this list.
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditingIdx(null)}
                                  className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => commitEdit(idx)}
                                  className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" /> Save Details
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeRows.length > 8 && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="w-full py-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-1.5 border-t border-slate-100"
                  >
                    {showAll
                      ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                      : <><ChevronDown className="w-3.5 h-3.5" /> Show all {activeRows.length} rows ({activeRows.length - 8} more)</>
                    }
                  </button>
                )}
              </div>

              {importError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}
            </>
          )}

          {/* ───── Step: Importing ───── */}
          {step === "importing" && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900">Importing student records…</p>
                <p className="text-sm text-slate-500 mt-1">Storing all columns and flags in database</p>
              </div>
            </div>
          )}

          {/* ───── Step: Done ───── */}
          {step === "done" && importResult && (
            <>
              <div className="flex flex-col items-center py-6 gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${importResult.errorCount === 0 ? "bg-emerald-100" : "bg-amber-100"}`}>
                  {importResult.errorCount === 0
                    ? <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                    : <AlertTriangle className="w-9 h-9 text-amber-600" />
                  }
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900 text-lg">Import Finished</p>
                  <p className="text-sm text-slate-500 mt-1">
                    <span className="text-emerald-600 font-semibold">{importResult.successCount} saved to database</span>
                    {importResult.errorCount > 0 && (
                      <span className="text-red-500 font-semibold"> · {importResult.errorCount} failed</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Students with details needing review are tagged in the Student Directory where you can edit them anytime.
                  </p>
                </div>
              </div>
              {importResult.errorCount > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">Failed Records</div>
                  <div className="divide-y divide-red-50 max-h-40 overflow-y-auto">
                    {importResult.results.filter((r) => r.status === "error").map((r, i) => (
                      <div key={i} className="px-3 py-2 text-xs flex items-center gap-3 text-red-700">
                        <span className="font-mono">{r.roll_number}</span>
                        <span className="text-red-400">{r.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-5 border-t border-slate-100 flex-shrink-0">
          {step === "preview" && (
            <>
              <button
                onClick={reset}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleImport}
                disabled={validatedRows.length === 0}
                className="flex-2 flex-grow py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                <FileCheck2 className="w-4 h-4" />
                Import All {validatedRows.length} Students
                {problemRows.length > 0 && (
                  <span className="bg-indigo-700/60 px-2 py-0.5 rounded text-xs text-indigo-100 font-normal">
                    ({problemRows.length} can be edited later)
                  </span>
                )}
              </button>
            </>
          )}
          {step === "done" && (
            <>
              <button onClick={reset} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                Import More
              </button>
              <button
                onClick={() => { onSuccess(); handleClose(); }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
              >
                Go to Student Directory
              </button>
            </>
          )}
          {(step === "upload" || step === "importing") && (
            <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
