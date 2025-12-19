import { classifyEmailWithGPT } from "./gpt/classify.js";
import { createH8Ticket } from "./h8.js";
import {
  fetchUnreadEmails,
  markAsRead,
  moveToFolder,
} from "./outlook.js";
import { logTicket } from "./utils/ticketLogger.js";

export async function pollInbox() {
  console.log("📩 Poller started...");

  const emails = await fetchUnreadEmails();
  console.log(`📨 Fetched ${emails.length} unread emails`);

  for (const mail of emails) {
    try {
      console.log("🔍 Processing:", mail.subject);

      /* =========================
         1️⃣ GPT CLASSIFICATION
      ========================== */
      
      const gptResult = await classifyEmailWithGPT({
        subject: mail.subject,
        from: mail.from?.emailAddress?.address,
        body: mail.bodyText,
      });

      console.log("result",gptResult);

      /* =========================
         2️⃣ NOT A REAL ISSUE
      ========================== */
      if (!gptResult.isIssue) {
        console.log("🟡 Not an issue. Ignoring email.");

        logTicket({
          circuitId: null,
          ticketId: null,
          emailId: mail.id,
          status: "IGNORED",
        });

        // await markAsRead(mail.id);

        // Move ONLY if folder exists
        try {
          await moveToFolder(mail.id, "H8-Ignored");
        } catch {
          console.warn(
            "⚠️ Folder H8-Ignored not found. Mail left in Inbox."
          );
        }

        continue;
      }

      /* =========================
         3️⃣ CREATE H8 TICKET
      ========================== */
      console.log("🛠 Creating H8 ticket...");

      const ticketId = await createH8Ticket(gptResult);

      console.log("✅ Ticket created:", ticketId);

      /* =========================
         4️⃣ SUCCESS HANDLING
      ========================== */
      logTicket({
        circuitId: gptResult.circuitId,
        ticketId,
        emailId: mail.id,
        status: "SUCCESS",
      });

      await markAsRead(mail.id);

      try {
        await moveToFolder(mail.id, "H8-Processed");
      } catch {
        console.warn(
          "⚠️ Folder H8-Processed not found. Mail left in Inbox."
        );
      }

    } catch (err) {
      /* =========================
         5️⃣ FAILURE HANDLING
      ========================== */
      console.error("❌ Failed:", err.message);

      logTicket({
        circuitId: "UNKNOWN",
        ticketId: null,
        emailId: mail.id,
        status: "FAILED",
      });

      // DO NOT mark as read → allows retry
      try {
        await moveToFolder(mail.id, "H8-Failed");
      } catch {
        console.warn(
          "⚠️ Folder H8-Failed not found. Mail left in Inbox for retry."
        );
      }
    }
  }
}
