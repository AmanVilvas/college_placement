"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, FileText, CalendarDays, Bell, User, GraduationCap,
  Menu, X, Sparkles,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useStudentProfile } from "@/lib/studentState";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/applications", label: "My Applications", icon: FileText },
  { href: "/drives", label: "Upcoming Drives", icon: CalendarDays },
  { href: "/workspace", label: "Career Workspace", icon: Sparkles },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "My Profile", icon: User },
];

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const [student] = useStudentProfile();
  return (
    <div className="flex h-full flex-col border-r border-slate-200/70 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm"><GraduationCap className="h-4 w-4" /></div>
          <div><span className="block text-sm font-bold leading-tight tracking-tight text-slate-900">PlacementOS</span><span className="block text-[10px] font-medium text-slate-400">Student Workspace</span></div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <span className="mb-1.5 block px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Navigation</span>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("nav-item", isActive && "active")}><item.icon className="h-4 w-4 flex-shrink-0" /><span className="flex-1">{item.label}</span></Link>;
        })}
      </nav>
      <div className="border-t border-slate-100 bg-slate-50/50 p-3">
        <Link href="/change-password" onClick={onNavigate} className="mb-2 block px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">Change password</Link>
        <Link href="/profile" onClick={onNavigate} className="group flex items-center gap-2.5 rounded-xl border border-transparent p-2 transition-all hover:border-slate-200/80 hover:bg-white">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-sm">{student.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800 transition-colors group-hover:text-indigo-600">{student.name}</p><p className="truncate text-[10px] text-slate-400">{student.rollNumber} · {student.branch}-{student.section}</p></div>
        </Link>
      </div>
    </div>
  );
}

export function StudentSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);
  return <>
    <aside className="sticky top-0 hidden h-screen w-[240px] flex-shrink-0 flex-col lg:flex"><SidebarContent pathname={pathname} onNavigate={close} /></aside>
    <button aria-label="Open student navigation" className="fixed left-3 top-3 z-40 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-4 w-4" /></button>
    {mobileOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="Close student navigation" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} /><div className="relative flex w-[240px] flex-col bg-white shadow-2xl"><div className="absolute right-3 top-3 z-10"><button aria-label="Close menu" onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><SidebarContent pathname={pathname} onNavigate={close} /></div></div>}
  </>;
}
