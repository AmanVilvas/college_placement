/**
 * parseStudentFile — reads an Excel (.xlsx / .xls) or CSV file
 * and returns an array of normalized row objects ready for the import API.
 *
 * Highly flexible schema:
 * - Works with complete sheets (15+ columns) OR simple lists with just 4-5 columns.
 * - Never invents roll numbers or student names. Required identity fields must be
 *   supplied or corrected in the preview before rows can be imported.
 * - Flags other incomplete details so staff can review them before import.
 */

export type ParsedRow = Record<string, string | number | boolean | string[] | undefined>;

export interface RowWarning {
  field: string;
  message: string;
}

export interface ValidatedRow {
  row: ParsedRow;
  rowIndex: number;
  warnings: RowWarning[];
  errors: RowWarning[];
  hasProblemWithDetails: boolean;
}

function normalize(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9\s_\-]/g, "")
    .replace(/[\s_\-]+/g, "_")
    .trim()
    .replace(/^_|_$/g, "");
}

const COLUMN_MAP: Record<string, string> = {
  // Roll / Registration / ID numbers
  roll_number: "roll_number", roll_no: "roll_number", roll: "roll_number",
  enrollment: "roll_number", enrollment_no: "roll_number",
  uni_roll_no: "roll_number", university_roll_no: "roll_number", university_roll: "roll_number",
  reg_no: "roll_number", registration_no: "roll_number", registration_number: "roll_number",
  student_id: "roll_number", id_number: "roll_number", id_no: "roll_number",
  adm_no: "roll_number", admission_no: "roll_number", urn: "roll_number",
  prn: "roll_number", usn: "roll_number", htno: "roll_number", hall_ticket: "roll_number",
  hall_ticket_no: "roll_number", hallticket: "roll_number",

  // Name
  full_name: "full_name", name: "full_name", student_name: "full_name",
  name_of_student: "full_name", name_student: "full_name", candidate_name: "full_name",
  applicant_name: "full_name", candidate: "full_name", student: "full_name",
  first_name: "full_name",

  // Email
  email: "email", email_id: "email", email_id_of_student: "email",
  student_email: "email", college_email: "email", personal_email: "email",
  mail: "email", mail_id: "email", e_mail: "email",

  // Department / Branch / Course
  department: "department", branch: "department", dept: "department",
  course: "department", stream: "department", programme: "department",
  program: "department", degree: "department",
  specialization: "department", specialization_1: "department",
  specialization1: "department", specialization_2: "department",
  specialization2: "department", major: "department",

  // Section
  section: "section", sec: "section", division: "section", div: "section", class_sec: "section",

  // Study Year & Passout Batch
  year_of_study: "year_of_study", year: "year_of_study", current_year: "year_of_study",
  graduation_year: "graduation_year", passout_year: "graduation_year",
  passout: "graduation_year", batch: "graduation_year", passing_year: "graduation_year",
  year_of_passout: "graduation_year",

  // Phone / Contact
  phone: "phone", mobile: "phone", mobile_no: "phone", phone_no: "phone",
  student_mobile_no: "phone", student_mobile: "phone", contact_no: "phone",
  contact: "phone", student_contact: "phone", cell: "phone", whatsapp_no: "phone",
  tel: "phone",

  // CGPA / Overall Degree Marks
  cgpa: "cgpa", gpa: "cgpa", cpi: "cgpa",
  b_tech: "cgpa", b_tech_percent: "cgpa", b_tech_percentage: "cgpa",
  btech_percentage: "cgpa", b_tech_aggregate: "cgpa", b_tech_aggregate_percent: "cgpa",
  percentage: "cgpa", percent: "cgpa", marks: "cgpa", score: "cgpa",
  overall_percentage_in_bachelor_bbaabcomany_other_degree: "cgpa",
  overall_percentage_in_bachelor: "cgpa", overall_percentage: "cgpa",
  aggregate_percentage: "cgpa", aggregate: "cgpa", degree_percentage: "cgpa",

  // 10th Standard Marks
  tenth_percent: "tenth_percent", "10th": "tenth_percent",
  "10th_percent": "tenth_percent", "10th_percentage": "tenth_percent",
  percentage_in_10th: "tenth_percent", tenth_percentage: "tenth_percent",
  ssc: "tenth_percent", class_10: "tenth_percent", "10_th": "tenth_percent",

  // 12th Standard Marks
  twelfth_percent: "twelfth_percent", "12th": "twelfth_percent",
  "12th_percent": "twelfth_percent", "12th_percentage": "twelfth_percent",
  percentage_in_12th: "twelfth_percent", twelfth_percentage: "twelfth_percent",
  hsc: "twelfth_percent", class_12: "twelfth_percent", "12_th": "twelfth_percent",

  // Backlogs
  backlogs: "backlogs", active_backlog: "backlogs", active_backlogs: "backlogs",
  no_of_backlogs: "backlogs", arrears: "backlogs",

  // Skills
  skills: "skills", skill_set: "skills", technical_skills: "skills",

  // Optional source-file serial number; it is never used as a student identifier.
  s_no: "s_no", sr_no: "s_no", sno: "s_no", sl_no: "s_no", serial_no: "s_no",
};

