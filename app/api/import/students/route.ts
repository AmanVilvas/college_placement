import { z } from "zod";
import { apiError, ApiError, currentProfile, databaseRequest } from "@/lib/server/supabase";

// Flexible row schema: accommodates 4-5 columns or 20+ columns without crashing
const rowSchema = z.object({
  roll_number: z.string().min(1),
  full_name: z.string().optional().default("Unknown Student"),
  email: z.string().optional().nullable().or(z.literal("")),
  department: z.string().optional().default("General"),
  section: z.string().optional().nullable(),
  year_of_study: z.coerce.number().int().optional().nullable(),
  graduation_year: z.coerce.number().int().optional().nullable(),
  phone: z.string().optional().nullable(),
  cgpa: z.coerce.number().optional().nullable(),
  tenth_percent: z.coerce.number().optional().nullable(),
  twelfth_percent: z.coerce.number().optional().nullable(),
  backlogs: z.coerce.number().int().optional().default(0),
  skills: z.string().optional().nullable(), // comma-separated
  extra_fields: z.string().optional().nullable(),
  has_problem_with_details: z.boolean().optional(),
  detail_problems: z.array(z.string()).optional(),
});

// Allow up to 2000 rows per batch
const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    const { profile } = await currentProfile();
    const isStaff = ["super_admin", "college_admin", "tpo", "coordinator"].includes(profile.role);
    if (!isStaff) throw new ApiError(403, "Only placement staff can import student data.");

    const raw = bodySchema.parse(await request.json());
    const { institution_id, campus_id } = profile;

    if (!institution_id || !campus_id) {
      throw new ApiError(400, "Your account is not linked to a campus. Please contact a super admin.");
    }

    const results: { roll_number: string; status: "upserted" | "error"; error?: string }[] = [];

    for (const row of raw.rows) {
      try {
        const skillsArray = row.skills
          ? row.skills.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        // Clamp cgpa safely to avoid postgres numeric(4,2) overflow if 100 is supplied
        const safeCgpa =
          row.cgpa !== null && row.cgpa !== undefined && !isNaN(Number(row.cgpa))
            ? Math.min(Math.max(Number(row.cgpa), 0), 99.99)
            : null;

        const safeTenth =
          row.tenth_percent !== null && row.tenth_percent !== undefined && !isNaN(Number(row.tenth_percent))
            ? Math.min(Math.max(Number(row.tenth_percent), 0), 100)
            : null;

        const safeTwelfth =
          row.twelfth_percent !== null && row.twelfth_percent !== undefined && !isNaN(Number(row.twelfth_percent))
            ? Math.min(Math.max(Number(row.twelfth_percent), 0), 100)
            : null;

        const studentProfilePayload = {
          department: row.department || "General",
          section: row.section ?? null,
          year_of_study: row.year_of_study ?? null,
          graduation_year: row.graduation_year ?? null,
          phone: row.phone ?? null,
          cgpa: safeCgpa,
          tenth_percent: safeTenth,
          twelfth_percent: safeTwelfth,
          backlogs: row.backlogs ?? 0,
          skills: skillsArray,
        };

        const emailClean = row.email && String(row.email).trim() ? String(row.email).trim() : null;

        // 1. If valid email provided, match auth user if present
        let matchedUserId: string | null = null;
        if (emailClean && emailClean.includes("@")) {
          try {
            const { body: existingProfiles } = await databaseRequest(
              `profiles?email=eq.${encodeURIComponent(emailClean)}&institution_id=eq.${institution_id}&select=id`
            );
            const existingProfile = Array.isArray(existingProfiles) ? existingProfiles[0] : null;
            if (existingProfile?.id) {
              matchedUserId = existingProfile.id;
            }
          } catch {
            // ignore lookup error
          }
        }

        // 2. Check if a student_profile already exists by roll_number in this campus
        const { body: existingSP } = await databaseRequest(
          `student_profiles?campus_id=eq.${campus_id}&roll_number=eq.${encodeURIComponent(row.roll_number)}&select=id,user_id,profile_data`
        );
        const sp = Array.isArray(existingSP) ? existingSP[0] : null;

        let parsedExtra: Record<string, unknown> = {};
        if (row.extra_fields) {
          try {
            parsedExtra = JSON.parse(row.extra_fields);
          } catch {
            /* ignore */
          }
        }

        const profileData = {
          ...(sp?.profile_data || {}),
          ...parsedExtra,
          imported_name: row.full_name || "Unknown Student",
          email: emailClean,
          has_problem_with_details: Boolean(row.has_problem_with_details),
          detail_problems: row.detail_problems || [],
        };

        if (sp) {
          // Update the existing student_profile record
          const updatePayload: Record<string, unknown> = {
            ...studentProfilePayload,
            full_name: row.full_name || "Unknown Student",
            email: emailClean,
            profile_data: profileData,
          };
          if (!sp.user_id && matchedUserId) {
            updatePayload.user_id = matchedUserId;
          }

          try {
            await databaseRequest(`student_profiles?id=eq.${sp.id}`, {
              method: "PATCH",
              body: JSON.stringify(updatePayload),
              headers: { Prefer: "return=minimal" },
            });
          } catch {
            // Fallback for schema before direct full_name/email columns
            delete updatePayload.full_name;
            delete updatePayload.email;
            await databaseRequest(`student_profiles?id=eq.${sp.id}`, {
              method: "PATCH",
              body: JSON.stringify(updatePayload),
              headers: { Prefer: "return=minimal" },
            });
          }

          if (matchedUserId && row.full_name) {
            await databaseRequest(`profiles?id=eq.${matchedUserId}`, {
              method: "PATCH",
              body: JSON.stringify({ full_name: row.full_name }),
              headers: { Prefer: "return=minimal" },
            }).catch(() => undefined);
          }

          results.push({ roll_number: row.roll_number, status: "upserted" });
          continue;
        }

        // 3. Insert directly into student_profiles
        const insertPayload: Record<string, unknown> = {
          institution_id,
          campus_id,
          roll_number: row.roll_number,
          full_name: row.full_name || "Unknown Student",
          email: emailClean,
          user_id: matchedUserId,
          ...studentProfilePayload,
          profile_data: profileData,
        };

        try {
          await databaseRequest("student_profiles", {
            method: "POST",
            body: JSON.stringify(insertPayload),
            headers: { Prefer: "return=minimal" },
          });
        } catch {
          // Fallback if full_name/email columns are not yet added
          delete insertPayload.full_name;
          delete insertPayload.email;
          await databaseRequest("student_profiles", {
            method: "POST",
            body: JSON.stringify(insertPayload),
            headers: { Prefer: "return=minimal" },
          });
        }

        results.push({ roll_number: row.roll_number, status: "upserted" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ roll_number: row.roll_number, status: "error", error: message });
      }
    }

    const successCount = results.filter((r) => r.status === "upserted").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return Response.json({ success: true, successCount, errorCount, results }, { status: 200 });
  } catch (error) {
    return apiError(error);
  }
}
