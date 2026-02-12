// import { dequeue, getQueueLength } from "./utils/queue.js";
// import { classifyEmailWithGPT } from "./gpt/classify.js";
// // import { applyKeywordBackMapping } from "./gpt/keywordEngine.js";
// import { createH8Ticket } from "./h8.js";
// import { tagMessage, replyToMessage } from "./outlook.js";
// import { logHistory } from "./utils/historyLogger.js";
// import { getTestCircuitId } from "./utils/testCircuitManager.js";
// import { mapToTicketCategory } from "./gpt/keywordEngine.js";


// const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_WORKERS || "5");
// const RETRY_LIMIT = 2;

// let active = 0;
// let running = false;

// export function startWorker() {
//   if (running) return;
//   running = true;

//   console.log(`🧵 Worker started with concurrency: ${MAX_CONCURRENT}`);

//   setInterval(processQueue, 500);
// }

// async function processQueue() {
//   if (active >= MAX_CONCURRENT) return;

//   const job = dequeue();
//   if (!job) return;

//   active++;

//   handleJob(job)
//     .catch(err => console.error("Unhandled worker error:", err))
//     .finally(() => {
//       active--;
//     });
// }

// async function handleJob(job) {
//   let attempt = 0;

//   while (attempt <= RETRY_LIMIT) {
//     try {
//       console.log(`🔵 Processing: ${job.subject}`);

//       // 1️⃣ GPT detection only
//       const gpt = await classifyEmailWithGPT({
//         subject: job.subject,
//         body: job.bodyText
//       });

//       if (!gpt.isIssue) {
//         await tagMessage(job.id, "H8-OTHER");
//         await logHistory(job, gpt, "NOT_ISSUE");
//         return;
//       }

//       // 2️⃣ Deterministic mapping
//       const mapping = mapToTicketCategory(job, gpt);

//       let finalTicket;

//       if (mapping) {
//         finalTicket = {
//           ...gpt,
//           ...mapping
//         };
//       }
//       else if (gpt.circuitId) {
//         // fallback rule
//         finalTicket = {
//           ...gpt,
//           caseReasonCategory: "Service Affecting",
//           subCategory: "Link Down",
//           subSubCategory: "Link Hard Down",
//           priority: "High"
//         };
//       }
//       else {
//         await tagMessage(job.id, "H8-MANUAL");
//         await logHistory(job, gpt, "NO_CATEGORY_NO_CIRCUIT");
//         return;
//       }

//       // 3️⃣ TEST MODE circuit override
//       if (process.env.APP_MODE === "TEST") {
//         finalTicket.circuitId = getTestCircuitId();
//         console.log("🧪 TEST MODE - Circuit overridden:", finalTicket.circuitId);
//       }

//       if (!finalTicket.circuitId) {
//         await tagMessage(job.id, "H8-MANUAL");
//         await logHistory(job, finalTicket, "NO_CIRCUIT");
//         return;
//       }

//       // 4️⃣ Create ticket
//       const ticketId = await createH8Ticket({
//         ...finalTicket,
//         originalEmailBody: job.bodyText
//       });

//       console.log("✅ Ticket created:", ticketId);

//       // 5️⃣ Reply ONLY in PROD
//       if (
//         process.env.APP_MODE === "PROD" &&
//         job.from?.emailAddress?.address
//       ) {
//         await replyToMessage(
//           job.id,
//           `<b>Ticket Created:</b> ${ticketId}<br/>Our team is investigating.`
//         );
//       }

//       // 6️⃣ Log success
//       await logHistory(job, finalTicket, "SUCCESS", ticketId);

//       // 7️⃣ Tag processed
//       await tagMessage(job.id, "H8-PROCESSED");

//       return;

//     } catch (err) {
//       attempt++;
//       console.error(`⚠ Attempt ${attempt} failed`, err.message);

//       if (attempt > RETRY_LIMIT) {
//         await tagMessage(job.id, "H8-FAILED");
//         await logHistory(job, null, "FAILED_EXCEPTION");
//         return;
//       }

//       await new Promise(r => setTimeout(r, 2000));
//     }
//   }
// }




import {
  dequeue,
  removeById,
  incrementAttempt
} from "./utils/queue.js";

