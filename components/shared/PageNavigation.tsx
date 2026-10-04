"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { adminNavGroups, studentNavItems, publicNavItems, isNavigationActive } from "@/lib/navigation";

export function PageNavigation({ kind }: { kind: "student" | "admin" }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = kind === "admin" ? adminNavGroups.flatMap((group) => group.items) : studentNavItems;
  const dashboard = items[0];
  const current = items.find((item) => isNavigationActive(pathname, item.href));
  const isDetail = current && pathname !== current.href;
  const detailLabel = pathname.startsWith("/admin/students/") ? "Student details"
    : pathname.startsWith("/admin/companies/") ? "Company details" : "Drive details";

  return (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 bg-white py-2 pl-14 pr-4 lg:px-6">
      <nav aria-label="Breadcrumb" className="min-w-0 text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" aria-label="Home" title="Home" className="inline-flex rounded-md p-1.5 hover:bg-slate-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600"><Home className="h-4 w-4" /></Link></li>
          <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
          <li>{current?.href === dashboard.href ? <span aria-current="page" className="font-semibold text-slate-800">Dashboard</span> : <Link href={dashboard.href} className="hover:text-red-700 hover:underline">Dashboard</Link>}</li>
          {current && current.href !== dashboard.href && <>
            <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
            <li>{isDetail ? <Link href={current.href} className="hover:text-red-700 hover:underline">{current.label}</Link> : <span aria-current="page" className="font-semibold text-slate-800">{current.label}</span>}</li>
          </>}
          {isDetail && <><li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li><li aria-current="page" className="font-semibold text-slate-800">{detailLabel}</li></>}
        </ol>
      </nav>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="hidden sm:inline">Go to</span>
        <select
          aria-label="Navigate to a page"
          value={current?.href ?? ""}
          onChange={(event) => router.push(event.target.value)}
          className="max-w-48 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        >
          <option value="" disabled>Choose a page</option>
          <optgroup label={kind === "admin" ? "Placement office" : "Student portal"}>
            {items.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
          </optgroup>
          <optgroup label="Public pages">
            {publicNavItems.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
          </optgroup>
        </select>
      </label>
    </div>
  );
}
