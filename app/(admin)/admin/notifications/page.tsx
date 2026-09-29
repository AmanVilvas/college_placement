"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { notifications as initialNotifications } from "@/lib/data/notifications";
import { Notification, Branch, NotificationCategory } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Bell, Send, CheckCircle2, Megaphone, Clock, Star, Award, Info, Users } from "lucide-react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

const ALL_BRANCHES: Branch[] = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "MCA", "MBA"];

export default function AdminNotificationsPage() {
  const [notificationsList, setNotificationsList] = useLocalStorageState<Notification[]>("placement-helper:notifications", initialNotifications);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("New Drive");
  const [companyName, setCompanyName] = useState("");
  const [targetBranches, setTargetBranches] = useState<Branch[]>(["CSE", "IT"]);
  const [sentSuccess, setSentSuccess] = useState(false);

  const toggleBranch = (b: Branch) => {
    if (targetBranches.includes(b)) {
      setTargetBranches(targetBranches.filter((x) => x !== b));
    } else {
      setTargetBranches([...targetBranches, b]);
    }
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const newNotif: Notification = {
      id: "n_" + Date.now(),
      title,
      message,
      category,
      companyName: companyName || undefined,
      createdAt: new Date().toISOString(),
      read: false,
      targetBranches: targetBranches.length > 0 ? targetBranches : undefined,
    };

    setNotificationsList((current) => [newNotif, ...current]);
    setTitle("");
    setMessage("");
    setCompanyName("");
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 4000);
  };

  return (
    <div>
      <AdminHeader
        title="Campus Broadcast & Notifications"
        subtitle="Dispatch instant alerts, deadline warnings, and round shortlists to students"
      />

      <div className="p-6 space-y-6">
        {sentSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Announcement added to the local demo notification feed. No email or push message was sent.</span>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dispatch Form */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base pb-1 border-b border-slate-100">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              <span>Broadcast Announcement</span>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="New Drive">New Drive Announcement</option>
                  <option value="Deadline Reminder">Deadline Reminder</option>
                  <option value="Shortlist">Shortlist Announcement</option>
                  <option value="Interview">Interview Schedule</option>
                  <option value="Selection">Final Selection Announcement</option>
                  <option value="General">General Placement Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Company (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Microsoft, Amazon"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Headline Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microsoft SDE Shortlist Released"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed instructions, room locations, or external links..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Branches</label>
                <div className="flex flex-wrap gap-1">
                  {ALL_BRANCHES.map((b) => {
                    const sel = targetBranches.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBranch(b)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${sel ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200"}`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Alert Now
              </button>
            </form>
          </div>

          {/* History Feed */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Broadcast Dispatch History ({notificationsList.length})</h3>

            <div className="space-y-3">
              {notificationsList.map((notif) => (
                <div key={notif.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] bg-indigo-50 px-2 py-0.5 rounded">
                      {notif.category} {notif.companyName && `• ${notif.companyName}`}
                    </span>
                    <span className="text-slate-400">{formatDate(notif.createdAt)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  {notif.targetBranches && (
                    <div className="flex items-center gap-1 pt-1 text-[11px] text-slate-400">
                      <span>Delivered to:</span>
                      {notif.targetBranches.map((b) => (
                        <span key={b} className="font-semibold text-slate-600">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
