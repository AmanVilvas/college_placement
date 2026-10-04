export interface CommunityDrive {
  id: string;
  company_id: string;
  role_title: string;
  package_lpa?: number | null;
  location?: string | null;
  work_mode?: string | null;
  application_deadline?: string | null;
  eligibility?: { branches?: string[]; minCGPA?: number; maxBacklogs?: number } | null;
}

export interface CommunityResource {
  id: string;
  company_id: string;
  drive_id?: string | null;
  title: string;
  body?: string | null;
  file_name?: string | null;
  content_type?: string | null;
  file_size?: number | null;
  created_at: string;
}

export interface CommunityCompany {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  logo_url?: string | null;
  metadata?: { logoColor?: string; extra_fields?: Record<string, string> } | null;
  drives: CommunityDrive[];
  resources: CommunityResource[];
}
