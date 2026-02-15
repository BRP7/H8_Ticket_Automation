// import {
//   dequeue,
//   removeById,
//   incrementAttempt
// } from "./utils/queue.js";

// import { classifyEmailWithGPT } from "./gpt/classify.js";
// import { createH8Ticket } from "./h8.js";

// import {
//   tagMessage,
//   replyToMessage,
//   createDraftReply,
//   sendNewMail
// } from "./outlook.js";

// import { logHistory } from "./utils/historyLogger.js";
// import { getTestCircuitId } from "./utils/testCircuitManager.js";

// import {
//   ticketFailureTemplate,
//   manualReviewTemplate
// } from "./utils/emailTemplates.js";

// import { ackSuccessTemplate } from "./utils/clientAckTemplates.js";
// import { withRetry } from "./utils/retry.js";
// import { writeLog } from "./utils/logger.js";

// /* =====================================================
//    🔥 DYNAMIC CONCURRENCY CONTROLLER
// ===================================================== */

// const MAX_WORKERS = parseInt(process.env.MAX_CONCURRENT_WORKERS || "3");
// const MIN_WORKERS = 1;

// let dynamicConcurrency = MAX_WORKERS;
// let networkFailures = 0;

// /* ===================================================== */

// const TAGS = {
//   PROCESSED: "H8-PROCESSED",
//   OTHER: "H8-OTHER",
//   MANUAL: "H8-MANUAL",
//   FAILED: "H8-FAILED",
//   DUPLICATE: "H8-DUPLICATE"
// };

// let active = 0;
// let running = false;
// let consecutiveFailures = 0;
// const MAX_FAILURES = 5;

// /* ===================================================== */

// export function startWorker() {
//   if (running) return;
//   running = true;

//   console.log(`🧵 Worker started with max concurrency: ${MAX_WORKERS}`);
//   setInterval(processQueue, 3000);
// }

// async function processQueue() {
//   if (active >= dynamicConcurrency) return;

//   const job = dequeue();
//   if (!job) return;

//   active++;

//   handleJob(job)
//     .catch(err => console.error("Unhandled worker error:", err))
//     .finally(() => {
//       active--;
//     });
// }

// /* ===================================================== */

// async function handleJob(job) {
//   const clientEmail = job.from?.emailAddress?.address || "unknown";

//   // try {
//   //   console.log("=================================================");
//   //   console.log("🚀 STARTING JOB:", job.id);
//   //   console.log("🔵 Processing:", job.subject);

// const safeSubject = job.subject || "";
// const safeBody = job.bodyText || "";

// const result = await classifyEmailWithGPT({
//   subject: safeSubject,
//   body: safeBody,
//   from: clientEmail
// });

// console.log('result',result);
// console.log('body',safeBody);
// console.log('sub',safeSubject);

//     // console.log("CLEAN BODY:\n", job.bodyText);

//     // console.log("GPT RESULT:", JSON.stringify(result, null, 2));


//     if (!result.isIssue) {
//       // await tagMessage(job.id, TAGS.OTHER);
//       await logHistory(job, result, "NOT_ISSUE");
//       removeById(job.id);
//       return;
//     }

//     if (!result.subSubCategory) {
//       // await tagMessage(job.id, TAGS.OTHER);
//       removeById(job.id);
//       return;
//     }
//     /* ================= MANUAL REVIEW ================= */

//     // if (result.manualReview) {
//     //   console.log('result',result);
//     //   writeLog({
//     //     type: "MANUAL_REVIEW",
//     //     subject: job.subject,
//     //     circuitId: result.circuitId,
//     //     subSubCategory: result.subSubCategory,
//     //     confidence: result.confidence
//     //   });

//     //   await tagMessage(job.id, TAGS.MANUAL);
//     //   await logHistory(job, result, "MANUAL_REVIEW");

//     //   const reason = !result.circuitId
//     //     ? "Circuit ID missing in email."
//     //     : "Ambiguous classification requiring validation.";

