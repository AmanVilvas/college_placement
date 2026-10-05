"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, Download, FileText, Image as ImageIcon, Loader2, Paperclip, Send, SmilePlus, X } from "lucide-react";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import type { CommunityCompany } from "@/lib/companyCommunityTypes";
import type { CommunityChatMessage } from "@/lib/companyCommunityChatTypes";

const maxFileBytes = 4 * 1024 * 1024;
const reactionEmojis = ["👍", "❤️", "😂", "👏", "🔥", "✅"];
const staffPreviewHeaders = { "x-placement-admin-preview": "1" };
const acceptedFiles = "image/png,image/jpeg,.png,.jpg,.jpeg,.pdf,.txt,.doc,.docx,.ppt,.pptx,.webp";
const stamp = (value: string) => new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const fileSize = (size?: number | null) => !size ? "Attachment" : size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

export function CompanyGroupChat({ company, isStaff }: { company: CommunityCompany; isStaff: boolean }) {
  const [messages, setMessages] = useState<CommunityChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [pollTopic, setPollTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pollMode, setPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [driveId, setDriveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [votingId, setVotingId] = useState("");
  const [reactionPickerId, setReactionPickerId] = useState("");
  const [reactingId, setReactingId] = useState("");
  const [error, setError] = useState("");
  const [viewerStudentId, setViewerStudentId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactionPendingRef = useRef(false);

  const loadMessages = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/community/messages?companyId=${encodeURIComponent(company.id)}`, { cache: "no-store", headers: isStaff ? staffPreviewHeaders : undefined });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not load the group chat.");
      setMessages(result.data ?? []); setViewerStudentId(result.viewer?.studentId ?? null); setError("");
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "Could not load the group chat.");
    } finally { if (!quiet) setLoading(false); }
  }, [company.id, isStaff]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadMessages(), 0);
    const timer = window.setInterval(() => void loadMessages(true), 7000);
    const onResourcePublished = () => void loadMessages(true);
    window.addEventListener("community-resource-published", onResourcePublished);
    return () => {
      window.clearTimeout(initialLoad); window.clearInterval(timer);
      window.removeEventListener("community-resource-published", onResourcePublished);
    };
  }, [loadMessages]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true); setError("");
    const form = new FormData();
    form.set("companyId", company.id); form.set("driveId", driveId); form.set("body", body.trim());
    if (file) form.set("file", file);
    if (pollMode) {
      form.set("type", "poll");
      form.set("topic", pollTopic.trim());
      form.set("options", JSON.stringify(pollOptions.map((option) => option.trim()).filter(Boolean)));
    }
    try {
      const response = await fetch("/api/community/messages", { method: "POST", body: form, headers: isStaff ? staffPreviewHeaders : undefined });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not send your message.");
      setBody(""); setPollTopic(""); setFile(null); setPollMode(false); setPollOptions(["", ""]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadMessages(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send your message."); }
    finally { setSending(false); }
  }

  async function vote(message: CommunityChatMessage, optionIndex: number) {
    setVotingId(message.id); setError("");
    try {
      const response = await fetch(`/api/community/messages/${encodeURIComponent(message.id)}/vote`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionIndex }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not submit your vote.");
      await loadMessages(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit your vote."); }
    finally { setVotingId(""); }
  }

  async function react(message: CommunityChatMessage, emoji: string) {
    if (isStaff || reactionPendingRef.current || message.reactions?.some((reaction) => reaction.mine)) return;
    reactionPendingRef.current = true;
    setReactingId(message.id); setError("");
    try {
      const response = await fetch(`/api/community/messages/${encodeURIComponent(message.id)}/reactions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not save your reaction.");
      const savedEmoji = result.data?.emoji;
      if (typeof savedEmoji === "string") {
        setMessages((current) => current.map((item) => {
          if (item.id !== message.id) return item;
          const reactions = item.reactions ?? [];
          const existing = reactions.find((reaction) => reaction.emoji === savedEmoji);
          return { ...item, reactions: existing
            ? reactions.map((reaction) => ({ ...reaction, mine: reaction.emoji === savedEmoji,
              count: reaction.emoji === savedEmoji && !reaction.mine ? reaction.count + 1 : reaction.count }))
            : [...reactions.map((reaction) => ({ ...reaction, mine: false })), { emoji: savedEmoji, count: 1, mine: true }] };
        }));
      }
      setReactionPickerId(""); await loadMessages(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your reaction."); }
    finally { reactionPendingRef.current = false; setReactingId(""); }
  }

  const selectedDrive = company.drives.find((drive) => drive.id === driveId);
  const addPollOption = () => setPollOptions((options) => options.length < 8 ? [...options, ""] : options);
  const updatePollOption = (index: number, value: string) => setPollOptions((options) => options.map((option, item) => item === index ? value : option));

  return <section className="flex h-[75vh] min-h-[560px] max-h-[820px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
      <CompanyLogo name={company.name} logoColor={company.metadata?.logoColor ?? "#334155"} logoUrl={company.logo_url ?? undefined} size="md" />
      <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold text-slate-900">{company.name} · Company group</h2><p className="truncate text-[11px] text-slate-500">{company.drives.length} active eligible drive{company.drives.length === 1 ? "" : "s"} · messages refresh automatically</p></div>
      <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 sm:inline">Campus group</span>
    </header>

    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-5">
      <div className="mx-auto max-w-md rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-center text-[11px] leading-5 text-indigo-900">
        General updates for {company.name} are visible to campus students. Updates for a specific drive are shown only to eligible students.
      </div>
      {loading && <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading group messages…</div>}
      {!loading && messages.length === 0 && <div className="py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm"><Send className="h-5 w-5"/></div><p className="mt-3 text-sm font-semibold text-slate-700">{isStaff ? "Start the conversation" : "No updates yet"}</p><p className="mt-1 text-xs text-slate-500">{isStaff ? "Share a placement update, preparation tip, file, or poll." : "Placement staff will post updates, resources, and polls here."}</p></div>}
      {messages.map((message) => {
        const fromStaff = message.author_role === "placement_staff";
        const isMine = message.is_mine ?? Boolean(viewerStudentId && message.author_student_id === viewerStudentId);
        const messageDrive = company.drives.find((drive) => drive.id === message.drive_id);
        const hasReacted = Boolean(message.reactions?.some((reaction) => reaction.mine));
        return <article key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[78%] ${isMine ? "rounded-tr-md bg-indigo-700 text-white" : "rounded-tl-md border border-slate-200 bg-white"}`}>
            <div className="mb-1 flex items-center gap-2"><span className={`text-[10px] font-bold ${isMine ? "text-indigo-100" : "text-indigo-700"}`}>{message.author_name}{fromStaff ? " · Placement team" : isMine ? " · You" : ""}</span>{messageDrive && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] text-indigo-700">{messageDrive.role_title}</span>}</div>
            {message.message_type === "resource" && <p className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${isMine ? "text-indigo-100" : "text-indigo-700"}`}>Shared resource</p>}
            {message.message_type === "resource" && message.resource_title && <p className={`mb-1 text-sm font-semibold ${isMine ? "text-white" : "text-slate-900"}`}>{message.resource_title}</p>}
            {message.message_type === "poll" ? <div className="min-w-[240px] sm:min-w-[300px]"><div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isMine ? "text-indigo-100" : "text-indigo-700"}`}><BarChart3 className="h-4 w-4"/>Poll · {message.poll_topic || "Community"}</div><p className={`mt-1.5 whitespace-pre-wrap text-sm font-semibold ${isMine ? "text-white" : "text-slate-900"}`}>{message.body}</p><div className="mt-3 space-y-2">{(message.poll_options ?? []).map((option, index) => {
              const count = message.poll_votes?.[index] ?? 0; const total = (message.poll_votes ?? []).reduce((sum, item) => sum + item, 0); const percent = total ? Math.round(count / total * 100) : 0;
              return <button key={`${message.id}-${index}`} onClick={() => void vote(message, index)} disabled={isStaff || votingId === message.id} className={`relative block w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs disabled:opacity-60 ${isMine ? "border-white/30 bg-indigo-600 text-white hover:bg-indigo-500" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-400"}`}><span className="absolute inset-y-0 left-0 bg-indigo-100/70" style={{ width: `${percent}%`, opacity: isMine ? 0.22 : 0.75 }}/><span className="relative flex items-center justify-between gap-3"><span>{option}{message.my_vote === index ? " · Your vote" : ""}</span><span className="tabular-nums">{count} · {percent}%</span></span></button>;
            })}</div><p className={`mt-2 text-[10px] ${isMine ? "text-indigo-100" : "text-slate-400"}`}>{totalLabel(message.poll_votes)} votes · tap an option to vote or change your vote</p></div>
            : message.body && <p className={`whitespace-pre-wrap break-words text-sm leading-5 ${isMine ? "text-white" : "text-slate-800"}`}>{message.body}</p>}
            {message.file_name && <a href={message.resource_id ? `/api/community/${encodeURIComponent(message.resource_id)}/download` : `/api/community/messages/${encodeURIComponent(message.id)}/file`} className={`mt-2 flex items-center gap-2 rounded-lg border p-2.5 ${isMine ? "border-white/20 bg-indigo-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 text-indigo-700">{message.content_type?.startsWith("image/") ? <ImageIcon className="h-4 w-4"/> : <FileText className="h-4 w-4"/>}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{message.file_name}</span><span className={`block text-[10px] ${isMine ? "text-indigo-100" : "text-slate-500"}`}>{fileSize(message.file_size)}</span></span><Download className="h-4 w-4 shrink-0"/></a>}
            <p className={`mt-1.5 text-right text-[9px] ${isMine ? "text-indigo-100" : "text-slate-400"}`}>{stamp(message.created_at)}</p>
            {(message.reactions?.length || !isStaff) ? <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {message.reactions?.map((reaction) => <button key={`${message.id}-${reaction.emoji}`} type="button" disabled={isStaff || hasReacted || Boolean(reactingId)} onClick={() => void react(message, reaction.emoji)} aria-label={`${reaction.emoji}, ${reaction.count} reactions${reaction.mine ? ", yours" : ""}`} className={`rounded-full border px-2 py-1 text-[10px] ${reaction.mine ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-600"}`}>{reaction.emoji} {reaction.count}</button>)}
              {!isStaff && !hasReacted && <div className="relative">
                <button type="button" disabled={Boolean(reactingId)} aria-label="React to message" onClick={() => setReactionPickerId((open) => open === message.id ? "" : message.id)} className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"><SmilePlus className="h-3.5 w-3.5"/></button>
                {reactionPickerId === message.id && <div className="absolute bottom-8 left-0 z-10 flex gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-lg">{reactionEmojis.map((emoji) => <button key={emoji} type="button" disabled={Boolean(reactingId)} onClick={() => void react(message, emoji)} aria-label={`React ${emoji}`} className="rounded-full p-1.5 text-base hover:bg-indigo-50">{emoji}</button>)}</div>}
              </div>}
              {!isStaff && hasReacted && <span className="text-[10px] text-slate-500">Your reaction is saved</span>}
            </div> : null}
          </div>
        </article>;
      })}
      <div />
    </div>

    <footer className="border-t border-slate-200 bg-white p-3 sm:p-4">
      {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
      {isStaff && driveId && <div className="mb-2 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] text-indigo-800"><span>Posting for {selectedDrive?.role_title ?? "selected drive"}</span><button onClick={() => setDriveId("")} aria-label="Remove drive audience"><X className="h-3.5 w-3.5"/></button></div>}
      {isStaff ? <>
      {file && <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><FileText className="h-4 w-4 text-indigo-600"/><span className="min-w-0 flex-1 truncate">{file.name} · {fileSize(file.size)}</span><button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} aria-label="Remove attachment"><X className="h-4 w-4 text-slate-500"/></button></div>}
      {pollMode && <div className="mb-3 space-y-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3.5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-indigo-950">Create a poll</p><p className="mt-0.5 text-[10px] text-slate-500">Give it a topic, ask one clear question, then add choices.</p></div><button type="button" onClick={() => { setPollMode(false); setBody(""); setPollTopic(""); }} aria-label="Close poll editor" className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4"/></button></div><label className="block text-[10px] font-semibold text-slate-700">Poll topic<input autoFocus value={pollTopic} onChange={(event) => setPollTopic(event.target.value)} maxLength={120} placeholder="Example: Infosys DSE preparation" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/><span className="mt-1 block font-normal text-slate-400">A short label students see above the poll question.</span></label><label className="block text-[10px] font-semibold text-slate-700">Poll question<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} maxLength={1000} placeholder="Example: Which topic should we cover in the next session?" className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/></label><div><p className="mb-1.5 text-[10px] font-semibold text-slate-700">Choices</p><div className="grid gap-2 sm:grid-cols-2">{pollOptions.map((option, index) => <input key={index} value={option} onChange={(event) => updatePollOption(index, event.target.value)} maxLength={160} placeholder={`Option ${index + 1}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400" />)}</div>{pollOptions.length < 8 && <button type="button" onClick={addPollOption} className="mt-2 text-[10px] font-semibold text-indigo-700 hover:underline">+ Add choice</button>}</div></div>}
      <form onSubmit={submitMessage} className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" accept={acceptedFiles} className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)}/>
        <button type="button" aria-label="Attach a file" onClick={() => fileInputRef.current?.click()} disabled={sending || pollMode} className="mb-1 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-700 disabled:opacity-40"><Paperclip className="h-5 w-5"/></button>
        {isStaff && <button type="button" aria-label="Create a poll" onClick={() => { setPollMode((active) => !active); setFile(null); }} disabled={sending} className={`mb-1 rounded-full p-2 hover:bg-indigo-50 ${pollMode ? "text-indigo-700" : "text-slate-500"}`}><BarChart3 className="h-5 w-5"/></button>}
        {!pollMode && <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={1} maxLength={30000} placeholder="Write a message to the group…" className="max-h-28 min-h-10 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white" />}
        {isStaff && !pollMode && company.drives.length > 0 && <select aria-label="Chat audience" value={driveId} onChange={(event) => setDriveId(event.target.value)} className="hidden max-w-40 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] sm:block"><option value="">All campus students</option>{company.drives.map((drive) => <option key={drive.id} value={drive.id}>{drive.role_title}</option>)}</select>}
        <button type="submit" disabled={sending || (pollMode ? !pollTopic.trim() || !body.trim() || pollOptions.filter((option) => option.trim()).length < 2 : !body.trim() && !file) || (file?.size ?? 0) > maxFileBytes} aria-label={pollMode ? "Publish poll" : "Send message"} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-white shadow-sm hover:bg-indigo-800 disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}</button>
      </form>
      <div className="mt-1.5 flex justify-between gap-2 text-[9px] text-slate-400"><span>Only placement staff can post · students can view, react, and vote in polls</span>{file && file.size > maxFileBytes && <span className="text-rose-600">Max file size is 4 MB</span>}</div>
      </> : <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500">Only placement staff can post in this group. You can react to updates and vote in polls.</p>}
    </footer>
  </section>;
}

function totalLabel(votes?: number[] | null) { return (votes ?? []).reduce((sum, item) => sum + item, 0); }