function mapHeader(raw: string): string | null {
  return COLUMN_MAP[normalize(raw)] ?? null;
}

export async function parseStudentFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseExcel(file);
  throw new Error("Unsupported file type. Please upload a .xlsx, .xls, or .csv file.");
}

async function parseCSV(file: File): Promise<ParsedRow[]> {
  const Papa = (await import("papaparse")).default;
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        try {
          resolve(transformRows(results.data as Record<string, string>[]));
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

async function parseExcel(file: File): Promise<ParsedRow[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets.");
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }) as Record<string, string>[];
  return transformRows(raw);
}

/**
 * Transforms raw sheet rows into flexible ParsedRow objects.
 * Works whether sheet has 4-5 columns or 20+ columns.
 * Never throws just because a column is absent!
 */
function transformRows(rawRows: Record<string, string | number>[]): ParsedRow[] {
  if (rawRows.length === 0) throw new Error("File is empty or has no data rows.");

  const headerKeys = Object.keys(rawRows[0] || {});
  const headerMap: Record<string, string> = {};

  for (const h of headerKeys) {
    const mapped = mapHeader(String(h));
    if (mapped) headerMap[h] = mapped;
  }

  return rawRows
    .map((row) => {
      const out: ParsedRow = {};
      const extraDetails: Record<string, string> = {};

      for (const [origKey, val] of Object.entries(row)) {
        const strVal = String(val ?? "").trim();
        const mappedKey = headerMap[origKey];
        if (mappedKey) {
          if (mappedKey === "s_no") {
            if (strVal) extraDetails[origKey] = strVal;
          } else if (
            [
              "cgpa",
              "tenth_percent",
              "twelfth_percent",
              "backlogs",
              "year_of_study",
              "graduation_year",
            ].includes(mappedKey)
          ) {
            if (strVal) {
              const num = parseFloat(strVal.replace(/%/g, "").trim());
              if (!isNaN(num)) out[mappedKey] = num;
            }
          } else {
            if (strVal) out[mappedKey] = strVal;
          }
        } else {
          // Preserve arbitrary sheet fields too, including blanks, so imported
          // profiles can show an explicit NA instead of silently losing a column.
          extraDetails[origKey] = strVal || "NA";
        }
      }

      if (Object.keys(extraDetails).length > 0) {
        out.extra_fields = JSON.stringify(extraDetails);
      }

      return out;
    })
    .filter((r) => r.roll_number || r.full_name);
}

/**
 * Validates rows.
 * If any field does not look right, flags it with:
 * "This has problem with details: <field> - <reason>"
 *
 * Roll number and full name are required. Other incomplete details are warnings.
 */