//     //   const mail = manualReviewTemplate({
//     //     subject: job.subject,
//     //     from: clientEmail,
//     //     circuitId: result.circuitId,
//     //     subSubCategory: result.subSubCategory,
//     //     confidence: result.confidence,
//     //     reason
//     //   });

//     //   await sendNewMail({
//     //     to: process.env.FAILURE_NOTIFY,
//     //     subject: mail.subject,
//     //     html: mail.html
//     //   });

//     //   removeById(job.id);
//     //   return;
//     // }

//     writeLog({
//       level: "debug",
//       type: "GPT_INPUT",
//       messageId: job.id,
//       subject: job.subject,
//       body: job.bodyText
//     });

//     writeLog({
//       level: "debug",
//       type: "GPT_RESULT",
//       messageId: job.id,
//       result
//     });


// //     /* ================= TEST MODE ================= */

// //     if (process.env.APP_MODE === "TEST") {
// //       console.log("real extracted circuit id", result.circuitId);
// //       result.circuitId = getTestCircuitId();
// //       console.log("test circuit id", result.circuitId);
// //     }

// //     /* ================= CREATE TICKET ================= */
// //     let ticketId;
// //      if (process.env.APP_MODE === "TEST") { 
// //       ticketId = "PRECHECK-" + Date.now(); 
// //       console.log("🧪 TEST MODE – FAKE TICKET:", ticketId); 
// //     } else {
// //     // const ticketId = await withRetry(
// //       ticketId = await withRetry(
// //       () =>
// //         createH8Ticket({
// //           ...result,
// //           originalEmailBody: job.bodyText,
// //           subject: job.subject,
// //           from: clientEmail
// //         }),
// //       {
// //         retries: 3,
// //         delayMs: 5000,
// //         onRetry: (err, attempt) => {
// //           if (err.code === "DUPLICATE_CASE") throw err;
// //           console.log(`🔁 Retry ${attempt}:`, err.message);
// //           incrementAttempt(job.id);
// //         }
// //       }
// //     );
// //   }
// //     /* ================= SUCCESS LOG ================= */

// //     writeLog({
// //       type: "TICKET_CREATED",
// //       subject: job.subject,
// //       ticketId,
// //       circuitId: result.circuitId,
// //       subSubCategory: result.subSubCategory,
// //       confidence: result.confidence
// //     });

// //     await tagMessage(job.id, TAGS.PROCESSED);

// //     const ack = ackSuccessTemplate({
// //       ticketId,
// //       circuitId: result.circuitId,
// //       bookedAt: new Date().toLocaleString("en-IN", {
// //         timeZone: "Asia/Kolkata"
// //       })
// //     });

// //     if (process.env.APP_MODE === "TEST") {
// //       // await replyToMessage(job.id, ack.html);
// //       await createDraftReply(job.id, ack.html);

// //     } else {
// //       await sendNewMail({
// //         to: process.env.TEST_REPLY_EMAIL,
// //         subject: ack.subject,
// //         html: ack.html
// //       });
// //     }

// //     /* ================= AUTO SCALE UP ================= */

// //     networkFailures = 0;

// //     if (dynamicConcurrency < MAX_WORKERS) {
// //       dynamicConcurrency++;
// //       console.log(`✅ Stable. Increasing workers to ${dynamicConcurrency}`);
// //     }

// //     consecutiveFailures = 0;
// //     removeById(job.id);

// //   } catch (err) {

// //     if (err.code === "DUPLICATE_CASE") {
// //       await tagMessage(job.id, TAGS.DUPLICATE);
// //       removeById(job.id);
// //       return;
// //     }

// //     console.error("❌ JOB FAILED:", err.message);

// //     writeLog({
// //       type: "ERROR",
// //       subject: job.subject,
// //       error: err.message
// //     });

// //     await tagMessage(job.id, TAGS.FAILED);

