import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { apiError, ApiError, developmentDatabaseQuery } from "@/lib/server/supabase";
import { ownStudentScope, ownStudentWhere } from "@/lib/server/studentProfile";

export const runtime = "nodejs";
export const maxDuration = 20;

type PdfTextItem = { str?: string; transform?: number[]; hasEOL?: boolean };
const sectionHeading = /^(?:technical\s+skills?|skills?(?:\s*(?:&|and)\s*(?:tools?|technologies?))?|core\s+competencies|technologies|tech\s+stack|tools?|projects?|selected\s+projects?|academic\s+projects?|professional\s+summary|summary|profile|career\s+objective|objective|experience|work\s+experience|education|certifications?|achievements?|interests?|languages?|publications?)(?:\s*[:–—-].*)?$/i;
const projectHeading = /^(?:projects?|selected\s+projects?|academic\s+projects?)\b/i;
const skillHeading = /^(?:technical\s+skills?|skills?(?:\s*(?:&|and)\s*(?:tools?|technologies?))?|core\s+competencies|technologies|tech\s+stack|tools?)\b/i;

function tidy(value: string) {
  return value.replace(/[\u2022\u25aa\u25cf\u2013\u2014]/g, " ").replace(/\s+/g, " ").trim();
}

function linesFrom(items: PdfTextItem[]) {
  const rows: { y: number; entries: { x: number; text: string }[] }[] = [];
  for (const item of items) {
    const value = item.str?.trim();
    if (!value) continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    let row = rows.find((entry) => Math.abs(entry.y - y) < 3);
    if (!row) { row = { y, entries: [] }; rows.push(row); }
    row.entries.push({ x, text: value });
  }
  return rows.sort((a, b) => b.y - a.y).map((row) =>
    tidy(row.entries.sort((a, b) => a.x - b.x).map((entry) => entry.text).join(" "))
  ).filter(Boolean);
}

function sectionLines(lines: string[], heading: RegExp) {
  const index = lines.findIndex((line) => heading.test(line));
  if (index < 0) return [];
  const first = lines[index].replace(heading, "").replace(/^[:–—-]\s*/, "").trim();
  const body = first ? [first] : [];
  for (const line of lines.slice(index + 1)) {
    if (sectionHeading.test(line)) break;
    body.push(line);
  }
  return body;
}

function extractSkills(lines: string[]) {
  const body = sectionLines(lines, skillHeading);
  const categoryOnly = /^(?:programming\s+languages?|languages?|frameworks?|libraries|databases?|tools?|platforms?|web\s+technologies|cloud|operating\s+systems?|coursework|soft\s+skills?)$/i;
  const results = new Set<string>();
  for (const line of body) {
    const value = line.replace(/^[^:]{1,36}:\s*/, "");
    for (const token of value.split(/[,;|•·]+/)) {
      const skill = tidy(token).replace(/^[•*-]+\s*/, "").replace(/[.]$/, "");
      if (skill.length >= 2 && skill.length <= 48 && !categoryOnly.test(skill) && !sectionHeading.test(skill)) results.add(skill);
    }
  }
  return [...results].slice(0, 40);
}

function extractProjects(lines: string[]) {
  const body = sectionLines(lines, projectHeading);
  return body.map((line) => tidy(line.replace(/^[•*\-–—]\s*/, "")))
    .filter((line) => line.length > 12 && !/^\(?\d{4}\)?$/.test(line))
    .slice(0, 8);
}

function extractSummary(lines: string[], skills: string[], projects: string[]) {
  for (const heading of [/^(?:professional\s+summary|summary|profile)\b/i, /^(?:career\s+objective|objective)\b/i]) {
    const section = sectionLines(lines, heading).join(" ");
    if (section.length > 40) return section.slice(0, 1200);
  }
  const details = [
    skills.length ? `Skills listed in the resume: ${skills.join(", ")}.` : "",
    projects.length ? `Resume project details: ${projects.slice(0, 2).join("; ")}.` : "",
  ].filter(Boolean);
  return details.join(" ");
}

export async function GET() {
  try {
    const scope = await ownStudentScope();
    const rows = await developmentDatabaseQuery<{ file_data: Buffer; file_name: string }>(
      `select r.file_data, r.file_name from placement_private.student_resumes r
       join public.student_profiles s on s.id = r.student_id where ${ownStudentWhere}`, scope);
    const resume = rows[0];
    if (!resume) throw new ApiError(404, "Upload a resume to build this portfolio from your experience.");
    if (!resume.file_name.toLowerCase().endsWith(".pdf")) throw new ApiError(415, "Resume text extraction currently supports PDF files. Your uploaded document is still saved and available to download.");
    // Next/Turbopack bundles this handler away from pdfjs' worker. Point PDF.js
    // to its installed Node worker instead of its bundle-relative default path.
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(resume.file_data), useSystemFonts: true });
    const document = await loadingTask.promise;
    const pagesRead = Math.min(document.numPages, 25);
    const lines: string[] = [];
    try {
      for (let pageNo = 1; pageNo <= pagesRead; pageNo++) {
        const page = await document.getPage(pageNo);
        lines.push(...linesFrom((await page.getTextContent()).items as PdfTextItem[]));
      }
    } finally {
      await loadingTask.destroy();
    }
    const skills = extractSkills(lines);
    const projects = extractProjects(lines);
    const summary = extractSummary(lines, skills, projects);
    if (!summary && !skills.length && !projects.length) {
      throw new ApiError(422, "This PDF has no selectable text to extract. It may be a scan; upload a text-based PDF to build the portfolio automatically.");
    }
    return Response.json({ data: { fileName: resume.file_name, summary, skills, projects, pagesRead } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
