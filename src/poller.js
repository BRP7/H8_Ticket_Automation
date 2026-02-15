import {
  fetchInboxEmails,
  tagMessage,
} from "./outlook.js";

import { enqueue } from "./utils/queue.js";

let polling = false;

export async function pollInbox() {
  if (polling) return;
  polling = true;

    try {
      const emails = await fetchInboxEmails();

      if (!emails.length) {
        console.log("📭 No new emails");
        return;
      }

      let enqueuedCount = 0;
      let latestTimestamp = null;
      for (const mail of emails) {
        enqueue(mail);
        await tagMessage(mail.id, "H8-QUEUED");

        enqueuedCount++;

        // Track newest timestamp processed
        if (
          !latestTimestamp ||
          new Date(mail.receivedDateTime) > new Date(latestTimestamp)
        ) {
          latestTimestamp = mail.receivedDateTime;
        }
      }
    } catch (err) {
      console.error("❌ Polling failed:", err.message);
    } finally {
      polling = false;
    }
  }