// //     const failureTemplate = ticketFailureTemplate({
// //       circuitId: "UNKNOWN",
// //       error: err.message,
// //       subject: job.subject
// //     });

// //     await sendNewMail({
// //       to: process.env.FAILURE_NOTIFY,
// //       subject: failureTemplate.subject,
// //       html: failureTemplate.html
// //     });

// //     /* ================= AUTO SCALE DOWN ================= */

// //     if (
// //       err.message.includes("fetch failed") ||
// //       err.message.includes("Connection error") ||
// //       err.code === "TypeError"
// //     ) {
// //       networkFailures++;

// //       if (networkFailures >= 3 && dynamicConcurrency > MIN_WORKERS) {
// //         dynamicConcurrency--;
// //         networkFailures = 0;

// //         console.log(
// //           `⚠ High network errors. Reducing workers to ${dynamicConcurrency}`
// //         );
// //       }
// //     }

// //     consecutiveFailures++;

// //     if (consecutiveFailures >= MAX_FAILURES) {
// //       console.error("🚨 CIRCUIT BREAKER TRIGGERED");
// //       process.exit(1);
// //     }

// //     removeById(job.id);
// //   }
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
  createDraftReply
} from "./outlook.js";

import { logHistory } from "./utils/historyLogger.js";
import { withRetry } from "./utils/retry.js";
import { writeLog } from "./utils/logger.js";

import {
  ticketFailureTemplate
} from "./utils/emailTemplates.js";

import { ackSuccessTemplate } from "./utils/clientAckTemplates.js";

/* =====================================================
   ENV CONFIG
===================================================== */

const MAX_WORKERS = parseInt(process.env.MAX_CONCURRENT_WORKERS || "3");
const MIN_WORKERS = 1;

const APP_MODE = process.env.APP_MODE || "TEST"; // TEST | PROD
const AUTO_SEND = process.env.AUTO_SEND_REPLY === "true";
const WORKER_ENABLED = process.env.WORKER_ENABLED !== "false";

/* =====================================================
   TAGS
===================================================== */

const TAGS = {
  PROCESSED: "H8-PROCESSED",
  OTHER: "H8-OTHER",
  FAILED: "H8-FAILED",
  DUPLICATE: "H8-DUPLICATE"
};

/* =====================================================
   WORKER STATE
===================================================== */

let active = 0;
let running = false;

let dynamicConcurrency = MAX_WORKERS;
let networkFailures = 0;
let consecutiveFailures = 0;

const MAX_FAILURES = 5;

/* =====================================================
   START WORKER
===================================================== */

export function startWorker() {
  if (!WORKER_ENABLED) {
    writeLog({
      level: "warn",
      type: "WORKER_DISABLED",
      message: "Worker disabled via env flag."
    });
    return;
  }

  if (running) return;
  running = true;

  writeLog({
    level: "info",
    type: "WORKER_STARTED",
    concurrency: MAX_WORKERS,
    mode: APP_MODE,
    autoSend: AUTO_SEND
  });

  setInterval(processQueue, 3000);
}

/* =====================================================
   QUEUE PROCESSOR
===================================================== */

async function processQueue() {
  if (active >= dynamicConcurrency) return;

  const job = dequeue();
  if (!job) return;

  active++;

  handleJob(job)
    .catch(err => {
      writeLog({
        level: "error",
        type: "UNHANDLED_WORKER_ERROR",
        error: err.message
      });
    })
    .finally(() => {
      active--;
    });
}

/* =====================================================
   MAIN JOB HANDLER
===================================================== */

