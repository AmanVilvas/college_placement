import { randomUUID } from "node:crypto";
import { z } from "zod";

type BulkEmail = { email: string | null; subject: string; message: string; cc?: string[]; bcc?: string[] };

export async function sendBulkEmails(emails: BulkEmail[]) {
  const failures: { recipient: string; channel: string; error: string }[] = [];
  const accepted = new Set<string>();
  const valid = emails.filter((email) => {
    if (z.string().email().safeParse(email.email?.trim()).success) return true;
    failures.push({ recipient: email.email || "Student", channel: "email", error: email.email ? "Student email address is invalid." : "Student has no email address." });
    return false;
  });
  const apiKey = process.env.RESEND_API_KEY;
  const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim();
  let emailSent = 0;
  for (let offset = 0; offset < valid.length; offset += 100) {
    const batch = valid.slice(offset, offset + 100);
    try {
      if (!apiKey || !configuredFrom) throw new Error("Set RESEND_API_KEY and RESEND_FROM_EMAIL on the server.");
      const from = configuredFrom.includes("@") ? configuredFrom : `Placement Office <placements@${configuredFrom}>`;
      const idempotencyKey = randomUUID();
      for (let attempt = 0; ; attempt++) {
        const response = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
          body: JSON.stringify(batch.map((email) => ({ from, to: [email.email!.trim()], subject: email.subject, text: email.message,
            ...(email.cc?.length ? { cc: email.cc } : {}), ...(email.bcc?.length ? { bcc: email.bcc } : {}) }))),
        });
        if (response.status === 429 && attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message ?? result.error?.message ?? `Provider returned ${response.status}`);
        if (!Array.isArray(result.data) || result.data.length !== batch.length) throw new Error("Provider did not confirm all emails in the batch.");
        emailSent += batch.length;
        batch.forEach((email) => accepted.add(email.email!.trim()));
        break;
      }
    } catch (error) {
      batch.forEach((email) => failures.push({ recipient: email.email!, channel: "email", error: error instanceof Error ? error.message : "Email delivery failed." }));
    }
    if (offset + 100 < valid.length) await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return { emailSent, whatsappSent: 0, failures, accepted };
}
