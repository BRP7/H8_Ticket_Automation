// import { classifyEmailWithGPT } from "./gpt/classify.js";
// import { createH8Ticket } from "./h8.js";
// import {
//   fetchUnreadEmails,
//   markAsRead,
//   moveToFolder,
// } from "./outlook.js";
// import { logTicket } from "./utils/ticketLogger.js";
// import { withRetry } from "./utils/retry.js";
// import { isRetryableError } from "./utils/errorClassifier.js";
// import { sendMail } from "./utils/mailer.js";
// import {
//   ticketSuccessTemplate,
//   ticketDuplicateTemplate,
//   ticketFailureTemplate,
// } from "./utils/emailTemplates.js";
// import {
//   ackSuccessTemplate,
//   ackDuplicateTemplate,
//   ackFailureTemplate,
// } from "./utils/clientAckTemplates.js";
// import { replyToMessage } from "./outlook.js";


// function isSystemEmail(email = "") {
//   return (
//     email.includes("no-reply") ||
//     email.includes("noreply") ||
//     email.includes("postmaster") ||
//     email.includes("microsoft.com")
//   );
// }

// export async function pollInbox() {
//   console.log("📩 Poller started...");

//   const emails = await fetchUnreadEmails();
//   console.log(`📨 Fetched ${emails.length} unread emails`);

//   for (const mail of emails) {
//     let gptResult = null;
//     const clientEmail = mail.from?.emailAddress?.address || null;

//     try {
//       /* =========================
//          1️⃣ GPT CLASSIFICATION
//       ========================== */
//       gptResult = await classifyEmailWithGPT({
//         subject: mail.subject,
//         from: clientEmail,
//         body: mail.bodyText,
//       });

//       if (!gptResult.isIssue) {
//         await markAsRead(mail.id);
//         continue;
//       }

//       /* =========================
//          2️⃣ CREATE TICKET (WITH RETRY)
//       ========================== */
//       const ticketId = await withRetry(
//         () => createH8Ticket({
//           ...gptResult,
//           originalEmailBody: mail.bodyText,
//         }),
//         {
//           retries: 3,
//           delayMs: 7000,
//           onRetry: (err, attempt) => {
//             if (err.code === "DUPLICATE_CASE") throw err;
//             if (!isRetryableError(err)) throw err;
//             console.warn(`🔁 Retry ${attempt}:`, err.message);
//           },
//         }
//       );

//       /* =========================
//          3️⃣ SUCCESS HANDLING
//       ========================== */
//       logTicket({
//         circuitId: gptResult.circuitId,
//         ticketId,
//         emailId: mail.id,
//         from: clientEmail || "unknown@unknown",
//         status: "SUCCESS",
//       });

//       await markAsRead(mail.id);
//       await moveToFolder(mail.id, "H8-Processed").catch(() => {});

//       // Admin mail
//       const adminMail = ticketSuccessTemplate({
//         ticketId,
//         circuitId: gptResult.circuitId,
//       });

//       await sendMail({
//         to: process.env.NOTIFY_EMAIL,
//         subject: adminMail.subject,
//         html: adminMail.html,
//       });

//       // Client ACK
//       if (clientEmail && !isSystemEmail(clientEmail)) {
//         // const ack = ackSuccessTemplate({
//         //   ticketId,
//         //   circuitId: gptResult.circuitId,
//         // });

//       const bookedAt = new Date().toLocaleString("en-IN", {
//         timeZone: "Asia/Kolkata",
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: true,
//       });

//       const ack = ackSuccessTemplate({
//         ticketId,
//         circuitId: gptResult.circuitId,
//         bookedAt,
//       });

//         // await replyToMessage(
//         //   mail.id,
//         //   ack.html
//         // );

//         await replyToMessage(mail.id, ack.html);
//       }

//     } catch (err) {
//       /* =========================
//          4️⃣ FAILURE / DUPLICATE
//       ========================== */
//       logTicket({
//         circuitId: gptResult?.circuitId || "UNKNOWN",
//         ticketId: null,
//         emailId: mail.id,
//         from: clientEmail || "unknown@unknown",
//         status:
//           err.code === "DUPLICATE_CASE"
//             ? "DUPLICATE_CASE"
//             : "FAILED",
//       });

//       // DUPLICATE CASE
//       if (err.code === "DUPLICATE_CASE") {
//         const adminMail = ticketDuplicateTemplate({
//           circuitId: gptResult.circuitId,
//         });

//         await sendMail({
//           to: process.env.NOTIFY_EMAIL,
//           subject: adminMail.subject,
//           html: adminMail.html,
//         });