async function handleJob(job) {
  const clientEmail = job.from?.emailAddress?.address || "unknown";

  try {
    const safeSubject = job.subject || "";
    const safeBody = job.bodyText || "";

    /* ================= GPT CLASSIFICATION ================= */

    const result = await classifyEmailWithGPT({
      subject: safeSubject,
      body: safeBody,
      from: clientEmail
    });

    writeLog({
      level: "debug",
      type: "GPT_RESULT",
      messageId: job.id,
      result
    });

    /* ================= NOT ISSUE ================= */

    if (!result.isIssue || !result.subSubCategory) {
      await tagMessage(job.id, TAGS.OTHER);
      await logHistory(job, result, "NOT_ISSUE");
      removeById(job.id);
      return;
    }

    /* ================= CREATE TICKET ================= */

    let ticketId;

    if (APP_MODE === "TEST") {
      ticketId = "PRECHECK-" + Date.now();

      writeLog({
        level: "info",
        type: "TEST_TICKET_CREATED",
        ticketId,
        circuitId: result.circuitId
      });
    } else {
      ticketId = await withRetry(
        () =>
          createH8Ticket({
            ...result,
            originalEmailBody: job.bodyText,
            subject: job.subject,
            from: clientEmail
          }),
        {
          retries: 3,
          delayMs: 5000,
          onRetry: (err, attempt) => {
            writeLog({
              level: "warn",
              type: "TICKET_RETRY",
              attempt,
              error: err.message
            });
            incrementAttempt(job.id);
          }
        }
      );
    }

    /* ================= SUCCESS LOG ================= */

    writeLog({
      level: "info",
      type: "TICKET_CREATED",
      ticketId,
      circuitId: result.circuitId,
      subSubCategory: result.subSubCategory,
      confidence: result.confidence
    });

    await tagMessage(job.id, TAGS.PROCESSED);

    /* ================= ACK RESPONSE ================= */

    const ack = ackSuccessTemplate({
      ticketId,
      circuitId: result.circuitId,
      bookedAt: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata"
      })
    });

    if (AUTO_SEND) {
      await replyToMessage(job.id, ack.html);

      writeLog({
        level: "info",
        type: "AUTO_REPLY_SENT",
        ticketId
      });
    } else {
      await createDraftReply(job.id, ack.html);

      writeLog({
        level: "info",
        type: "DRAFT_CREATED",
        ticketId
      });
    }

    /* ================= AUTO SCALE UP ================= */

    networkFailures = 0;
    consecutiveFailures = 0;

    if (dynamicConcurrency < MAX_WORKERS) {
      dynamicConcurrency++;
    }

    await logHistory(job, result, "TICKET_CREATED");
    removeById(job.id);

  } catch (err) {

    /* ================= DUPLICATE ================= */

    if (err.code === "DUPLICATE_CASE") {
      await tagMessage(job.id, TAGS.DUPLICATE);
      removeById(job.id);
      return;
    }

    writeLog({
      level: "error",
      type: "JOB_FAILED",
      error: err.message,
      subject: job.subject
    });

    await tagMessage(job.id, TAGS.FAILED);

    /* ================= FAILURE EMAIL ================= */

    const failureTemplate = ticketFailureTemplate({
      circuitId: "UNKNOWN",
      error: err.message,
      subject: job.subject
    });

    if (process.env.FAILURE_NOTIFY) {
      await createDraftReply(job.id, failureTemplate.html);
    }

    /* ================= AUTO SCALE DOWN ================= */

    if (
      err.message.includes("fetch failed") ||
      err.message.includes("Connection error") ||
      err.code === "TypeError"
    ) {
      networkFailures++;

      if (networkFailures >= 3 && dynamicConcurrency > MIN_WORKERS) {
        dynamicConcurrency--;
        networkFailures = 0;

        writeLog({
          level: "warn",
          type: "SCALE_DOWN",
          newConcurrency: dynamicConcurrency
        });
      }
    }

    consecutiveFailures++;

    if (consecutiveFailures >= MAX_FAILURES) {
      writeLog({
        level: "fatal",
        type: "CIRCUIT_BREAKER_TRIGGERED"
      });
      process.exit(1);
    }

    removeById(job.id);
  }
}
