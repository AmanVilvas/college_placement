import Image from "next/image";
import { cn } from "@/lib/utils";

interface UniversityLogoProps {
  className?: string;
  priority?: boolean;
}

export function UniversityLogo({ className, priority = false }: UniversityLogoProps) {
  return (
    <Image
      src="/mmdu-logo.webp"
      alt="Maharishi Markandeshwar (Deemed to be University), Mullana"
      width={1182}
      height={267}
      priority={priority}
      className={cn("h-10 w-auto max-w-full object-contain", className)}
    />
  );
}