//         if (clientEmail && !isSystemEmail(clientEmail)) {
//           const ack = ackDuplicateTemplate({
//             circuitId: gptResult.circuitId,
//           });

//           await replyToMessage(mail.id, ack.html);
//         }

//         await markAsRead(mail.id);
//         continue;
//       }

//       // GENERAL FAILURE
//       const adminMail = ticketFailureTemplate({
//         circuitId: gptResult?.circuitId || "UNKNOWN",
//         error: err.message,
//       });

//       await sendMail({
//         to: process.env.NOTIFY_EMAIL,
//         subject: adminMail.subject,
//         html: adminMail.html,
//       });

//       if (clientEmail && !isSystemEmail(clientEmail)) {
//         const ack = ackFailureTemplate({
//           circuitId: gptResult?.circuitId || "UNKNOWN",
//         });

//         // await sendMail({
//         //   to: clientEmail,
//         //   subject: ack.subject,
//         //   html: ack.html,
//         // });
//         if (clientEmail && !isSystemEmail(clientEmail)) {
//           await replyToMessage(mail.id, ack.html);
//         }
//       }
//     }
//   }
// }


import { classifyEmailWithGPT } from "./gpt/classify.js";
import { createH8Ticket } from "./h8.js";
import { fetchInboxEmails, tagMessage, replyToMessage } from "./outlook.js";
import { logTicket } from "./utils/ticketLogger.js";
import { withRetry } from "./utils/retry.js";
import { isRetryableError } from "./utils/errorClassifier.js";
import {
  ackSuccessTemplate,
  ackDuplicateTemplate,
  ackFailureTemplate,
} from "./utils/clientAckTemplates.js";


/* =========================
   TAG CONSTANTS
========================= */
const TAGS = {
  PROCESSED: "H8-PROCESSED",
  OTHER: "H8-OTHER",
  DUPLICATE: "H8-DUPLICATE",
  FAILED: "H8-FAILED",
};

export async function pollInbox() {
  console.log("📩 Poller started (TAG based)");

  const emails = await fetchInboxEmails();
  console.log(`📨 Fetched ${emails.length} emails`);

  for (const mail of emails) {
    // ⛔ Skip already processed mails
    if (mail.categories?.some(c => c.startsWith("H8-"))) {
      continue;
    }

    let gptResult = null;
    const clientEmail = mail.from?.emailAddress?.address || "unknown";

    try {
      /* =========================
         1️⃣ GPT CLASSIFICATION
      ========================== */
      gptResult = await classifyEmailWithGPT({
        subject: mail.subject,
        from: clientEmail,
        body: mail.bodyText,
      });

      // NON-ISSUE MAIL
      if (!gptResult.isIssue) {
        await tagMessage(mail.id, TAGS.OTHER);
        continue;
      }

      /* =========================
         2️⃣ CREATE TICKET (RETRY)
      ========================== */
      const ticketId = await withRetry(
        () =>
          createH8Ticket({
            ...gptResult,
            originalEmailBody: mail.bodyText,
          }),
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

      /* =========================
         3️⃣ SUCCESS
      ========================== */
      logTicket({
        circuitId: gptResult.circuitId,
        ticketId,
        emailId: mail.id,
        from: clientEmail,
        status: "SUCCESS",
      });

      await tagMessage(mail.id, TAGS.PROCESSED);

      const bookedAt = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const ack = ackSuccessTemplate({
        ticketId,
        circuitId: gptResult.circuitId,
        bookedAt,
      });

      await replyToMessage(mail.id, ack.html);

    } catch (err) {
      /* =========================
         4️⃣ DUPLICATE
      ========================== */
      if (err.code === "DUPLICATE_CASE") {
        await tagMessage(mail.id, TAGS.DUPLICATE);

        const ack = ackDuplicateTemplate({
          circuitId: gptResult?.circuitId || "UNKNOWN",
        });

        await replyToMessage(mail.id, ack.html);
        continue;
      }

      /* =========================
         5️⃣ FAILURE
      ========================== */
      await tagMessage(mail.id, TAGS.FAILED);

      logTicket({
        circuitId: gptResult?.circuitId || "UNKNOWN",
        ticketId: null,
        emailId: mail.id,
        from: clientEmail,
        status: "FAILED",
      });

      const ack = ackFailureTemplate({
        circuitId: gptResult?.circuitId || "UNKNOWN",
      });

      await replyToMessage(mail.id, ack.html);
    }
  }
}
