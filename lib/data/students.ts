import { Student } from "@/lib/types";

// Student records are loaded from the campus database, never seeded in source.
export const students: Student[] = [];

export function getStudentById(id: string): Student | undefined {
  return students.find((student) => student.id === id);
}

export function getStudentByRollNumber(rollNumber: string): Student | undefined {
  return students.find((student) => student.rollNumber === rollNumber);
}

export function getStudentStats() {
  return {
    total: students.length,
    placed: students.filter((student) => student.placementStatus === "Placed").length,
    inProcess: students.filter((student) => student.placementStatus === "In Process").length,
    unplaced: students.filter((student) => student.placementStatus === "Unplaced").length,
    avgPackage: 0,
    branchWise: [],
  };
}
