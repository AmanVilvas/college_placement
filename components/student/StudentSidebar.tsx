"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { UniversityLogo } from "@/components/shared/UniversityLogo";
import { useState } from "react";
import { studentNavItems as navItems, isNavigationActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useStudentProfile } from "@/lib/studentState";
import { StudentAvatar } from "@/components/shared/StudentAvatar";

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const [student] = useStudentProfile();
  return (
    <div className="flex h-full flex-col border-r border-slate-200/70 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <UniversityLogo className="h-9 max-w-[180px]" />
        </Link>
      </div>
      <nav aria-label="Student pages" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <span className="mb-1.5 block px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Navigation</span>
        {navItems.map((item) => {
          const isActive = isNavigationActive(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} onClick={onNavigate} className={cn("nav-item", isActive && "active")}><item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" /><span className="flex-1">{item.label}</span></Link>;
        })}
      </nav>
      <div className="border-t border-slate-100 bg-slate-50/50 p-3">
        <Link href="/profile" onClick={onNavigate} className="group flex items-center gap-2.5 rounded-xl border border-transparent p-2 transition-all hover:border-slate-200/80 hover:bg-white">
          <StudentAvatar name={student.name} avatarUrl={student.avatarUrl} className="h-8 w-8 text-xs"/>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800 transition-colors group-hover:text-red-600">{student.name}</p><p className="truncate text-[10px] text-slate-400">{student.rollNumber} · {student.branch}-{student.section}</p></div>
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
