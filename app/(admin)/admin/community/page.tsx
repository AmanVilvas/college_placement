"use client";

import { useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CompanyGroupChat } from "@/components/community/CompanyGroupChat";
import { useApiResource } from "@/lib/useApi";
import type { CommunityCompany } from "@/lib/companyCommunityTypes";
import { Loader2, Send, UploadCloud } from "lucide-react";

const maxFileSize = 4 * 1024 * 1024;

export default function AdminCommunityPage() {
  const { data, error, refetch } = useApiResource<CommunityCompany[]>("community", {}, { fallback: [] });
  const companies = useMemo(() => data ?? [], [data]);
  const [chatCompanyId, setChatCompanyId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [driveId, setDriveId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const selectedCompany = companies.find((company) => company.id === companyId);
  const chatCompany = companies.find((company) => company.id === chatCompanyId) ?? companies[0];

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setMessageError(false);
    const form = new FormData();
    form.set("companyId", companyId); form.set("driveId", driveId); form.set("title", title); form.set("body", body);
    if (file) form.set("file", file);
    try {
      const response = await fetch("/api/community", { method: "POST", body: form, headers: { ...(window.location.pathname.startsWith("/admin") ? { "x-placement-admin-preview": "1" } : {}) } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      setTitle(""); setBody(""); setFile(null); setDriveId("");
      const input = document.getElementById("community-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refetch();
      window.dispatchEvent(new Event("community-resource-published"));
      setMessage("Resource posted in the company chat for the selected audience.");
    } catch (cause) { setMessageError(true); setMessage(cause instanceof Error ? cause.message : "Could not publish this resource."); }
    finally { setSaving(false); }
  }

  return <div>
    <AdminHeader title="Company Community" subtitle="Share campus company updates and resources for eligible drive groups" />
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-7">
      {message && <p role={messageError ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${messageError ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Could not load community data: {error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><UploadCloud className="h-5 w-5"/></div><div><h2 className="font-bold text-slate-900">Post a resource in the chat</h2><p className="mt-0.5 text-xs text-slate-500">Notes and attachments appear in the same company conversation as messages and polls.</p></div></div>
        <form onSubmit={publish} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">Company<select required value={companyId} onChange={(event) => { setCompanyId(event.target.value); setDriveId(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Choose a company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-700">Audience group<select value={driveId} onChange={(event) => setDriveId(event.target.value)} disabled={!selectedCompany} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="">All campus students</option>{(selectedCompany?.drives ?? []).map((drive) => <option key={drive.id} value={drive.id}>{drive.role_title}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Title<input required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Interview preparation notes" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Note or instructions<textarea rows={5} maxLength={30000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share preparation details, reminders, or other company-specific information." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Attach a file (optional)<input id="community-file" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg,.pdf,.txt,.doc,.docx,.ppt,.pptx" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); }} className="mt-1.5 block w-full rounded-xl border border-slate-200 p-2 text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700"/><span className="mt-1 block text-[10px] font-normal text-slate-500">PNG, JPG, PDF, Word, PowerPoint, or TXT · maximum 4 MB{file ? ` · Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)` : ""}</span>{file && file.size > maxFileSize && <span role="alert" className="mt-1 block text-[10px] text-rose-700">This file is larger than 4 MB.</span>}</label>
          <div className="sm:col-span-2"><button type="submit" disabled={saving || !companyId || (file?.size ?? 0) > maxFileSize} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}{saving ? "Posting…" : "Post to chat"}</button></div>
        </form>
      </section>

      <section className="space-y-3"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-base font-bold text-slate-900">Company group chats</h2><p className="text-xs text-slate-500">Post placement updates, share attachments, or create a poll. Students can view, react, and vote in polls.</p></div><label className="text-xs font-semibold text-slate-700">Open group<select value={chatCompany?.id ?? ""} onChange={(event) => setChatCompanyId(event.target.value)} className="ml-2 min-w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal"><option value="">Choose company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label></div>
        {chatCompany && <CompanyGroupChat key={chatCompany.id} company={chatCompany} isStaff/>}
      </section>

    </div>
  </div>;
}
