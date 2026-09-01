"use client";

import { StudentHeader } from "@/components/student/StudentHeader";
import { students } from "@/lib/data/students";
import { applications } from "@/lib/data/applications";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getInitials } from "@/lib/utils";
import { Mail, Phone, FileText, GraduationCap, Award, Edit3 } from "lucide-react";

const CURRENT_STUDENT_ID = "s1";

export default function ProfilePage() {
  const student = students.find((s) => s.id === CURRENT_STUDENT_ID)!;
  const myApps = applications.filter((a) => a.studentId === CURRENT_STUDENT_ID);
  const shortlisted = myApps.filter((a) => ["Shortlisted", "Assessment", "Interview", "Selected", "Placed"].includes(a.status)).length;
  const interviews = myApps.filter((a) => ["Interview", "Selected", "Placed"].includes(a.status)).length;
  const offers = myApps.filter((a) => ["Selected", "Placed"].includes(a.status)).length;

  return (
    <div>
      <StudentHeader title="My Profile" subtitle="Your placement profile and statistics" />
      <div className="p-6 max-w-2xl space-y-6">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-700" />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-2xl font-bold text-white border-4 border-white shadow-md">
                {getInitials(student.name)}
              </div>
              <div className="pb-2">
                <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
                <p className="text-sm text-slate-500">{student.branch} • Section {student.section} • {student.rollNumber}</p>
              </div>
              <button className="ml-auto pb-2 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <StatusBadge status={student.placementStatus} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{student.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                {student.phone}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl">
              {[
                { label: "Applications", value: myApps.length },
                { label: "Shortlisted", value: shortlisted },
                { label: "Interviews", value: interviews },
                { label: "Offers", value: offers },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-[10px] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Academic Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Academic Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">CGPA</span><p className="font-bold text-slate-900 text-lg">{student.cgpa}</p></div>
            <div><span className="text-slate-500">Backlogs</span><p className="font-bold text-slate-900 text-lg">{student.backlogs}</p></div>
            <div><span className="text-slate-500">10th %</span><p className="font-semibold text-slate-800">{student.tenthPercent}%</p></div>
            <div><span className="text-slate-500">12th %</span><p className="font-semibold text-slate-800">{student.twelfthPercent}%</p></div>
            <div><span className="text-slate-500">Branch</span><p className="font-semibold text-slate-800">{student.branch}</p></div>
            <div><span className="text-slate-500">Section</span><p className="font-semibold text-slate-800">Section {student.section}</p></div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Skills</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {student.skills.map((skill) => (
              <span key={skill} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-full text-xs font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Resume */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Resume</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">rahul_sharma_resume.pdf</p>
              <p className="text-xs text-slate-400">Uploaded on Aug 20, 2026 • 1.2 MB</p>
            </div>
            <button className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">Update</button>
          </div>
        </div>
      </div>
    </div>
  );
}
