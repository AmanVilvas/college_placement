import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApplicationStatus, DriveStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPackage(lpa?: number, stipend?: number): string {
  if (lpa) return `₹${lpa} LPA`;
  if (stipend) return `₹${(stipend / 1000).toFixed(0)}K/month`;
  return "Competitive";
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDaysUntilDeadline(deadline: string): number {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getStatusColor(status: ApplicationStatus): string {
  switch (status) {
    case "Not Responded": return "bg-slate-100 text-slate-700 border-slate-200";
    case "Eligible": return "bg-blue-50 text-blue-700 border-blue-200";
    case "Interested": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Applied": return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "Confirmed": return "bg-teal-50 text-teal-700 border-teal-200";
    case "Shortlisted": return "bg-amber-50 text-amber-700 border-amber-200";
    case "Assessment": return "bg-orange-50 text-orange-700 border-orange-200";
    case "Interview": return "bg-purple-50 text-purple-700 border-purple-200";
    case "Selected": return "bg-green-50 text-green-700 border-green-200";
    case "Placed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Rejected": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function getDriveStatusColor(status: DriveStatus): string {
  switch (status) {
    case "Open": return "bg-green-100 text-green-700 border-green-200";
    case "Closing Soon": return "bg-amber-100 text-amber-700 border-amber-200";
    case "Closed": return "bg-red-100 text-red-700 border-red-200";
    case "Completed": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function getPlacementStatusColor(status: string): string {
  switch (status) {
    case "Placed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "In Process": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Unplaced": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const APPLICATION_JOURNEY: ApplicationStatus[] = [
  "Eligible",
  "Interested",
  "Applied",
  "Confirmed",
  "Shortlisted",
  "Assessment",
  "Interview",
  "Selected",
  "Placed",
];

export function getJourneyStep(status: ApplicationStatus): number {
  return APPLICATION_JOURNEY.indexOf(status);
}
