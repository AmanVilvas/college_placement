"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap, Shield, ArrowRight, CheckCircle2,
  Building2, Users, FileText, Bell, Sparkles, AlertCircle,
  TrendingUp, ExternalLink, ArrowUpRight, Check, X,
  Clock, Award, Layers, Zap, ChevronRight, Laptop,
  CheckCheck, ArrowDownRight, Command, Database,
  FileSpreadsheet, MessageSquare, BarChart3,
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"apply" | "followup" | "pipeline">("apply");

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col justify-between selection:bg-zinc-900 selection:text-white font-sans antialiased">
      {/* 1. Ultra-Clean Navigation Bar (shadcn / 21st.dev style) */}
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-zinc-950 rounded-lg flex items-center justify-center text-white shadow-xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-zinc-950">PlacementOS</span>
            </Link>
            <span className="hidden sm:inline-flex text-[11px] font-medium text-zinc-400 border-l border-zinc-200 pl-3">
              v2.4
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-600">
            <a href="#how-it-works" className="hover:text-zinc-950 transition-colors">How It Works</a>
            <a href="#workflow" className="hover:text-zinc-950 transition-colors">The 2-Step Flow</a>
            <a href="#features" className="hover:text-zinc-950 transition-colors">Features</a>
            <a href="#comparison" className="hover:text-zinc-950 transition-colors">WhatsApp vs OS</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Student Portal
            </Link>
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold bg-zinc-950 hover:bg-zinc-800 text-white px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>Admin Console</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="max-w-6xl mx-auto px-5 sm:px-6 pt-16 pb-20 space-y-20">
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Built for College Placement Cells & University Career Offices</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-zinc-950 leading-[1.12]">
            Stop managing campus placements in <span className="underline decoration-zinc-300 underline-offset-4 decoration-2">WhatsApp</span> & <span className="underline decoration-zinc-300 underline-offset-4 decoration-2">Google Sheets</span>.
          </h1>

          {/* Subheading */}
          <p className="text-zinc-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            PlacementOS is the dedicated operating system for university placement cells. Publish official drives, capture verified student application confirmations, and eliminate manual follow-ups.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto text-xs font-semibold bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group"
            >
              <GraduationCap className="w-4 h-4 text-zinc-300" />
              <span>Enter as Student</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/admin/dashboard"
              className="w-full sm:w-auto text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 px-5 py-3 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4 text-zinc-600" />
              <span>Enter as Placement Officer</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 text-[11px] text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Zero WhatsApp spam
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Verified student receipts
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> One-click CSV export
            </span>
          </div>
        </div>

        {/* 3. Interactive Product Architecture Showcase (Aceternity / 21st.dev Style) */}
        <div id="how-it-works" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Live System Preview</h2>
              <p className="text-xs text-zinc-500">Explore how the platform handles the complete placement lifecycle</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 text-xs">
              <button
                onClick={() => setActiveTab("apply")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === "apply"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                1. The 2-Step Apply Flow
              </button>
              <button
                onClick={() => setActiveTab("followup")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === "followup"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                2. Admin Follow-up Queue
              </button>
              <button
                onClick={() => setActiveTab("pipeline")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === "pipeline"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                3. Placement Pipeline
              </button>
            </div>
          </div>

          {/* Tab Content 1: The 2-Step Apply & Confirm Flow */}
          {activeTab === "apply" && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    Core Value Proposition
                  </div>
                  <h3 className="text-xl font-bold text-zinc-950 tracking-tight">
                    How Students Apply & Confirm Their Participation
                  </h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Most companies require students to apply on their own portal, careers site, or Google Form. PlacementOS bridges that gap by decoupling the external application from internal tracking.
                  </p>

                  <div className="space-y-3 pt-1 text-xs">
                    <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <strong className="text-zinc-900 block">Apply on Official Portal ↗</strong>
                        <span className="text-zinc-500 text-[11px]">Redirects student to the college Google Form or company ATS.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <strong className="text-zinc-900 block">I&apos;ve Applied • Confirm Participation</strong>
                        <span className="text-zinc-500 text-[11px]">Student confirms their Roll No, Branch, Email & Resume receipt.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Simulation Box */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#00a4ef] flex items-center justify-center text-white font-bold text-xs">
                        MS
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">Microsoft IDC</p>
                        <p className="text-[10px] text-zinc-500">Software Development Engineer • ₹45.0 LPA</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Open Drive
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button className="w-full bg-zinc-900 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Apply on Official Portal ↗
                    </button>
                    <p className="text-[10px] text-center text-zinc-400">Complete application on Microsoft Careers</p>

                    <button className="w-full bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      I&apos;ve Applied • Confirm Participation
                    </button>
                    <p className="text-[10px] text-center text-zinc-400">Notifies placement cell with zero WhatsApp messages</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Follow-up Queue */}
          {activeTab === "followup" && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Admin Follow-up Command
                </div>
                <h3 className="text-xl font-bold text-zinc-950 tracking-tight">
                  Zero WhatsApp Chaos. Instant Follow-up Queue.
                </h3>
                <p className="text-xs text-zinc-600">
                  Placement officers see in real-time who is eligible but hasn&apos;t confirmed, with one-click follow-up filters by Branch and Section.
                </p>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[11px]">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">Student Name</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Roll No</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Company</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    <tr className="hover:bg-zinc-50/60">
                      <td className="px-4 py-3 font-semibold text-zinc-900">Rahul Sharma (CSE-A)</td>
                      <td className="px-3 py-3 font-mono text-zinc-500">21CSE102</td>
                      <td className="px-3 py-3 font-medium text-zinc-800">Microsoft</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                          Not Confirmed
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md">
                          Follow Up
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-50/60">
                      <td className="px-4 py-3 font-semibold text-zinc-900">Sneha Gupta (IT-A)</td>
                      <td className="px-3 py-3 font-mono text-zinc-500">21IT201</td>
                      <td className="px-3 py-3 font-medium text-zinc-800">Deloitte</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                          Confirmed ✓
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-md">
                          View Receipt
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-50/60">
                      <td className="px-4 py-3 font-semibold text-zinc-900">Karan Singh (CSE-B)</td>
                      <td className="px-3 py-3 font-mono text-zinc-500">21CSE121</td>
                      <td className="px-3 py-3 font-medium text-zinc-800">Amazon</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                          Shortlisted
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                          Update Round
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content 3: Placement Pipeline */}
          {activeTab === "pipeline" && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Full Candidate Lifecycle
                </div>
                <h3 className="text-xl font-bold text-zinc-950 tracking-tight">
                  Track Candidates from Eligibility to Verified Placement
                </h3>
                <p className="text-xs text-zinc-600">
                  Every candidate follows a rigorous, transparent progression pipeline synced between students and the placement office.
                </p>
              </div>

              {/* Step Sequence */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                {[
                  { step: "1. Eligible", desc: "Criteria matched" },
                  { step: "2. Confirmed", desc: "Receipt verified" },
                  { step: "3. Shortlisted", desc: "Resume cleared" },
                  { step: "4. Assessment", desc: "Test round" },
                  { step: "5. Interview", desc: "Tech & HR" },
                  { step: "6. Placed 🎉", desc: "Offer received" },
                ].map((item, idx) => (
                  <div key={item.step} className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl text-center space-y-1">
                    <p className="text-xs font-bold text-zinc-900">{item.step}</p>
                    <p className="text-[10px] text-zinc-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Comparison Section: Before vs After */}
        <div id="comparison" className="space-y-6 pt-4">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950">Why Universities Switch to PlacementOS</h2>
            <p className="text-xs text-zinc-500">Comparing manual methods with a unified campus placement OS</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* The Old Way */}
            <div className="bg-rose-50/40 border border-rose-200/70 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <X className="w-4 h-4 text-rose-600" />
                <span>The Old Way (WhatsApp & Google Sheets)</span>
              </div>
              <ul className="space-y-2.5 text-xs text-rose-900/80">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">✕</span>
                  <span>Drive links get buried in chaotic WhatsApp group chats with hundreds of unread messages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">✕</span>
                  <span>Placement officers manually ask "Who applied?" and build fragile spreadsheets row by row.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">✕</span>
                  <span>Students miss crucial assessment deadlines due to lack of confirmation tracking.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">✕</span>
                  <span>No single source of truth for placed students and CTC analytics.</span>
                </li>
              </ul>
            </div>

            {/* The PlacementOS Way */}
            <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>The PlacementOS Way</span>
              </div>
              <ul className="space-y-2.5 text-xs text-emerald-900/90">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Official application link paired with instant student participation confirmation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Real-time Follow-up Queue showing unconfirmed candidates by Branch and Section.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Live visual placement pipeline tracking every round from test to offer letter.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>One-click CSV / Excel exports and branch-wise placement conversion metrics.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 5. Core Features Bento Grid (21st.dev Style) */}
        <div id="features" className="space-y-6 pt-4">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950">Engineered for Campus Recruitment</h2>
            <p className="text-xs text-zinc-500">Every module designed to save placement officers hours of repetitive work</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
              <Building2 className="w-4 h-4 text-zinc-900" />
              <h3 className="font-bold text-sm text-zinc-900">Company Management</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Add partner recruiters, set CGPA thresholds, upload logos, configure CTC, and link official registration portals.
              </p>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-zinc-900" />
              <h3 className="font-bold text-sm text-zinc-900">Follow-up Command Center</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Filter students who haven&apos;t confirmed before deadlines by Company, Branch, Section, or Status with instant triage actions.
              </p>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
              <TrendingUp className="w-4 h-4 text-zinc-900" />
              <h3 className="font-bold text-sm text-zinc-900">Candidate Pipeline Tracking</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Advance candidates through: Eligible → Confirmed → Shortlisted → Assessment → Interview → Placed.
              </p>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4 text-zinc-900" />
              <h3 className="font-bold text-sm text-zinc-900">Verified One-Click Exports</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Export clean, audit-ready CSV rosters of registered candidates with Roll Numbers, emails, and confirmation timestamps.
              </p>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
              <BarChart3 className="w-4 h-4 text-zinc-900" />
              <h3 className="font-bold text-sm text-zinc-900">Placement Analytics</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Real-time branch conversion percentages, average CTC packages, company-wise selections, and funnel drop-off statistics.
              </p>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-2 shadow-2xs">
              <Bell className="w-4 h-4 text-zinc-900" />
              <h3 className="font-bold text-sm text-zinc-900">Targeted Broadcast Alerts</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Dispatch drive announcements, deadline reminders, and interview schedules to specific engineering branches with zero clutter.
              </p>
            </div>
          </div>
        </div>

        {/* 6. Launch Portal Callout */}
        <div className="bg-zinc-950 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-lg shadow-zinc-950/10">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to streamline your college placement process?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Explore the student experience or launch the placement team administrative console.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-white text-zinc-950 hover:bg-zinc-100 font-semibold px-6 py-3 rounded-xl text-xs transition-colors shadow-xs"
            >
              Open Student Portal →
            </Link>
            <Link
              href="/admin/dashboard"
              className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-semibold px-6 py-3 rounded-xl text-xs transition-colors shadow-xs"
            >
              Open Placement Team Admin →
            </Link>
          </div>
        </div>
      </main>

      {/* 7. Footer */}
      <footer className="border-t border-zinc-200/80 bg-white py-8 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-zinc-950 rounded flex items-center justify-center text-white text-[10px] font-bold">
              P
            </div>
            <span className="font-bold text-zinc-900">PlacementOS</span>
            <span>• College Placement Management Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-zinc-400">
            <span>Next.js 14+</span>
            <span>•</span>
            <span>TypeScript</span>
            <span>•</span>
            <span>Tailwind CSS</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
