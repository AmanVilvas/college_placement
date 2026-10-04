"use client";

import { useEffect, useState } from "react";
import { Download, FileText, LockKeyhole, LoaderCircle } from "lucide-react";

type AdminDocument = { id: string; category: string; displayName: string; fileName: string; contentType: string; fileSize: number; createdAt: string };
function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminStudentDocuments({ studentId }: { studentId: string }) {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/students/${encodeURIComponent(studentId)}/documents`, {
      cache: "no-store", signal: controller.signal, headers: { "x-placement-admin-preview": "1" },
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load student documents.");
      setDocuments(body.data as AdminDocument[]);
    }).catch((cause: Error) => { if (cause.name !== "AbortError") setError(cause.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [studentId]);

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-red-50 p-2.5 text-red-700"><LockKeyhole className="h-5 w-5"/></div><div><h2 className="text-base font-bold text-slate-900">Student documents</h2><p className="mt-1 text-xs text-slate-500">Private files uploaded by this student. Access is limited to authorized placement-office staff.</p></div></div>
    {loading && <div role="status" className="mt-4 flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin"/>Loading documents…</div>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
    {!loading && !error && documents.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No documents uploaded by this student.</p>}
    {!loading && documents.length > 0 && <div className="mt-4 divide-y divide-slate-100">{documents.map((document) => <div key={document.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"><FileText className="h-4 w-4 shrink-0 text-red-600"/><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-800">{document.displayName}<span className="ml-2 font-normal text-slate-400">{document.category}</span></p><p className="mt-0.5 truncate text-[10px] text-slate-500">{document.fileName} · {formatSize(document.fileSize)} · Uploaded {new Date(document.createdAt).toLocaleDateString()}</p></div><a href={`/api/admin/students/${encodeURIComponent(studentId)}/documents/${encodeURIComponent(document.id)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-3.5 w-3.5"/>Download</a></div>)}</div>}
  </section>;
}
