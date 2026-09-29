"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
export function AuthGuard({ kind, children }: { kind: "student" | "admin"; children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [allowed, setAllowed] = useState(false);
  useEffect(() => { let active = true; fetch("/api/auth/me").then(async (r) => ({ ok: r.ok, body: await r.json() })).then(({ ok, body }) => {
    if (!active) return;
    const role = body.profile?.role;
    const valid = ok && (kind === "student" ? role === "student" : ["super_admin", "college_admin", "tpo", "coordinator"].includes(role));
    if (!valid) { router.replace(kind === "student" ? "/student/login" : "/admin/login"); return; }
    if (body.user?.user_metadata?.must_change_password && pathname !== "/change-password") { router.replace("/change-password"); return; }
    setAllowed(true);
  }).catch(() => router.replace(kind === "student" ? "/student/login" : "/admin/login")); return () => { active = false; }; }, [kind, pathname, router]);
  if (!allowed) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Checking your account…</div>;
  return children;
}
