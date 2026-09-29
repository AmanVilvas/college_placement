"use client";

import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { StudentHeader } from "@/components/student/StudentHeader";
import { notifications as initialNotifications } from "@/lib/data/notifications";
import { formatDateTime } from "@/lib/utils";
import { Bell, Building2, Clock, Star, Award, Info } from "lucide-react";

const CATEGORY_ICONS: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  "New Drive": { icon: Building2, color: "text-indigo-600", bg: "bg-indigo-100" },
  "Deadline Reminder": { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
  "Shortlist": { icon: Star, color: "text-purple-600", bg: "bg-purple-100" },
  "Interview": { icon: Bell, color: "text-blue-600", bg: "bg-blue-100" },
  "Selection": { icon: Award, color: "text-emerald-600", bg: "bg-emerald-100" },
  "General": { icon: Info, color: "text-slate-500", bg: "bg-slate-100" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useLocalStorageState("placement-helper:notifications", initialNotifications);
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div>
      <StudentHeader title="Notifications" subtitle={`${unread.length} unread notifications`} />
      <div className="p-6 space-y-6">
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
                      <div key={notif.id} className="bg-white rounded-xl border border-indigo-100 shadow-sm p-4 flex gap-4">
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
                        <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1" />
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{formatDateTime(notif.createdAt)}</p>
                      <button onClick={() => setNotifications((current) => current.map((item) => item.id === notif.id ? { ...item, read: true } : item))} className="mt-2 text-[10px] font-semibold text-indigo-700">Mark as read</button>
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
