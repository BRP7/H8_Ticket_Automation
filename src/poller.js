import {
  fetchInboxEmails,
  tagMessage,
} from "./outlook.js";

import { enqueue } from "./utils/queue.js";
import { writeLog } from "./utils/logger.js";

let polling = false;

/* =====================================================
   POLL INBOX
===================================================== */

export async function pollInbox() {
  if (polling) return;

  polling = true;

  try {
    const emails = await fetchInboxEmails();

    if (!emails || emails.length === 0) {
      writeLog({
        level: "debug",
        type: "POLL_EMPTY",
        message: "No new emails"
      });
      return;
    }

    let enqueuedCount = 0;

for (const mail of emails) {
  try {

    await tagMessage(mail.id, "H8-QUEUED");

    enqueue(mail);

    enqueuedCount++;

    writeLog({
      level: "info",
      type: "MAIL_ENQUEUED",
      messageId: mail.id,
      subject: mail.subject,
      from: mail.from?.emailAddress?.address || "unknown"
    });

  } catch (err) {
    writeLog({
      level: "error",
      type: "MAIL_ENQUEUE_FAILED",
      messageId: mail.id,
      error: err.message
    });
  }
}

    writeLog({
      level: "info",
      type: "POLL_COMPLETED",
      message: `Enqueued ${enqueuedCount} emails`
    });

  } catch (err) {
    writeLog({
      level: "error",
      type: "POLL_FAILED",
      message: err.message
    });
  } finally {
    polling = false;
  }
}
