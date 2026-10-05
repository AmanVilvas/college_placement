"use client";

import { useEffect } from "react";

import { DataSkeleton } from "@/components/shared/DataSkeleton";
import { apiMutate, useApiResource } from "@/lib/useApi";
import { StudentHeader } from "@/components/student/StudentHeader";
import { formatDateTime } from "@/lib/utils";
import { Bell, Building2, Clock, Star, Award, Info } from "lucide-react";
import Link from "next/link";
import { Notification } from "@/lib/types";

const CATEGORY_ICONS: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  "Placement update": { icon: Info, color: "text-red-600", bg: "bg-red-100" },
  "New Drive": { icon: Building2, color: "text-red-600", bg: "bg-red-100" },
  "Deadline Reminder": { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
  "Shortlist": { icon: Star, color: "text-purple-600", bg: "bg-purple-100" },
  "Interview": { icon: Bell, color: "text-blue-600", bg: "bg-blue-100" },
  "Selection": { icon: Award, color: "text-emerald-600", bg: "bg-emerald-100" },
  "General": { icon: Info, color: "text-slate-500", bg: "bg-slate-100" },
};

export default function NotificationsPage() {
  const { data: notificationRows, loading, error, refetch } = useApiResource<Notification[]>("notifications", {}, { fallback: [] });
  const notifications = notificationRows ?? [];
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void refetch(); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [refetch]);

  async function markRead(id: string) {
    try { await apiMutate("PATCH", "notifications", { id, read: true }); await refetch(); window.dispatchEvent(new Event("notifications-updated")); } catch { /* retain current list; refresh can surface server state */ }
  }

  async function markAllRead() {
    await Promise.all(unread.map((notification) => apiMutate("PATCH", "notifications", { id: notification.id, read: true })));
    await refetch();
    window.dispatchEvent(new Event("notifications-updated"));
  }

  return (
    <div>
      <StudentHeader title="Notifications" subtitle={`${unread.length} unread notifications`} />
      <div className="p-6 space-y-6">
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
        {loading && <DataSkeleton label="Loading notifications…" count={4} />}
        {unread.length > 0 && <button onClick={() => void markAllRead()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Mark all as read</button>}
        {unread.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Unread ({unread.length})
            </h2>
            <div className="space-y-3">
              {unread.map((notif) => {
                const cat = CATEGORY_ICONS[notif.category] || CATEGORY_ICONS["General"];
                const Icon = cat.icon;
                return (
                      <div key={notif.id} className="bg-white rounded-xl border border-red-100 shadow-sm p-4 flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
                            {notif.category}
                            {notif.companyName && ` • ${notif.companyName}`}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 mt-0.5">{notif.title}</h3>
                        </div>
                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{formatDateTime(notif.createdAt)}</p>
                      {notif.communityCompanyId ? <Link href={`/community?companyId=${encodeURIComponent(notif.communityCompanyId)}`} className="mt-2 mr-3 inline-block text-[10px] font-semibold text-red-700 hover:underline">View company community →</Link> : notif.driveId && <Link href={`/companies/${notif.driveId}`} className="mt-2 inline-block text-[10px] font-semibold text-red-700 hover:underline">View related drive →</Link>}
                      <button onClick={() => void markRead(notif.id)} className="mt-2 text-[10px] font-semibold text-red-700">Mark as read</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {read.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Earlier
            </h2>
            <div className="space-y-3">
              {read.map((notif) => {
                const cat = CATEGORY_ICONS[notif.category] || CATEGORY_ICONS["General"];
                const Icon = cat.icon;
                return (
                  <div key={notif.id} className="bg-white rounded-xl border border-slate-100 p-4 flex gap-4 opacity-75">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
                        {notif.category}
                        {notif.companyName && ` • ${notif.companyName}`}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-700 mt-0.5">{notif.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{formatDateTime(notif.createdAt)}</p>
                      {notif.communityCompanyId ? <Link href={`/community?companyId=${encodeURIComponent(notif.communityCompanyId)}`} className="mt-2 inline-block text-[10px] font-semibold text-red-700 hover:underline">View company community →</Link> : notif.driveId && <Link href={`/companies/${notif.driveId}`} className="mt-2 inline-block text-[10px] font-semibold text-red-700 hover:underline">View related drive →</Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!loading && notifications.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Bell className="mx-auto h-8 w-8 text-slate-300"/><h2 className="mt-3 font-semibold text-slate-800">You’re all caught up</h2><p className="mt-1 text-xs text-slate-500">New placement updates will appear here.</p></div>}
      </div>
    </div>
  );
}
