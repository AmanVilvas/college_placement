"use client";

import { useState } from "react";
import { Download, FileText, LoaderCircle, Trash2, Upload } from "lucide-react";
import { downloadLocalFile, removeLocalFile, saveLocalFile } from "@/lib/localFiles";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

type LocalDocument = { id: string; name: string; key: string; addedAt: string };

export function LocalDocumentChecklist() {
  const [documents, setDocuments] = useLocalStorageState<LocalDocument[]>("placement-helper:workspace-documents:s1", []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function add(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setMessage("Choose a document smaller than 10 MB."); return; }
    setBusy(true); setMessage("");
    const id = crypto.randomUUID();
    const key = `workspace-document:${id}`;
    try {
      await saveLocalFile(key, file);
      setDocuments((current) => [{ id, name: file.name, key, addedAt: new Date().toISOString() }, ...current]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this file."); }
    finally { setBusy(false); }
  }

  async function remove(document: LocalDocument) {
    try { await removeLocalFile(document.key); } catch { /* Remove its checklist row even if the file was already cleared. */ }
    setDocuments((current) => current.filter((item) => item.id !== document.id));
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600"/><h3 className="font-bold text-slate-900">My documents</h3></div>
    <p className="mt-1 text-xs text-slate-500">Files are stored in this browser only; the placement office cannot see or verify them.</p>
    <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-5 text-xs font-semibold text-slate-600 hover:bg-slate-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}Choose a document (10 MB max)<input type="file" className="sr-only" disabled={busy} onChange={(event) => { void add(event.target.files?.[0]); event.target.value = ""; }}/></label>
    {message && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{message}</p>}
    <div className="mt-4 space-y-2">{documents.map((document) => <article key={document.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"><FileText className="h-4 w-4 shrink-0 text-indigo-500"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{document.name}</p><p className="text-[10px] text-slate-500">Saved {new Date(document.addedAt).toLocaleDateString()}</p></div><button onClick={() => void downloadLocalFile(document.key).catch((error: Error) => setMessage(error.message))} aria-label={`Download ${document.name}`} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600"><Download className="h-3.5 w-3.5"/></button><button onClick={() => void remove(document)} aria-label={`Remove ${document.name}`} className="rounded-lg border border-slate-200 bg-white p-2 text-rose-600"><Trash2 className="h-3.5 w-3.5"/></button></article>)}{documents.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No documents saved in this browser yet.</p>}</div>
  </section>;
}
