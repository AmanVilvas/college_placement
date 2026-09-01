"use client";

import { Bell, Search, Command } from "lucide-react";
import Link from "next/link";

interface StudentHeaderProps {
  title: string;
  subtitle?: string;
}

export function StudentHeader({ title, subtitle }: StudentHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 border border-slate-200/60 rounded-lg px-3 py-1.5 w-60">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              placeholder="Search companies, drives..."
              className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full"
            />
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>

          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
          </Link>

          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
            RS
          </div>
        </div>
      </div>
    </header>
  );
}
