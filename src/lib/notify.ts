/**
 * "I should get a notification on my phone when a new enquiry comes in."
 *
 * Sends an SMS through Twilio when TWILIO_* env vars are configured. With no
 * provider configured the message is still recorded in the notifications table
 * (and logged), so nothing is silently lost and the dashboard bell still works.
 */
import { db } from "@/lib/db";
import { itemSummary, type Enquiry } from "@/lib/domain";

function record(
  enquiryId: number,
  channel: string,
  message: string,
  status: string,
  detail?: string,
) {
  db.prepare(
    `INSERT INTO notifications (enquiry_id, channel, message, status, detail, at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    enquiryId,
    channel,
    message,
    status,
    detail ?? null,
    new Date().toISOString(),
  );
}

export async function notifyNewEnquiry(enquiry: Enquiry): Promise<void> {
  const message =
    `New enquiry #${enquiry.id} — ${enquiry.customerName} (${enquiry.phone}): ` +
    `${itemSummary(enquiry.items)}.`;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.WORKSHOP_PHONE_NUMBER;

  if (!sid || !token || !from || !to) {
    console.info(`[notify:sms-not-configured] ${message}`);
    record(enquiry.id, "sms", message, "skipped", "SMS provider not configured");
    return;
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: to, Body: message }),
      },
    );
    if (!res.ok) throw new Error(`Twilio responded ${res.status}`);
    record(enquiry.id, "sms", message, "sent");
  } catch (err) {
    console.error("[notify:sms-failed]", err);
    record(enquiry.id, "sms", message, "failed", String(err));
  }
}

/** Unread-style count for the dashboard: enquiries still sitting at New. */
export function newEnquiryCount(): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM enquiries WHERE status = 'New'`)
    .get() as { c: number };
  return Number(row.c);
}