import { classifyEmailWithGPT } from "./gpt/classify.js";
import { createH8Ticket } from "./h8.js";
import {
  tagMessage,
  replyToMessage,
  sendNewMail
} from "./outlook.js";

import { logHistory } from "./utils/historyLogger.js";
import { getTestCircuitId } from "./utils/testCircuitManager.js";

import {
  ticketSuccessTemplate,
  ticketFailureTemplate
} from "./utils/emailTemplates.js";

import {
  ackSuccessTemplate
} from "./utils/clientAckTemplates.js";

import { withRetry } from "./utils/retry.js";

const MAX_CONCURRENT =
  parseInt(process.env.MAX_CONCURRENT_WORKERS || "5");

let active = 0;
let running = false;

export function startWorker() {
  if (running) return;
  running = true;

  console.log(`🧵 Worker started with concurrency: ${MAX_CONCURRENT}`);
  setInterval(processQueue, 500);
}

async function processQueue() {
  if (active >= MAX_CONCURRENT) return;

  const job = dequeue();
  if (!job) return;

  active++;

  handleJob(job)
    .catch(err => console.error("Unhandled worker error:", err))
    .finally(() => {
      active--;
    });
}

// async function handleJob(job) {
//   try {
//     console.log(`🔵 Processing: ${job.subject}`);

//     // 1️⃣ GPT Classification (validated inside classify.js)
//     const result = await classifyEmailWithGPT({
//       subject: job.subject,
//       body: job.bodyText,
//       from: job.from?.emailAddress?.address
//     });

//     // 2️⃣ Not an issue
//     if (!result.isIssue) {
//       await tagMessage(job.id, "H8-OTHER");
//       await logHistory(job, result, "NOT_ISSUE");
//       removeById(job.id);
//       return;
//     }

//     if (result.isIssue && !result.circuitId) {
//       await tagMessage(job.id, "H8-MANUAL");
//       await logHistory(job, result, "NO_CIRCUIT");
//       removeById(job.id);
//       return;
//     }

//     // 3️⃣ TEST MODE Circuit Override
//     if (process.env.APP_MODE === "TEST") {
//       result.circuitId = getTestCircuitId();
//       console.log("🧪 TEST MODE - Circuit overridden:", result.circuitId);
//     }

//     // 4️⃣ Ticket Creation (with retry)
//     const ticketId = await withRetry(
//       () =>
//         createH8Ticket({
//           ...result,
//           originalEmailBody: job.bodyText
//         }),
//       {
//         retries: 3,
//         delayMs: 5000,
//         onRetry: (err, attempt) => {
//           console.log(`⚠ Retry ${attempt}`, err.message);
//           incrementAttempt(job.id);
//         }
//       }
//     );

//     console.log("✅ Ticket created:", ticketId);

//     // ====================================================
//     // 🔔 INTERNAL SUCCESS NOTIFICATION (ALWAYS)
//     // ====================================================
//     const internalTemplate = ticketSuccessTemplate({
//       ticketId,
//       circuitId: result.circuitId
//     });

//     await sendNewMail({
//       to: process.env.SUCCESS_NOTIFY,
//       subject: internalTemplate.subject,
//       html: internalTemplate.html
//     });

//     // ====================================================
//     // 📧 CLIENT ACK
//     // ====================================================

//     const clientTemplate = ackSuccessTemplate({
//       ticketId,
//       circuitId: result.circuitId,
//       bookedAt: new Date().toLocaleString()
//     });

//     if (process.env.APP_MODE === "PROD") {
//       // Reply in same thread
//       await replyToMessage(job.id, clientTemplate.html);
//     } else {
//       // TEST → send to static test email (new mail)
//       await sendNewMail({
//         to: process.env.TEST_REPLY_EMAIL,
//         subject: clientTemplate.subject,
//         html: clientTemplate.html
//       });
//     }

//     // 5️⃣ Log success
//     await logHistory(job, result, "SUCCESS", ticketId);

//     // 6️⃣ Tag processed
//     await tagMessage(job.id, "H8-PROCESSED");

//     // 7️⃣ Remove from queue
//     removeById(job.id);

//   } catch (err) {

//     console.error("❌ Ticket creation failed:", err.message);

//     // ====================================================
//     // 🔔 INTERNAL FAILURE NOTIFICATION (ALWAYS)
//     // ====================================================
//     const failureTemplate = ticketFailureTemplate({
//       circuitId: "UNKNOWN",
//       error: err.message
//     });

