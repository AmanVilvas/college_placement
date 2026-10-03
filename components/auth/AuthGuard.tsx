"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const adminRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function AuthGuard({ children, kind }: { kind: "student" | "admin"; children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(kind === "student");

  useEffect(() => {
    if (kind !== "admin") return;

    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Staff sign-in required");
        return response.json();
      })
      .then(({ profile }) => {
        if (!active) return;
        const databaseAccount = uuidPattern.test(profile?.id ?? "");
        const localPreview = process.env.NODE_ENV === "development" && ["demo-admin", "admin-local"].includes(profile?.id ?? "");
        if ((!databaseAccount && !localPreview) || !adminRoles.has(profile?.role)) {
          router.replace("/admin/login");
          return;
        }
        setAuthorized(true);
      })
      .catch(() => {
        if (active) router.replace("/admin/login");
      });

    return () => { active = false; };
  }, [kind, router]);

  if (!authorized) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Checking placement-office access…</main>;
  }

  return <>{children}</>;
}
