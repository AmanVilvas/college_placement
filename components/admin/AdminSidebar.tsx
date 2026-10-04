"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { UniversityLogo } from "@/components/shared/UniversityLogo";
import { useState } from "react";
import { adminNavGroups as navGroups, isNavigationActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useApiResource } from "@/lib/useApi";

function SidebarContent({ pathname, onNavigate, followUpCount }: { pathname: string; onNavigate: () => void; followUpCount: number }) {
  return (
    <div className="flex h-full flex-col border-r border-slate-200/70 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <Link href="/admin/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <UniversityLogo className="h-9 max-w-[180px]" />
        </Link>
      </div>
      <nav aria-label="Placement office pages" className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => <div key={group.label}><span className="mb-1.5 block px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</span><div className="space-y-0.5">{group.items.map((item) => {
          const isActive = isNavigationActive(pathname, item.href);
          const badge = item.href === "/admin/followups" && followUpCount > 0 ? (followUpCount > 99 ? "99+" : String(followUpCount)) : undefined;
          return <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} onClick={onNavigate} className={cn("nav-item justify-between", isActive && "active")}><div className="flex items-center gap-2.5"><item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" /><span>{item.label}</span></div>{badge && <span className={cn("rounded-full border px-1.5 py-0.2 text-[10px] font-bold", isActive ? "border-red-200 bg-red-50 text-red-700" : "border-red-200/70 bg-red-50 text-red-600")}>{badge}</span>}</Link>;
        })}</div></div>)}
      </nav>
      <div className="border-t border-slate-100 bg-slate-50/50 p-3"><div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2 shadow-xs"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">PO</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">Placement Officer</p><p className="truncate text-[10px] text-slate-400">Admin Console</p></div></div></div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: followUps } = useApiResource<unknown[]>("followups", {}, { fallback: [] });
  const followUpCount = followUps?.length ?? 0;
  const close = () => setMobileOpen(false);
  return <>
    <aside className="sticky top-0 hidden h-screen w-[240px] flex-shrink-0 flex-col lg:flex"><SidebarContent pathname={pathname} onNavigate={close} followUpCount={followUpCount} /></aside>
    <button aria-label="Open placement office navigation" className="fixed left-3 top-3 z-40 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-4 w-4" /></button>
    {mobileOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="Close placement office navigation" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} /><div className="relative flex w-[240px] flex-col bg-white shadow-2xl"><div className="absolute right-3 top-3 z-10"><button aria-label="Close menu" onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><SidebarContent pathname={pathname} onNavigate={close} followUpCount={followUpCount} /></div></div>}
  </>;
}
