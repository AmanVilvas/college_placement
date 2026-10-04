"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, LoaderCircle, LockKeyhole, Trash2, Upload } from "lucide-react";

const categories = ["Aadhaar card", "PAN card", "Passport", "10th marksheet", "12th marksheet", "Caste certificate", "Domicile certificate", "Other"] as const;
type Category = (typeof categories)[number];
type StudentDocument = { id: string; category: Category; displayName: string; fileName: string; contentType: string; fileSize: number; createdAt: string };

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentDocuments() {
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<Category>(categories[0]);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");

  const loadDocuments = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/student/documents", { cache: "no-store", signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load your documents.");
      setDocuments(body.data as StudentDocument[]);
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setMessage(error.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { void loadDocuments(controller.signal); }, 0);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [loadDocuments]);

  async function add(file?: File) {
    if (!file) return;
    setMessage("");
    if (file.size > 10 * 1024 * 1024) { setMessage("Choose a document up to 10 MB."); return; }
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { setMessage("Choose a PDF, JPG or PNG document."); return; }
    if (category === "Other" && !displayName.trim()) { setMessage("Enter a name for this document."); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("category", category);
      form.set("displayName", displayName.trim());
      const response = await fetch("/api/student/documents", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not upload this document.");
      setDocuments((current) => [body.data as StudentDocument, ...current]);
      setDisplayName("");
      setMessage("Document uploaded securely.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not upload this document."); }
    finally { setBusy(false); }
  }

  async function download(document: StudentDocument) {
    setMessage("");
    try {
      const response = await fetch(`/api/student/documents/${encodeURIComponent(document.id)}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not download this document.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement("a");
      anchor.href = url; anchor.download = document.fileName; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not download this document."); }
  }

  async function remove(document: StudentDocument) {
    if (!window.confirm(`Delete ${document.displayName}? This permanently removes the uploaded file.`)) return;
    setMessage("");
    try {
      const response = await fetch(`/api/student/documents/${encodeURIComponent(document.id)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not delete this document.");
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setMessage("Document deleted.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete this document."); }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-red-50 p-2.5 text-red-700"><LockKeyhole className="h-5 w-5"/></div><div><h3 className="font-bold text-slate-900">Student documents</h3><p className="mt-1 text-xs leading-5 text-slate-500">Securely store identity documents and academic certificates. Uploaded files are private and visible to your placement-office administrators.</p></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(190px,0.7fr)_minmax(0,1fr)]">
      <label className="text-xs font-semibold text-slate-600">Document type<select value={category} onChange={(event) => setCategory(event.target.value as Category)} disabled={busy} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      {category === "Other" && <label className="text-xs font-semibold text-slate-600">Document name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} disabled={busy} placeholder="e.g. Income certificate" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>}
    </div>
    <label className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 ${busy ? "pointer-events-none opacity-60" : ""}`}>
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}{busy ? "Uploading securely…" : "Choose a PDF, JPG or PNG · 10 MB max"}
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" disabled={busy} onChange={(event) => { void add(event.target.files?.[0]); event.target.value = ""; }}/>
    </label>
    {message && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{message}</p>}
    <div className="mt-4 space-y-2">
      {loading ? <div role="status" aria-label="Loading saved documents" className="h-16 animate-pulse rounded-xl bg-slate-100"/> : documents.map((document) => <article key={document.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><FileText className="h-4 w-4 shrink-0 text-red-600"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{document.displayName}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{document.fileName} · {formatSize(document.fileSize)} · {new Date(document.createdAt).toLocaleDateString()}</p></div><button type="button" onClick={() => void download(document)} aria-label={`Download ${document.displayName}`} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:text-red-700"><Download className="h-3.5 w-3.5"/></button><button type="button" onClick={() => void remove(document)} aria-label={`Delete ${document.displayName}`} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5"/></button></article>)}
      {!loading && documents.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No documents uploaded yet.</p>}
    </div>
    <p className="mt-4 text-[10px] leading-4 text-slate-400">Upload only documents requested for placement or verification. Do not enter ID numbers into document names.</p>
  </section>;
}
