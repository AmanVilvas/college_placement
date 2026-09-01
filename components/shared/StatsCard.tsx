"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  color?: "indigo" | "purple" | "cyan" | "emerald" | "amber" | "rose";
  className?: string;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        "card-clean p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300/80 transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{value}</p>
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
