import { fetchUnreadEmails, moveEmail } from "./outlook.js";
import { classifyEmailWithGPT } from "./gptClassifier.js";
import { createH8Ticket } from "./h8.js";

export async function pollInbox() {
  console.log("Polling inbox...");

  const emails = await fetchUnreadEmails();

  if (!emails.length) {
    console.log("📭 No new emails");
    return;
  }

  for (const mail of emails) {
    try {
      const emailText = `
Subject: ${mail.subject || ""}
From: ${mail.from?.emailAddress?.address || ""}
Body: ${mail.bodyText || ""}
      `;

      // 1️⃣ Ask GPT
      const gptResult = await classifyEmailWithGPT(emailText);

      if (!gptResult.isIssue) {
        await moveEmail(mail.id, "H8_IGNORED");
        continue;
      }

      if (!gptResult.circuitId) {
        throw new Error("Circuit ID missing");
      }

      // 2️⃣ Create H8 ticket
      const ticketId = await createH8Ticket(
        gptResult.circuitId,
        gptResult
      );

      console.log(`✅ Ticket created: ${ticketId}`);

      // 3️⃣ Move mail to processed
      await moveEmail(mail.id, "H8_PROCESSED");

    } catch (err) {
      console.error("❌ Processing failed:", err.message);
      await moveEmail(mail.id, "H8_FAILED");
    }
  }
}
