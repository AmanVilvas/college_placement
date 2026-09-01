"use client";

import { Bell, Search, Plus, Command } from "lucide-react";
import Link from "next/link";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function AdminHeader({ title, subtitle, action }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 border border-slate-200/60 rounded-lg px-3 py-1.5 w-56">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              placeholder="Search students, companies..."
              className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full"
            />
          </div>

          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {action.label}
              </button>
            )
          )}

          <Link
            href="/admin/notifications"
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </Link>

          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-xs">
            PO
          </div>
        </div>
      </div>
    </header>
  );
}
