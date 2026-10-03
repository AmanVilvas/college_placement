"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function Card({ children, eyebrow, title, description }: { children: React.ReactNode; eyebrow: string; title: string; description: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">{eyebrow}</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>{children}</section></main>;
}
function Field({ label, name, type = "text", autoComplete }: { label: string; name: string; type?: string; autoComplete: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input required name={name} type={type} autoComplete={autoComplete} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>;
}
function Login({ admin }: { admin: boolean }) {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/auth/${admin ? "admin-login" : "student-login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(admin ? values : { rollNumber: values.rollNumber, password: values.password }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Unable to sign in.");
      if (!admin && values.rollNumber) {
        try {
          const profileKey = "placement-helper:student-profile:s1";
          const raw = localStorage.getItem(profileKey);
          const current = raw ? JSON.parse(raw) : {};
          localStorage.setItem(profileKey, JSON.stringify({
            ...current,
            rollNumber: String(values.rollNumber),
            name: data.student?.name || current.name || `Student (${values.rollNumber})`,
          }));
        } catch {}
      }
      router.replace(admin ? "/admin/dashboard" : "/dashboard");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return <Card eyebrow={admin ? "PlacementOS · Staff" : "PlacementOS · Student"} title={admin ? "Admin sign in" : "Student sign in"} description={admin ? "Use your placement office account email and password." : "Sign in with your college roll number and password. First-time password is your roll number."}>
    <form onSubmit={submit} className="mt-7 space-y-5">{admin ? <Field label="Email address" name="email" type="email" autoComplete="username" /> : <Field label="Roll number" name="rollNumber" autoComplete="username" />}<Field label="Password" name="password" type="password" autoComplete="current-password" />{error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button></form>
    <p className="mt-6 text-center text-sm text-slate-500">{admin ? <a className="font-medium text-indigo-600" href="/student/login">Student sign in</a> : <a className="font-medium text-indigo-600" href="/admin/login">Admin sign in</a>}</p>
  </Card>;
}
export function StudentLogin() { return <Login admin={false} />; }
export function AdminLogin() {
  const router = useRouter();
  useEffect(() => {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production") router.replace("/admin/dashboard");
  }, [router]);

  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Opening placement office…</main>;
  }
  return <Login admin />;
}
export function ChangePassword() {
  const router = useRouter(); const path = usePathname(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget); const password = String(data.get("password")); if (password !== data.get("confirm")) { setError("The passwords do not match."); setBusy(false); return; } try { const response = await fetch("/api/auth/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); router.replace(path.includes("admin") ? "/admin/dashboard" : "/dashboard"); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not update password."); } finally { setBusy(false); } }
  return <Card eyebrow="Account security" title="Set a new password" description="Choose a password with at least 8 characters. You can also change it later from your account portal."><form onSubmit={submit} className="mt-7 space-y-5"><Field label="New password" name="password" type="password" autoComplete="new-password" /><Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" />{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white">{busy ? "Saving…" : "Update password"}</button></form></Card>;
}
