import {
  LayoutDashboard, Building2, CalendarDays, Users, FileText, AlertCircle,
  UserCheck, BarChart3, Bell, Settings, Workflow, Sparkles, User, Briefcase,
} from "lucide-react";

export const studentNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/applications", label: "My Applications", icon: FileText },
  { href: "/drives", label: "Upcoming Drives", icon: CalendarDays },
  { href: "/workspace", label: "Career Workspace", icon: Sparkles },
  { href: "/portfolio", label: "Portfolio Preview", icon: Briefcase },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "My Profile", icon: User },
];

export const adminNavGroups = [
  { label: "Overview", items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Recruitment", items: [
    { href: "/admin/companies", label: "Companies", icon: Building2 },
    { href: "/admin/drives", label: "Placement Drives", icon: CalendarDays },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/applications", label: "Applications", icon: FileText },
    { href: "/admin/operations", label: "Operations center", icon: Workflow },
  ] },
  { label: "Operations", items: [
    { href: "/admin/followups", label: "Follow-ups", icon: AlertCircle },
    { href: "/admin/placed", label: "Placed Students", icon: UserCheck },
  ] },
  { label: "Reporting", items: [
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/notifications", label: "Broadcasts", icon: Bell },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ] },
];

export const publicNavItems = [
  { href: "/", label: "Home" },
  { href: "/placements", label: "Placement Outcomes" },
];

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}
