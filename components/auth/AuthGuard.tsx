"use client";
// Auth is temporarily disabled — anyone can access student or admin portals.
export function AuthGuard({ children }: { kind: "student" | "admin"; children: React.ReactNode }) {
  return <>{children}</>;
}