//     await sendNewMail({
//       to: process.env.FAILURE_NOTIFY,
//       subject: failureTemplate.subject,
//       html: failureTemplate.html
//     });

//     await tagMessage(job.id, "H8-FAILED");
//     await logHistory(job, null, "FAILED_EXCEPTION");

//     removeById(job.id);
//   }
// }


async function handleJob(job) {
  try {
    console.log("=================================================");
    console.log("🔵 Processing:", job.subject);

    const result = await classifyEmailWithGPT({
      subject: job.subject,
      body: job.bodyText,
      from: job.from?.emailAddress?.address
    });

    console.log("🧠 GPT RESULT:", JSON.stringify(result, null, 2));

    // ==========================
    // 🟡 NOT ISSUE
    // ==========================
    if (!result.isIssue) {
      await tagMessage(job.id, "H8-OTHER");
      await logHistory(job, result, "NOT_ISSUE");
      removeById(job.id);
      return;
    }

    // ==========================
    // 🟠 MANUAL REVIEW
    // ==========================
    if (!result.circuitId) {

      const manualTemplate = ticketFailureTemplate({
        circuitId: "UNKNOWN",
        error: "Issue detected but circuit ID missing."
      });

      await sendNewMail({
        to: process.env.FAILURE_NOTIFY,
        subject: manualTemplate.subject,
        html: manualTemplate.html
      });

      await tagMessage(job.id, "H8-MANUAL");
      await logHistory(job, result, "NO_CIRCUIT");
      removeById(job.id);
      return;
    }

    // ==========================
    // 🧪 TEST MODE override
    // ==========================
    if (process.env.APP_MODE === "TEST") {
      result.circuitId = getTestCircuitId();
    }

    // ==========================
    // 🎫 CREATE REAL TICKET
    // ==========================
    const ticketId = await withRetry(
      () =>
        createH8Ticket({
          ...result,
          originalEmailBody: job.bodyText
        }),
      {
        retries: 3,
        delayMs: 5000,
        onRetry: (err, attempt) => {
          console.log(`⚠ Retry ${attempt}`, err.message);
          incrementAttempt(job.id);
        }
      }
    );

    console.log("✅ Ticket created:", ticketId);

    // ==========================
    // 🔔 INTERNAL SUCCESS (ALWAYS)
    // ==========================
    const successTemplate = ticketSuccessTemplate({
      ticketId,
      circuitId: result.circuitId
    });

    await sendNewMail({
      to: process.env.SUCCESS_NOTIFY,
      subject: successTemplate.subject,
      html: successTemplate.html
    });

    // ==========================
    // 📧 CLIENT ACK (ONLY PROD)
    // ==========================
    if (process.env.APP_MODE === "PROD") {
      const clientTemplate = ackSuccessTemplate({
        ticketId,
        circuitId: result.circuitId,
        bookedAt: new Date().toLocaleString()
      });

      await replyToMessage(job.id, clientTemplate.html);
    }

    // ==========================
    // 🧾 LOG
    // ==========================
    await logHistory(job, result, "SUCCESS", ticketId);
    await tagMessage(job.id, "H8-PROCESSED");
    removeById(job.id);

    // ==========================
    // 📊 TEST MODE SUMMARY (PER TICKET)
    // ==========================
    if (process.env.APP_MODE === "TEST") {
      const { generateTodaySummary } = await import("./utils/summaryGenerator.js");
      const summary = generateTodaySummary();

      if (summary) {
        await sendNewMail({
          to: process.env.DAILY_SUMMARY,
          subject: `🧪 TEST SUMMARY - ${summary.date}`,
          html: `<pre>${JSON.stringify(summary, null, 2)}</pre>`
        });
      }
    }

  } catch (err) {

    console.error("❌ Worker failed:", err.message);

    const failureTemplate = ticketFailureTemplate({
      circuitId: "UNKNOWN",
      error: err.message
    });

    await sendNewMail({
      to: process.env.FAILURE_NOTIFY,
      subject: failureTemplate.subject,
      html: failureTemplate.html
    });

    await tagMessage(job.id, "H8-FAILED");
    await logHistory(job, null, "FAILED_EXCEPTION");
    removeById(job.id);
  }
}