export function validateRows(rows: ParsedRow[]): ValidatedRow[] {
  return rows.map((row, i) => {
    const rowIndex = i + 1;
    const warnings: RowWarning[] = [];
    const errors: RowWarning[] = [];

    // 1. Roll number check
    const rollStr = String(row.roll_number ?? "").trim();
    if (!rollStr) {
      errors.push({
        field: "roll_number",
        message: "Roll number is required. Enter the official student roll number before importing.",
      });
    }

    // 2. Name check
    const nameStr = String(row.full_name ?? "").trim();
    if (!nameStr) {
      errors.push({
        field: "full_name",
        message: "Student name is required before importing.",
      });
    }

    if (!String(row.department ?? "").trim()) {
      warnings.push({
        field: "department",
        message: "This has problem with details: Department / course is missing (can fill now or edit later)",
      });
    }

    // 3. Email check
    const emailStr = String(row.email ?? "").trim();
    if (!emailStr) {
      warnings.push({
        field: "email",
        message: "This has problem with details: Email is missing (can write now or edit later)",
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      warnings.push({
        field: "email",
        message: "This has problem with details: Email format does not look right (can write now or edit later)",
      });
    }

    const missingFields: [string, unknown, string][] = [
      ["phone", row.phone, "Phone number"],
      ["section", row.section, "Section"],
      ["year_of_study", row.year_of_study, "Year of study"],
      ["graduation_year", row.graduation_year, "Graduation year"],
      ["cgpa", row.cgpa, "CGPA / marks"],
      ["tenth_percent", row.tenth_percent, "10th percentage"],
      ["twelfth_percent", row.twelfth_percent, "12th percentage"],
      ["backlogs", row.backlogs, "Backlog count"],
      ["skills", row.skills, "Skills"],
    ];
    for (const [field, value, label] of missingFields) {
      if (value === undefined || value === null || String(value).trim() === "") {
        warnings.push({ field, message: `This has problem with details: ${label} is missing (can fill now or edit later)` });
      }
    }

    // 4. CGPA / Marks check
    const cgpaVal = row.cgpa !== undefined ? Number(row.cgpa) : null;
    if (cgpaVal !== null && !isNaN(cgpaVal) && (cgpaVal < 0 || cgpaVal > 100)) {
      warnings.push({
        field: "cgpa",
        message: "This has problem with details: Percentage / CGPA out of range (0–100)",
      });
    }

    // 5. 10th % check
    const tenthVal = row.tenth_percent !== undefined ? Number(row.tenth_percent) : null;
    if (tenthVal !== null && !isNaN(tenthVal) && (tenthVal < 0 || tenthVal > 100)) {
      warnings.push({
        field: "tenth_percent",
        message: "This has problem with details: 10th % value out of range (0–100)",
      });
    }

    // 6. 12th % check
    const twelfthVal = row.twelfth_percent !== undefined ? Number(row.twelfth_percent) : null;
    if (twelfthVal !== null && !isNaN(twelfthVal) && (twelfthVal < 0 || twelfthVal > 100)) {
      warnings.push({
        field: "twelfth_percent",
        message: "This has problem with details: 12th % value out of range (0–100)",
      });
    }

    // 7. Phone check
    const phoneStr = String(row.phone ?? "").trim();
    if (phoneStr) {
      const cleaned = phoneStr.replace(/[\s\-\+\(\)]/g, "");
      if (!/^\d{7,15}$/.test(cleaned)) {
        warnings.push({
          field: "phone",
          message: "This has problem with details: Phone number format does not look right",
        });
      }
    }

    const hasProblemWithDetails = warnings.length > 0 || errors.length > 0;

    return {
      row,
      rowIndex,
      warnings,
      errors,
      hasProblemWithDetails,
    };
  });
}

/**
 * Prepares rows for the import API.
 * NO forceful dropping of rows: all rows are passed to the API.
 * Attaches metadata indicating if this row has problems with details so it can be edited later.
 */
export function prepareForImport(validatedRows: ValidatedRow[]): ParsedRow[] {
  return validatedRows.map((vr) => {
    const row = { ...vr.row };
    row.has_problem_with_details = vr.hasProblemWithDetails;
    row.detail_problems = vr.warnings.map((w) => `${w.field}: ${w.message}`);

    // Keep missing values visible as a consistent placeholder in imported
    // student records. Numeric columns remain null in the database and render
    // as "NA" in the roster; the warnings above retain the missing-field signal.
    for (const field of ["email", "phone", "department", "section", "skills"]) {
      if (row[field] === undefined || row[field] === null || String(row[field]).trim() === "") row[field] = "NA";
    }

    return row;
  });
}
