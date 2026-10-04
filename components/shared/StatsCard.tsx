"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  color?: "red" | "purple" | "cyan" | "emerald" | "amber" | "rose";
  className?: string;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-[112px] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-slate-300 sm:p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400">
            <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-[1.7rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {subtitle && <p className="text-xs text-slate-400 font-normal">{subtitle}</p>}
          {trend && (
            <span
              className={cn(
                "inline-flex items-center text-[11px] font-semibold px-1.5 py-0.2 rounded",
                trend.value > 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
              )}
            >
              {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
