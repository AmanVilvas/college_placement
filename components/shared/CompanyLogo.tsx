"use client";

import { cn, getInitials } from "@/lib/utils";

interface CompanyLogoProps {
  name: string;
  logoColor: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-2xl",
};

export function CompanyLogo({ name, logoColor, logoUrl, size = "md", className }: CompanyLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn("rounded-xl object-contain bg-white border border-slate-100", SIZE_CLASSES[size], className)}
      />
    );
  }

  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0",
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: logoColor }}
    >
      {initials}
    </div>
  );
}
