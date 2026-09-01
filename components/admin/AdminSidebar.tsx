"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, CalendarDays, Users, FileText,
  AlertCircle, UserCheck, BarChart3, Bell, Settings,
  GraduationCap, Menu, X, Shield,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { href: "/admin/companies", label: "Companies", icon: Building2 },
      { href: "/admin/drives", label: "Placement Drives", icon: CalendarDays },
      { href: "/admin/students", label: "Students", icon: Users },
      { href: "/admin/applications", label: "Applications", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/followups", label: "Follow-ups", icon: AlertCircle, badge: "5" },
      { href: "/admin/placed", label: "Placed Students", icon: UserCheck },
    ],
  },
  {
    label: "Reporting",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/notifications", label: "Broadcasts", icon: Bell },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/70">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">PlacementOS</span>
            <span className="text-[10px] text-slate-400 block font-medium">Placement Cell</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2.5 mb-1.5 block">
              {group.label}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn("nav-item justify-between", isActive && "active")}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.2 rounded-full",
                          isActive ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-600 border border-rose-200/70"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin Officer chip */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            PO
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">Placement Officer</p>
            <p className="text-[10px] text-slate-400 truncate">Admin Console</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[240px] flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-3 left-3 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-700"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[240px] bg-white shadow-2xl flex flex-col">
            <div className="absolute top-3 right-3 z-10">
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
