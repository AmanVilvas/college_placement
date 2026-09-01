"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  // Application statuses
  "Not Responded": {
    bg: "bg-zinc-100/90",
    text: "text-zinc-600",
    border: "border-zinc-200/80",
    dot: "bg-zinc-400",
  },
  "Eligible": {
    bg: "bg-blue-50/80",
    text: "text-blue-700",
    border: "border-blue-200/60",
    dot: "bg-blue-500",
  },
  "Interested": {
    bg: "bg-indigo-50/80",
    text: "text-indigo-700",
    border: "border-indigo-200/60",
    dot: "bg-indigo-500",
  },
  "Applied": {
    bg: "bg-sky-50/80",
    text: "text-sky-700",
    border: "border-sky-200/60",
    dot: "bg-sky-500",
  },
  "Confirmed": {
    bg: "bg-teal-50/90",
    text: "text-teal-800",
    border: "border-teal-200/70",
    dot: "bg-teal-500",
  },
  "Shortlisted": {
    bg: "bg-amber-50/90",
    text: "text-amber-800",
    border: "border-amber-200/80",
    dot: "bg-amber-500",
  },
  "Assessment": {
    bg: "bg-orange-50/80",
    text: "text-orange-800",
    border: "border-orange-200/70",
    dot: "bg-orange-500",
  },
  "Interview": {
    bg: "bg-purple-50/80",
    text: "text-purple-800",
    border: "border-purple-200/70",
    dot: "bg-purple-500",
  },
  "Selected": {
    bg: "bg-emerald-50/90",
    text: "text-emerald-800",
    border: "border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  "Placed": {
    bg: "bg-emerald-100/80",
    text: "text-emerald-900 font-semibold",
    border: "border-emerald-300/80",
    dot: "bg-emerald-600",
  },
  "Rejected": {
    bg: "bg-rose-50/80",
    text: "text-rose-700",
    border: "border-rose-200/60",
    dot: "bg-rose-400",
  },

  // Drive statuses
  "Open": {
    bg: "bg-emerald-50/90",
    text: "text-emerald-700",
    border: "border-emerald-200/70",
    dot: "bg-emerald-500",
  },
  "Closing Soon": {
    bg: "bg-amber-50/90",
    text: "text-amber-800",
    border: "border-amber-200/70",
    dot: "bg-amber-500 animate-pulse",
  },
  "Closed": {
    bg: "bg-zinc-100/90",
    text: "text-zinc-500",
    border: "border-zinc-200/60",
    dot: "bg-zinc-400",
  },
  "Completed": {
    bg: "bg-slate-100/90",
    text: "text-slate-600",
    border: "border-slate-200/60",
    dot: "bg-slate-400",
  },

  // Overall Placement Status
  "In Process": {
    bg: "bg-blue-50/80",
    text: "text-blue-700",
    border: "border-blue-200/60",
    dot: "bg-blue-500",
  },
  "Unplaced": {
    bg: "bg-zinc-100/90",
    text: "text-zinc-600",
    border: "border-zinc-200/60",
    dot: "bg-zinc-400",
  },
};

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    bg: "bg-zinc-100",
    text: "text-zinc-600",
    border: "border-zinc-200",
    dot: "bg-zinc-400",
  };

  return (
    <span
      className={cn(
        "status-pill inline-flex items-center gap-1.5 transition-colors",
        config.bg,
        config.text,
        config.border,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
      {status}
    </span>
  );
}
