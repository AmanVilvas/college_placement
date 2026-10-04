import { z } from "zod";
import { ApiError, apiError, currentProfile, developmentDatabaseQuery } from "@/lib/server/supabase";

export const runtime = "nodejs";
const staffRoles = new Set(["super_admin", "college_admin", "tpo", "coordinator", "admin-local"]);
const callSchema = z.object({ driveId: z.string().uuid(), studentId: z.string().uuid() });

type StoredCall = {
  id: string; student_id: string; drive_id: string; provider_call_id: string | null; status: string;
  summary: string | null; sentiment: string | null; call_duration_seconds: number | null; transcript: string | null;
  recording_url: string | null; created_at: string; role_title: string; company_name: string;
};

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() && value.toLowerCase() !== "false" ? value.trim() : null;
}

function providerRequestId(log: Record<string, unknown>) {
  const request = log.call_request_id;
  if (request && typeof request === "object" && "id" in request) return String((request as { id: unknown }).id);
  if (typeof request === "string" || typeof request === "number") return String(request);
  return null;
}

function durationSeconds(log: Record<string, unknown>) {
  const seconds = Number(log.call_duration_in_seconds);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds);
  const duration = textValue(log.call_duration);
  if (!duration) return null;
  const parts = duration.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
}

async function getStudentCalls(studentId: string, institutionId: string, campusId: string) {
  return developmentDatabaseQuery<StoredCall>(
    `select v.id, v.student_id, v.drive_id, v.provider_call_id, v.status, v.summary, v.sentiment,
            v.call_duration_seconds, v.transcript, v.recording_url, v.created_at,
            d.role_title, c.name as company_name
     from public.voice_call_events v
     join public.drives d on d.id=v.drive_id
     join public.companies c on c.id=d.company_id
     where v.student_id=$1 and v.institution_id=$2 and v.campus_id=$3
     order by v.created_at desc limit 100`,
    [studentId, institutionId, campusId],
  );
}

