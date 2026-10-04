import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { UniversityLogo } from "@/components/shared/UniversityLogo";

const services = [
  {
    number: "01",
    audience: "For students",
    title: "Find your next opportunity.",
    description: "Explore active drives, keep track of each application, and know what comes next.",
    href: "/student/login",
    action: "Student portal",
  },
  {
    number: "02",
    audience: "For the placement team",
    title: "Keep recruitment moving.",
    description: "Coordinate companies, student applications, interviews, and outcomes in one place.",
    href: "/admin/login",
    action: "Staff access",
  },
  {
    number: "03",
    audience: "For everyone",
    title: "See placement outcomes.",
    description: "Explore published placement information and the companies connecting with MM(DU).",
    href: "/placements",
    action: "View outcomes",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-950 antialiased">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/" aria-label="MMDU Placement Cell home" className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700">
            <UniversityLogo priority className="h-10 sm:h-11" />
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#services" className="transition hover:text-red-700">Placement services</a>
            <a href="#about" className="transition hover:text-red-700">About the cell</a>
            <Link href="/placements" className="transition hover:text-red-700">Outcomes</Link>
          </nav>
          <Link href="/student/login" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
            Sign in <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[0.91fr_1.09fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-red-800">
              <span className="h-1.5 w-1.5 rounded-full bg-red-700" /> MM(DU) · Mullana, Ambala
            </p>
            <h1 className="mt-6 text-[clamp(2.8rem,5.4vw,4.75rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-slate-950">
              Your next chapter starts <span className="text-red-700">here.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              A clearer path from campus to career. Discover opportunities, follow your applications, and stay connected with the MMDU Placement Cell.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/student/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
                Explore student portal <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/admin/login" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
                Placement team access
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-red-700" aria-hidden="true" /> Drives and applications</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-red-700" aria-hidden="true" /> Updates from your placement team</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[660px] lg:ml-auto">
            <div className="relative aspect-[1.12/1] overflow-hidden rounded-[1.6rem] bg-slate-100 shadow-[0_30px_80px_-38px_rgba(15,23,42,0.38)] sm:rounded-[2rem]">
              <Image
                src="/mmdu-campus-hero.webp"
                alt="The entrance to Maharishi Markandeshwar (Deemed to be University), Mullana"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-[center_68%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/5" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">MMDU Placement Cell</p>
                  <p className="mt-1.5 text-lg font-semibold tracking-tight sm:text-xl">Opportunity begins on campus.</p>
                </div>
                <span className="hidden rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur sm:inline-flex">Mullana · Ambala</span>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="scroll-mt-8 border-y border-slate-200/80 bg-[#fafafa]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">A better-connected placement experience</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">The right support, at every step.</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-600">Purpose-built tools for the people who make campus recruitment happen.</p>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {services.map((service) => (
                <Link key={service.number} href={service.href} className="group flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_-6px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_16px_32px_-22px_rgba(127,29,29,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tabular-nums tracking-[0.12em] text-red-700">{service.number}</span>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-red-700" aria-hidden="true" />
                  </div>
                  <p className="mt-7 text-xs font-semibold text-slate-500">{service.audience}</p>
                  <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
                  <span className="mt-auto pt-6 text-sm font-semibold text-red-700">{service.action}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-100">
            <div className="relative aspect-[1.35/1]">
              <Image
                src="/mmdu-placement-community.webp"
                alt="Students and faculty gathered at an MM(DU) campus event"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <p className="absolute bottom-4 left-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">A community moving forward together</p>
          </div>
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">MMDU Placement Cell</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-4xl">Connecting ambition with opportunity.</h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              From the first employer conversation to the next interview update, the Placement Cell helps bring students, recruiters, and campus teams together.
            </p>
            <Link href="/placements" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-red-700 transition hover:text-red-800">
              Explore placement outcomes <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-[#fafafa]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" aria-label="MMDU Placement Cell home" className="inline-flex w-fit rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700">
            <UniversityLogo className="h-9" />
          </Link>
          <p className="text-xs text-slate-500">© MM(DU) Mullana · MMDU Placement Cell</p>
          <Link href="/placements" className="text-xs font-semibold text-slate-600 transition hover:text-red-700">Placement outcomes</Link>
        </div>
      </footer>
    </div>
  );
}
