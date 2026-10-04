"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";

export function StudentAvatar({ name, avatarUrl, className }: { name: string; avatarUrl?: string; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const source = avatarUrl?.startsWith("data:image/webp;base64,") ? avatarUrl : undefined;
  return <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-50 font-medium text-red-700", className)}>
    {source && failedUrl !== source ? <Image src={source} alt={`${name}'s profile photo`} fill unoptimized className="object-cover" onError={() => setFailedUrl(source)}/> : getInitials(name || "Student")}
  </span>;
}
