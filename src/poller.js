import { classifyEmailWithGPT } from "./gpt/classify.js";
import { createH8Ticket } from "./h8.js";
import {
  fetchUnreadEmails,
  markAsRead,
  moveToFolder,
} from "./outlook.js";
import { logTicket } from "./utils/ticketLogger.js";
import { withRetry } from "./utils/retry.js";
import { isRetryableError } from "./utils/errorClassifier.js";
import { sendMail } from "./utils/mailer.js";
import {
  ticketSuccessTemplate,
  ticketDuplicateTemplate,
  ticketFailureTemplate,
} from "./utils/emailTemplates.js";


export async function pollInbox() {
  console.log("📩 Poller started...");

  const emails = await fetchUnreadEmails();
  console.log(`📨 Fetched ${emails.length} unread emails`);

  for (const mail of emails) {
    let gptResult = null;

    try {
      gptResult = await classifyEmailWithGPT({
        subject: mail.subject,
        from: mail.from?.emailAddress?.address,
        body: mail.bodyText,
      });

      if (!gptResult.isIssue) {
        await markAsRead(mail.id);
        continue;
      }

      const ticketId = await withRetry(
        () => createH8Ticket(gptResult),
        {
          retries: 3,
          delayMs: 7000,
          onRetry: (err, attempt) => {
            if (err.code === "DUPLICATE_CASE") throw err;
            if (!isRetryableError(err)) throw err;
            console.warn(`🔁 Retry ${attempt}:`, err.message);
          },
        }
      );

      logTicket({
        circuitId: gptResult.circuitId,
        ticketId,
        emailId: mail.id,
        from: mail.from?.emailAddress?.address || "unknown@unknown",
        status: "SUCCESS",
      });

      await markAsRead(mail.id);
      await moveToFolder(mail.id, "H8-Processed").catch(() => {});

      const mailContent = ticketSuccessTemplate({
        ticketId,
        circuitId: gptResult.circuitId,
      });

      await sendMail({
        to: process.env.NOTIFY_EMAIL, // admin email
        subject: mailContent.subject,
        html: mailContent.html,
      });
    } catch (err) {
      logTicket({
        circuitId: gptResult?.circuitId || "UNKNOWN",
        ticketId: null,
        emailId: mail.id,
        from: mail.from?.emailAddress?.address || "unknown@unknown",
        status:
          err.code === "DUPLICATE_CASE"
            ? "DUPLICATE_CASE"
            : "FAILED",
      });

      if (err.code === "DUPLICATE_CASE") {
        const mailContent = ticketDuplicateTemplate({
          circuitId: gptResult.circuitId,
        });

        await sendMail({
          to: process.env.NOTIFY_EMAIL,
          subject: mailContent.subject,
          html: mailContent.html,
        });

        await markAsRead(mail.id);
        continue;
      }

      const mailContent = ticketFailureTemplate({
        circuitId: gptResult?.circuitId || "UNKNOWN",
        error: err.message,
      });

      await sendMail({
        to: process.env.NOTIFY_EMAIL,
        subject: mailContent.subject,
        html: mailContent.html,
      });

    }
  }
}