async function syncProviderCallDetails(calls: StoredCall[], studentId: string, institutionId: string, campusId: string) {
  const apiKey = process.env.OMNIDIM_API_KEY;
  const agentId = Number(process.env.OMNIDIM_AGENT_ID);
  const pending = new Set(calls.filter((call) => call.provider_call_id && call.status === "dispatched").map((call) => call.provider_call_id!));
  if (!apiKey || !Number.isSafeInteger(agentId) || agentId <= 0 || !pending.size) return;

  try {
    for (let page = 1; page <= 5 && pending.size; page += 1) {
      const response = await fetch(`https://backend.omnidim.io/api/v1/calls/logs?pageno=${page}&pagesize=150&agentid=${agentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) break;
      const payload = await response.json().catch(() => ({})) as { call_log_data?: Record<string, unknown>[] };
      const logs = Array.isArray(payload.call_log_data) ? payload.call_log_data : [];
      if (!logs.length) break;
      for (const log of logs) {
        const requestId = providerRequestId(log);
        if (!requestId || !pending.has(requestId)) continue;
        const status = textValue(log.call_status) || "dispatched";
        const summary = textValue(log.sentiment_analysis_details);
        const sentiment = textValue(log.sentiment_score);
        const transcript = textValue(log.call_conversation);
        const recordingUrl = textValue(log.recording_url);
        await developmentDatabaseQuery(
          `update public.voice_call_events set status=$1, summary=$2, sentiment=$3,
             call_duration_seconds=$4, transcript=$5, recording_url=$6,
             provider_response=provider_response || $7::jsonb, updated_at=now()
           where provider_call_id=$8 and student_id=$9 and institution_id=$10 and campus_id=$11`,
          [status, summary, sentiment, durationSeconds(log), transcript, recordingUrl,
            JSON.stringify({ callLogId: log.id ?? null, syncedFromProvider: true }), requestId,
            studentId, institutionId, campusId],
        );
        pending.delete(requestId);
      }
      if (logs.length < 150) break;
    }
  } catch (error) {
    console.error("Could not sync OmniDim call history:", error instanceof Error ? error.message : "Provider request failed");
  }
}

function e164IndianPhone(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length > 10 && trimmed.startsWith("00")) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

export async function GET(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!staffRoles.has(profile.role)) throw new ApiError(403, "Only placement staff can view student call history.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(403, "Placement office is not linked to a campus.");
    const studentId = z.string().uuid().parse(new URL(request.url).searchParams.get("studentId"));
    const calls = await getStudentCalls(studentId, profile.institution_id, profile.campus_id);
    await syncProviderCallDetails(calls, studentId, profile.institution_id, profile.campus_id);
    return Response.json({ data: await getStudentCalls(studentId, profile.institution_id, profile.campus_id) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    if (!staffRoles.has(profile.role)) throw new ApiError(403, "Only placement staff can start a student call.");
    if (!profile.institution_id || !profile.campus_id) throw new ApiError(403, "Placement office is not linked to a campus.");
    const input = callSchema.parse(await request.json());
    const rows = await developmentDatabaseQuery<{
      student_id: string; student_name: string; roll_number: string; phone: string | null;
      drive_id: string; drive_name: string; company_name: string;
    }>(
      `select s.id as student_id, s.full_name as student_name, s.roll_number, s.phone,
              d.id as drive_id, d.role_title as drive_name, c.name as company_name
       from public.student_profiles s
       join public.drives d on d.id=$1 and d.institution_id=s.institution_id and d.campus_id=s.campus_id
       join public.companies c on c.id=d.company_id
       where s.id=$2 and s.institution_id=$3 and s.campus_id=$4
         and d.status in ('Open','Closing Soon')
         and (d.application_deadline is null or d.application_deadline >= current_date)
         and case when jsonb_typeof(d.eligibility->'branches')='array'
           then jsonb_array_length(d.eligibility->'branches')=0 or d.eligibility->'branches' ? s.department
           else true end
         and coalesce(nullif(d.eligibility->>'minCGPA','')::numeric,0) <= coalesce(s.cgpa,0)
         and coalesce(nullif(d.eligibility->>'maxBacklogs','')::integer,2147483647) >= coalesce(s.backlogs,0)
       limit 1`,
      [input.driveId, input.studentId, profile.institution_id, profile.campus_id],
    );
    const student = rows[0];
    if (!student) throw new ApiError(404, "Eligible student or active drive was not found for this campus.");
    if (!student.phone?.trim()) throw new ApiError(400, "This student has no phone number on their placement profile.");
    const apiKey = process.env.OMNIDIM_API_KEY;
    const agentId = Number(process.env.OMNIDIM_AGENT_ID);
    if (!apiKey) throw new ApiError(503, "Set OMNIDIM_API_KEY on the server to enable calls.");
    if (!Number.isSafeInteger(agentId) || agentId <= 0) throw new ApiError(503, "Set OMNIDIM_AGENT_ID to the voice assistant ID from your OmniDim dashboard.");

    const response = await fetch("https://backend.omnidim.io/api/v1/calls/dispatch", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: agentId,
        to_number: e164IndianPhone(student.phone),
        call_context: {
          student_name: student.student_name,
          user_name: student.student_name,
          roll_number: student.roll_number,
          company_name: student.company_name,
          drive_name: student.drive_name,
        },
        metadata: { student_id: student.student_id, drive_id: student.drive_id },
        __languages: ["Hindi", "English"],
      }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const providerMessage = typeof result.error === "string" ? result.error : typeof result.message === "string" ? result.message : `HTTP ${response.status}`;
      throw new ApiError(502, `OmniDim could not dispatch the call: ${providerMessage}`);
    }
    const requestId = result.requestId == null ? null : String(result.requestId);
    let callLogSaved = true;
    try {
      await developmentDatabaseQuery(
        `insert into public.voice_call_events (institution_id, campus_id, student_id, drive_id, requested_by, provider_call_id, status, provider_response)
         values ($1,$2,$3,$4,$5,$6,'dispatched',$7::jsonb)`,
        [profile.institution_id, profile.campus_id, student.student_id, student.drive_id,
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profile.id) ? profile.id : null,
          requestId, JSON.stringify({ success: result.success, status: result.status, requestId })],
      );
    } catch (error) {
      callLogSaved = false;
      console.error("OmniDim dispatched a call, but its local call log could not be saved:", error);
    }
    return Response.json({ data: { accepted: true, studentName: student.student_name, requestId, callLogSaved } }, { status: 202 });
  } catch (error) { return apiError(error); }
}
