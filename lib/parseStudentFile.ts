/**
 * parseStudentFile — reads an Excel (.xlsx / .xls) or CSV file
 * and returns an array of normalized row objects ready for the import API.
 *
 * Highly flexible schema:
 * - Works with complete sheets (15+ columns) OR simple lists with just 4-5 columns.
 * - If Roll Number or Name column is missing, generates temporary fallbacks so rows
 *   are NEVER forcefully blocked.
 * - Flags any problem field with "This has problem with details" so staff can
 *   either write the details right away in preview or edit them later.
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

  // Serial Number (used as fallback roll number if no roll column exists)
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

  const hasRollColumn = Object.values(headerMap).includes("roll_number");
  const hasSNoColumn = Object.values(headerMap).includes("s_no");
  const hasNameColumn = Object.values(headerMap).includes("full_name");

  return rawRows
    .map((row, index) => {
      const out: ParsedRow = {};
      const extraDetails: Record<string, string> = {};
      let serialVal: string | null = null;

      for (const [origKey, val] of Object.entries(row)) {
        if (val === "" || val === undefined || val === null) continue;
        const strVal = String(val).trim();
        if (!strVal) continue;

        const mappedKey = headerMap[origKey];
        if (mappedKey) {
          if (mappedKey === "s_no") {
            serialVal = strVal;
            extraDetails[origKey] = strVal;
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
            const num = parseFloat(strVal.replace(/%/g, "").trim());
            if (!isNaN(num)) out[mappedKey] = num;
          } else {
            out[mappedKey] = strVal;
          }
        } else {
          // Dynamic arbitrary column (from 4-5 column lists)
          extraDetails[origKey] = strVal;
        }
      }

      // 1. Roll number fallback if missing in file
      if (!out.roll_number || String(out.roll_number).trim() === "") {
        if (serialVal) {
          out.roll_number = `STU-${serialVal}`;
        } else if (out.email && String(out.email).includes("@")) {
          const emailUser = String(out.email).split("@")[0].toUpperCase();
          out.roll_number = `TEMP-${emailUser.slice(0, 10)}`;
        } else {
          out.roll_number = `ROLL-${String(index + 1).padStart(3, "0")}`;
        }
        out._auto_generated_roll = true;
      }

      // 2. Name fallback if missing in file
      if (!out.full_name || String(out.full_name).trim() === "") {
        if (out.email && String(out.email).includes("@")) {
          const rawName = String(out.email).split("@")[0].replace(/[._]/g, " ");
          out.full_name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        } else {
          out.full_name = `Student #${index + 1}`;
        }
        out._auto_generated_name = true;
      }

      if (!out.department) out.department = "General";
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
 * NO HARD BLOCKING: Users can write details right now or import anyway and edit later.
 */
export function validateRows(rows: ParsedRow[]): ValidatedRow[] {
  return rows.map((row, i) => {
    const rowIndex = i + 1;
    const warnings: RowWarning[] = [];
    const errors: RowWarning[] = []; // Intentionally empty to avoid forceful blocking

    // 1. Roll number check
    const rollStr = String(row.roll_number ?? "").trim();
    if (!rollStr) {
      warnings.push({
        field: "roll_number",
        message: "This has problem with details: Roll number is missing (auto-assigned ID, can write now or edit later)",
      });
    } else if (row._auto_generated_roll || rollStr.startsWith("ROLL-") || rollStr.startsWith("TEMP-")) {
      warnings.push({
        field: "roll_number",
        message: "This has problem with details: Auto-assigned temporary Roll No (can write now or edit later)",
      });
    }

    // 2. Name check
    const nameStr = String(row.full_name ?? "").trim();
    if (!nameStr || row._auto_generated_name || nameStr.startsWith("Student #")) {
      warnings.push({
        field: "full_name",
        message: "This has problem with details: Student name is missing or placeholder (can write now or edit later)",
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

    const hasProblemWithDetails = warnings.length > 0;

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
    delete row._auto_generated_roll;
    delete row._auto_generated_name;

    row.has_problem_with_details = vr.hasProblemWithDetails;
    if (vr.warnings.length > 0) {
      row.detail_problems = vr.warnings.map((w) => `${w.field}: ${w.message}`);
    }

    return row;
  });
}
