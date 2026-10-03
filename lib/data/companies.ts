import { Company, Drive } from "@/lib/types";

// Legacy consumers may still import these collections. Live companies and
// drives must come from the API/database; this module intentionally has no seed data.
export const companies: Company[] = [];
export const drives: Drive[] = [];

export function getDriveById(id: string): Drive | undefined {
  return drives.find((drive) => drive.id === id);
}

export function getDrivesByCompany(companyId: string): Drive[] {
  return drives.filter((drive) => drive.companyId === companyId);
}

export function getOpenDrives(): Drive[] {
  return drives.filter((drive) => drive.status === "Open" || drive.status === "Closing Soon");
}
