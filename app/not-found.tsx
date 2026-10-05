import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { UniversityLogo } from "@/components/shared/UniversityLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200/80 px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/" aria-label="MMDU Placement Cell home" className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700">
            <UniversityLogo priority className="h-10" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8">
        <div className="max-w-lg text-center">
          <p className="text-[clamp(6rem,20vw,10rem)] font-bold leading-none tracking-tight text-red-700" aria-hidden="true">404</p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-red-700">Page not found</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">This page isn’t available.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">The link may be outdated, or the address may be incorrect. Head back to the placement portal to find what you need.</p>
          <Link href="/" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
            Back to home <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <nav aria-label="Portal access" className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
            <Link href="/student/login" className="rounded-sm hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700">Student sign in</Link>
            <Link href="/admin/login" className="rounded-sm hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700">Staff sign in</Link>
          </nav>
        </div>
      </main>

      <footer className="px-5 py-6 text-center text-xs text-slate-400">MMDU Placement Cell · MM(DU) Mullana</footer>
    </div>
  );
}
