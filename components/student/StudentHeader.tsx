"use client";

import { Bell, Search, Command, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApiResource } from "@/lib/useApi";
import { STUDENT_PROFILE_KEY, useStudentProfile } from "@/lib/studentState";
import { Notification } from "@/lib/types";

interface StudentHeaderProps {
  title: string;
  subtitle?: string;
}

export function StudentHeader({ title, subtitle }: StudentHeaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [student] = useStudentProfile();
  const { data: notifications } = useApiResource<Notification[]>("notifications", {}, { fallback: [] });
  const unreadCount = (notifications ?? []).filter((item) => !item.read).length;
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  function search(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/companies?search=${encodeURIComponent(value)}`);
  }
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear the local profile and return to sign-in even if the network fails.
    } finally {
      localStorage.removeItem(STUDENT_PROFILE_KEY);
      router.replace("/student/login");
      router.refresh();
    }
  }
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={search} role="search" className="hidden sm:flex items-center gap-2 bg-slate-100/80 border border-slate-200/60 rounded-lg px-3 py-1.5 w-60">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search companies, drives, or roles"
              placeholder="Search companies, drives..."
              className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-full"
            />
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </form>

          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </Link>

          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs" title={`${student.name} · ${student.rollNumber}`}>
            {student.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
          </div>
          <button type="button" onClick={() => void signOut()} disabled={signingOut}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Sign out of student account" title="Sign out">
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
