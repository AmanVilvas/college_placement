type Recipient = { name?: string; email?: string | null; phone?: string | null };

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data?.message ?? data?.error?.message ?? data?.error ?? `Provider returned ${response.status}`;
}

export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!response.ok) throw new Error(await responseError(response));
}

export async function sendWhatsApp(recipient: Recipient, title: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!token || !phoneNumberId || !template) throw new Error("WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TEMPLATE_NAME.");
  if (!recipient.phone) throw new Error("Student has no phone number.");
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to: recipient.phone.replace(/[^\d]/g, ""), type: "template",
      template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" }, components: [{ type: "body", parameters: [{ type: "text", text: title.slice(0, 1024) }, { type: "text", text: message.slice(0, 1024) }] }] },
    }),
  });
  if (!response.ok) throw new Error(await responseError(response));
}

export async function deliverBatch<T extends Recipient>(recipients: T[], channels: { email: boolean; whatsapp: boolean }, subject: string, message: string) {
  let emailSent = 0, whatsappSent = 0;
  const failures: { recipient: string; channel: string; error: string }[] = [];
  for (let offset = 0; offset < recipients.length; offset += 8) {
    await Promise.all(recipients.slice(offset, offset + 8).flatMap((recipient) => {
      const label = recipient.email || recipient.phone || recipient.name || "Student";
      const sends: Promise<void>[] = [];
      if (channels.email && recipient.email) sends.push(sendEmail(recipient.email, subject, message).then(() => { emailSent++; }).catch((error) => { failures.push({ recipient: label, channel: "email", error: error instanceof Error ? error.message : "Delivery failed" }); }));
      else if (channels.email) failures.push({ recipient: label, channel: "email", error: "Student has no email address." });
      if (channels.whatsapp) sends.push(sendWhatsApp(recipient, subject, message).then(() => { whatsappSent++; }).catch((error) => { failures.push({ recipient: label, channel: "whatsapp", error: error instanceof Error ? error.message : "Delivery failed" }); }));
      return sends;
    }));
  }
  return { emailSent, whatsappSent, failures };
}
