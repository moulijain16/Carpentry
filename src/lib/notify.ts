/**
 * Sends an SMS through Twilio when configured.
 * Without Twilio, the notification is still recorded in Turso.
 */

import { queryOne, run } from "@/lib/db";
import { itemSummary, type Enquiry } from "@/lib/domain";

async function record(
  enquiryId: number,
  channel: string,
  message: string,
  status: string,
  detail?: string,
) {
  await run(
    `INSERT INTO notifications
      (enquiry_id, channel, message, status, detail, at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      enquiryId,
      channel,
      message,
      status,
      detail ?? null,
      new Date().toISOString(),
    ],
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

    await record(
      enquiry.id,
      "sms",
      message,
      "skipped",
      "SMS provider not configured",
    );

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
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: message,
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`Twilio responded ${res.status}`);
    }

    await record(enquiry.id, "sms", message, "sent");
  } catch (err) {
    console.error("[notify:sms-failed]", err);

    await record(
      enquiry.id,
      "sms",
      message,
      "failed",
      String(err),
    );
  }
}

/** Unread-style count for the dashboard. */
export async function newEnquiryCount(): Promise<number> {
  const row = await queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c
     FROM enquiries
     WHERE status = 'New'`,
  );

  return Number(row?.c ?? 0);
}